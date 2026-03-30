import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './orders/entities/order.entity';
import { OrderStage } from './orders/entities/order-stage.entity';
import { Employee } from './employees/entities/employee.entity';
import { Repository } from 'typeorm';
import { ALL_STAGES } from './common/seed-data';

// ================================================================
//  ORDER RESET & RESEED SCRIPT
//  ✅ Keeps: Employees, Stage Definitions, App Settings
//  🗑️  Clears: Orders, Order Stages
//  ➕  Adds: 35 fresh orders linked to EXISTING employees
//  Run: npm run seed:orders
// ================================================================

const ITEM_CATALOG = [
  { name: 'Jacket', price: 150 },
  { name: 'Hoodie', price: 120 },
  { name: 'T shirt', price: 50 },
  { name: 'Sweat shirt', price: 90 },
  { name: 'Pants', price: 100 },
];

const ARAB_NAMES = [
  'Ahmed Mohamed', 'Mahmoud Ali', 'Mustafa Hassan', 'Ibrahim Said',
  'Omar Farouk', 'Zaid Khalid', 'Youssef Ibrahim', 'Hamza Bakr',
  'Kareem Adel', 'Adel Fawzy', 'Hany Shaker', 'Amr Diab',
  'Tamer Hosny', 'Mohamed Ramadan', 'Sherif Mounir',
];

const CITIES = ['Cairo', 'Giza', 'Alexandria', 'Mansoura', 'Suez', 'Tanta', 'Asyut'];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makePriceDetails() {
  const count = Math.floor(Math.random() * 3) + 1;
  const used: string[] = [];
  const items: any[] = [];
  let total = 0;
  let pieces = 0;

  for (let i = 0; i < count; i++) {
    const available = ITEM_CATALOG.filter((t) => !used.includes(t.name));
    if (available.length === 0) break;
    const template = rand(available);
    used.push(template.name);
    const qty = Math.floor(Math.random() * 20) + 5;
    items.push({
      item_id: template.name.toLowerCase().replace(/\s/g, '_'),
      item_name: template.name,
      price: template.price,
      quantity: qty,
    });
    total += template.price * qty;
    pieces += qty;
  }
  return { items, total, pieces };
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const orderRepo    = app.get<Repository<Order>>(getRepositoryToken(Order));
  const stageRepo    = app.get<Repository<OrderStage>>(getRepositoryToken(OrderStage));
  const employeeRepo = app.get<Repository<Employee>>(getRepositoryToken(Employee));

  console.log('\n======================================');
  console.log('  ORDER RESET & RESEED');
  console.log('======================================\n');

  // ── STEP 1: CLEAR ORDERS AND STAGES ONLY ─────────────────────
  console.log('🧹 Step 1: Clearing orders and stages...');
  await stageRepo.createQueryBuilder().delete().execute();
  console.log('   ✓ OrderStages cleared');
  await orderRepo.createQueryBuilder().delete().execute();
  console.log('   ✓ Orders cleared');

  // ── STEP 2: FETCH EXISTING EMPLOYEES ─────────────────────────
  console.log('\n👥 Step 2: Loading existing employees...');
  const employees = await employeeRepo.find();
  if (employees.length === 0) {
    console.error('❌ No employees found! Run the main seed first: npm run seed');
    await app.close();
    process.exit(1);
  }
  console.log(`   ✓ Found ${employees.length} employees`);

  // ── STEP 3: CREATE 35 FRESH ORDERS ───────────────────────────
  console.log('\n📦 Step 3: Creating 35 fresh orders...');

  const stages = ALL_STAGES;
  const ordersToCreate: Order[] = [];

  for (let i = 1; i <= 35; i++) {
    const order = new Order();

    // Unique order number: senXXXYYYY
    order.order_number = `sen${String(i).padStart(3, '0')}${Math.floor(1000 + Math.random() * 9000)}`;
    order.customer_name = `${rand(ARAB_NAMES)} ${i % 2 === 0 ? 'Group' : 'Store'}`;
    order.phone = `01${Math.floor(100000000 + Math.random() * 900000000)}`;
    order.address = `${Math.floor(Math.random() * 200) + 1} Street, ${rand(CITIES)}, Egypt`;

    // Price details (items + totals)
    const { items, total, pieces } = makePriceDetails();
    order.price_details = items;
    order.total_amount = total;
    order.piece_count = pieces;

    // Production flags — always start false (set manually via UI)
    order.is_design_completed = false;
    order.is_cutting_completed = false;

    // Spread orders across all workflow stages
    let stageIndex: number;
    if (i <= 10) {
      stageIndex = Math.floor(Math.random() * 3);       // New Batches → Approved Files
    } else if (i <= 25) {
      stageIndex = 3 + Math.floor(Math.random() * 5);   // Design → EMB Done
    } else {
      stageIndex = 8 + Math.floor(Math.random() * 5);   // Stitching → Shipped
    }
    stageIndex = Math.min(stageIndex, stages.length - 1);
    const currentStage = stages[stageIndex];
    order.current_stage = currentStage;

    // Status
    order.status = stageIndex === stages.length - 1 ? 'Completed' : 'Active';

    // Assign employees 
    const salesEmp = rand(employees);
    const filingEmp = rand(employees);
    order.sales_team = salesEmp.name;
    order.filing_team_name = filingEmp.name;

    // Deposit & print
    order.deposit = Math.random() > 0.5 ? String(Math.floor(total / 2)) : 'Full';
    order.inner_print = Math.random() > 0.7 ? 'Yes' : 'No';

    // Delivery date: 5-15 days from now
    const days = 5 + Math.floor(Math.random() * 10);
    order.estimated_delivery = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Build realistic stage history up to current stage
    const orderStages: OrderStage[] = [];
    for (let s = 0; s <= stageIndex; s++) {
      const os = new OrderStage();
      os.stage_name = stages[s];
      os.status = s < stageIndex ? 'Completed' : 'In Progress';
      os.employee_id = rand(employees).id;
      os.notes = s === 0
        ? 'System: Order created and added to queue.'
        : `System: Moved to ${stages[s]}.`;
      orderStages.push(os);
    }

    order.stages = orderStages;
    ordersToCreate.push(order);

    console.log(`   [${String(i).padStart(2, '0')}/35] ${order.order_number} → "${currentStage}" | ${pieces} PCS | ${total} AED`);
  }

  await orderRepo.save(ordersToCreate);

  // ── DONE ──────────────────────────────────────────────────────
  console.log('\n======================================');
  console.log('  ✅ DONE!');
  console.log('======================================');
  console.log(`  Orders created : 35`);
  console.log(`  Employees used : ${employees.length} (existing)`);
  console.log('  Employees, Stages, Settings: untouched ✓');
  console.log('======================================\n');

  await app.close();
}

bootstrap().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message);
  process.exit(1);
});
