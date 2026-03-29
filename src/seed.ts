import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from './employees/entities/employee.entity';
import { Order } from './orders/entities/order.entity';
import { OrderStage } from './orders/entities/order-stage.entity';
import { AppSetting } from './settings/entities/app-setting.entity';
import { StageDefinition } from './settings/entities/stage-definition.entity';
import { CORE_ACCOUNTS, DEFAULT_SETTINGS, ALL_STAGES, DEPT_MAPPING } from './common/seed-data';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const employeeRepo = app.get(getRepositoryToken(Employee));
  const orderRepo = app.get(getRepositoryToken(Order));
  const stageRepo = app.get(getRepositoryToken(OrderStage));
  const settingRepo = app.get(getRepositoryToken(AppSetting));
  const stageDefRepo = app.get(getRepositoryToken(StageDefinition));

  console.log('Starting comprehensive database seed (Refactored)...');

  // 1. Seed App Settings
  const settingsCount = await settingRepo.count();
  if (settingsCount === 0) {
    console.log('Seeding App Settings...');
    await settingRepo.save(settingRepo.create(DEFAULT_SETTINGS));
  }

  // 2. Seed Stage Definitions
  const stageDefCount = await stageDefRepo.count();
  if (stageDefCount === 0) {
    console.log('Seeding Stage Definitions...');
    const stageDefs = ALL_STAGES.map((name, index) => ({
      name,
      department: DEPT_MAPPING[name] || 'Other',
      order_index: index,
      is_active: true
    }));
    await stageDefRepo.save(stageDefRepo.create(stageDefs));
  }

  // 3. Seed Core Accounts
  console.log('Seeding Core Accounts...');
  for (const account of CORE_ACCOUNTS) {
    const existing = await employeeRepo.findOne({ where: { email: account.email } });
    if (!existing) {
      const hashed = await bcrypt.hash(account.password, 10);
      await employeeRepo.save(employeeRepo.create({
        ...account,
        password: hashed
      }));
    }
  }

  // 4. Seed Dummy Orders for Pagination/UI testing
  const orderCount = await orderRepo.count();
  if (orderCount < 10) {
    console.log('Seeding 25 Orders for testing...');
    for (let i = 1; i <= 25; i++) {
      const orderNumber = `ORD-${2024000 + i}`;
      const existing = await orderRepo.findOne({ where: { order_number: orderNumber } });
      if (existing) continue;

      const order = orderRepo.create({
        order_number: orderNumber,
        customer_name: `Test Customer ${i}`,
        phone: `010000000${i.toString().padStart(2, '0')}`,
        address: `Test Address ${i}`,
        total_amount: 1000 + i * 100,
        status: 'Pending',
        current_stage: 'New Batches',
      });
      const savedOrder = await orderRepo.save(order);

      const stage = stageRepo.create({
        order_id: savedOrder.id,
        stage_name: 'New Batches',
        status: 'Pending',
        notes: 'Initial seed',
      });
      await stageRepo.save(stage);
    }
  }

  // 5. Seed Additional Staff for Pagination
  const totalEmployees = await employeeRepo.count();
  if (totalEmployees < 10) {
    console.log('Seeding 15 Additional Staff for testing...');
    for (let i = 1; i <= 15; i++) {
      const email = `staff${i}@factory.com`;
      const existing = await employeeRepo.findOne({ where: { email } });
      if (existing) continue;

      const hashedPwd = await bcrypt.hash('password123', 10);
      await employeeRepo.save({
        name: `Factory Staff ${i}`,
        department: i % 2 === 0 ? 'Production' : 'QA Dept',
        role: 'employee',
        email: email,
        password: hashedPwd,
      });
    }
  }

  // 6. Backfill historical OrderStage records with employee_ids
  const stagesWithoutEmployee = await stageRepo.find({ where: { employee_id: null } });
  if (stagesWithoutEmployee.length > 0) {
    console.log(`Backfilling ${stagesWithoutEmployee.length} historical stages with employee IDs...`);
    const allStaff = await employeeRepo.find();
    if (allStaff.length > 0) {
      for (const stage of stagesWithoutEmployee) {
        const randomStaff = allStaff[Math.floor(Math.random() * allStaff.length)];
        stage.employee_id = randomStaff.id;
      }
      await stageRepo.save(stagesWithoutEmployee);
    }
  }

  console.log('Comprehensive database seeding complete!');
  await app.close();
}

bootstrap();
