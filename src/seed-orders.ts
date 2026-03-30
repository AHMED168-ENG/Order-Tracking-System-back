import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './orders/entities/order.entity';
import { OrderStage } from './orders/entities/order-stage.entity';
import { Employee } from './employees/entities/employee.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const orderRepo = app.get<Repository<Order>>(getRepositoryToken(Order));
  const stageRepo = app.get<Repository<OrderStage>>(getRepositoryToken(OrderStage));
  const employeeRepo = app.get<Repository<Employee>>(getRepositoryToken(Employee));

  console.log('--- Order Seeding Started ---');

  // 1. Clear existing data
  console.log('Cleaning existing orders and stages...');
  await stageRepo.createQueryBuilder().delete().execute();
  await orderRepo.createQueryBuilder().delete().execute();

  // 2. Fetch all employees
  const employees = await employeeRepo.find();
  if (employees.length === 0) {
    console.error('Error: No employees found in the system. Please seed employees first.');
    await app.close();
    process.exit(1);
  }

  const firstStage = 'New Batches';
  const orders: Order[] = [];

  const arabNames = [
    'Ahmed Mohamed', 'Mahmoud Ali', 'Mustafa Hassan', 'Ibrahim Said', 'Omar Farouk',
    'Zaid Khalid', 'Youssef Ibrahim', 'Hamza Bakr', 'Kareem Adel', 'Adel Fawzy',
    'Hany Shaker', 'Amr Diab', 'Tamer Hosny', 'Mohamed Ramadan', 'Sherif Mounir',
    'Nour El-Sherif', 'Adel Emam', 'Ahmed Helmy', 'Karim Abdel Aziz', 'Ahmed El Sakka'
  ];

  const cities = ['Cairo', 'Giza', 'Alexandria', 'Mansoura', 'Suez', 'Port Said', 'Tanta', 'Asyut'];

  console.log('Generating 30 fresh orders...');

  for (let i = 1; i <= 30; i++) {
    const order = new Order();
    // Unique order number: sen-Series-Random (No hyphens)
    order.order_number = `sen${String(i).padStart(3, '0')}${Math.floor(1000 + Math.random() * 9000)}`;
    order.customer_name = arabNames[Math.floor(Math.random() * arabNames.length)] + ' ' + (i % 2 === 0 ? 'Group' : 'Store');
    order.phone = `01${Math.floor(100000000 + Math.random() * 900000000)}`;
    order.address = `${Math.floor(Math.random() * 100)} Street, ${cities[Math.floor(Math.random() * cities.length)]}, Egypt`;
    // NEW: Generate random price_details
    const itemTemplates = [
      { name: 'Jacket', price: 150 },
      { name: 'Pants', price: 100 },
      { name: 'T shirt', price: 50 },
      { name: 'Hoodie', price: 120 }
    ];
    
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
    const selectedItems = [];
    let calcTotalAmount = 0;
    let calcPieceCount = 0;
    
    for (let j = 0; j < numItems; j++) {
      const template = itemTemplates[Math.floor(Math.random() * itemTemplates.length)];
      const qty = Math.floor(Math.random() * 20) + 5; // 5-25 pieces
      selectedItems.push({
        item_id: template.name.toLowerCase().replace(' ', '_'),
        item_name: template.name,
        price: template.price,
        quantity: qty
      });
      calcTotalAmount += template.price * qty;
      calcPieceCount += qty;
    }

    order.price_details = selectedItems;
    order.total_amount = calcTotalAmount;
    order.piece_count = calcPieceCount;
    order.status = 'Active';
    order.current_stage = firstStage;
    
    // Link to staff from the system
    const salesEmp = employees[Math.floor(Math.random() * employees.length)];
    const filingEmp = employees[Math.floor(Math.random() * employees.length)];
    order.sales_team = salesEmp.name;
    order.filing_team_name = filingEmp.name;
    
    order.deposit = Math.random() > 0.5 ? String(Math.floor(calcTotalAmount / 2)) : 'Full';
    order.inner_print = Math.random() > 0.7 ? 'Yes' : 'No';
    order.estimated_delivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Initial stage record
    const stage = new OrderStage();
    stage.stage_name = firstStage;
    stage.status = 'In Progress';
    stage.notes = 'System: Seeded bulk order created via terminal.';
    stage.employee_id = filingEmp.id;
    
    order.stages = [stage];
    orders.push(order);
  }

  await orderRepo.save(orders);
  console.log('--- Seeding Completed Successfully! ---');
  console.log('Total Orders Generated: 30');
  
  await app.close();
}

bootstrap().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
