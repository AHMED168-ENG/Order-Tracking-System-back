import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from './employees/entities/employee.entity';
import { Order } from './orders/entities/order.entity';
import { OrderStage } from './orders/entities/order-stage.entity';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const employeeRepo = app.get(getRepositoryToken(Employee));
  const orderRepo = app.get(getRepositoryToken(Order));
  const stageRepo = app.get(getRepositoryToken(OrderStage));

  console.log('Starting exact TypeORM database seed...');

  // Seed Admin
  const adminEmail = 'admin@factory.com';
  const existingAdmin = await employeeRepo.findOne({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    console.log('Seeding Admin...');
    const hashedPwd = await bcrypt.hash('password123', 10);
    await employeeRepo.save({
      name: 'Admin User',
      department: 'Management',
      role: 'admin',
      email: adminEmail,
      password: hashedPwd,
    });
  }

  // Seed Accountant
  const acctEmail = 'accountant@factory.com';
  const existingAcct = await employeeRepo.findOne({
    where: { email: acctEmail },
  });
  if (!existingAcct) {
    console.log('Seeding Accountant...');
    const hashedPwd = await bcrypt.hash('password123', 10);
    await employeeRepo.save({
      name: 'Main Accountant',
      department: 'Finance',
      role: 'accountant',
      email: acctEmail,
      password: hashedPwd,
    });
  }

  // Seed Staff
  const staffEmail = 'staff@factory.com';
  const existingStaff = await employeeRepo.findOne({
    where: { email: staffEmail },
  });
  if (!existingStaff) {
    console.log('Seeding Staff...');
    const hashedPwd = await bcrypt.hash('password123', 10);
    await employeeRepo.save({
      name: 'Factory Worker',
      department: 'Production',
      role: 'employee',
      email: staffEmail,
      password: hashedPwd,
    });
  }

  // Seed Dummy Orders
  // We want to seed even if there are some orders, to ensure we have enough for pagination
  console.log('Seeding 25 Orders for Pagination Test...');
  for (let i = 1; i <= 25; i++) {
    const orderNumber = `ORD-${2024000 + i}`;
    const existing = await orderRepo.findOne({
      where: { order_number: orderNumber },
    });
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

  console.log('Seeding 15 Employees for Pagination Test...');
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

  // Backfill historical OrderStage records with employee_ids
  // The `stageRepo` is already defined at the top of the function.
  const stagesWithoutEmployee = await stageRepo.find({ where: { employee_id: null } });
  if (stagesWithoutEmployee.length > 0) {
    console.log(`Backfilling ${stagesWithoutEmployee.length} historical stages with employee IDs...`);
    const allStaff = await employeeRepo.find(); // Assuming all employees can be staff
    if (allStaff.length > 0) {
      for (const stage of stagesWithoutEmployee) {
        // Randomly assign to a staff member
        const randomStaff = allStaff[Math.floor(Math.random() * allStaff.length)];
        stage.employee_id = randomStaff.id;
      }
      await stageRepo.save(stagesWithoutEmployee);
      console.log('Backfill complete!');
    } else {
      console.log('No staff found to backfill employee IDs for stages.');
    }
  }


  console.log('Database exact seeding complete!');
  await app.close();
}

bootstrap();
