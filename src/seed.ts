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
  const existingAdmin = await employeeRepo.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    console.log('Seeding Admin...');
    const hashedPwd = await bcrypt.hash('admin123', 10);
    await employeeRepo.save({
      name: 'Admin User',
      department: 'Management',
      role: 'admin',
      email: adminEmail,
      password: hashedPwd,
    });
  }

  // Seed Staff
  const staffEmail = 'staff@factory.com';
  const existingStaff = await employeeRepo.findOne({ where: { email: staffEmail } });
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
  const orderCount = await orderRepo.count();
  if (orderCount === 0) {
    console.log('Seeding Orders...');
    
    // Calculate future date for delivery
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 10);

    const order1 = await orderRepo.save({
      order_number: 'ORD-001',
      customer_name: 'Acme Corp',
      status: 'In Progress',
      current_stage: 'Filing team',
      estimated_delivery: deliveryDate,
    });

    await stageRepo.save({
      order_id: order1.id,
      stage_name: 'New Batches',
      status: 'Completed',
      notes: 'Initial designs approved',
    });

    await stageRepo.save({
      order_id: order1.id,
      stage_name: 'Filing team',
      status: 'In Progress',
      notes: 'Fabric sent to cutting room',
    });

    const order2 = await orderRepo.save({
      order_number: 'ORD-002',
      customer_name: 'Global Styles',
      status: 'Pending',
      current_stage: 'New Batches',
      estimated_delivery: deliveryDate,
    });

    await stageRepo.save({
      order_id: order2.id,
      stage_name: 'New Batches',
      status: 'Pending',
      notes: 'Awaiting raw materials',
    });
  }

  console.log('Database exact seeding complete!');
  await app.close();
}

bootstrap();
