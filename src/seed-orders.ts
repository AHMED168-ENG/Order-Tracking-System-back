import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './orders/entities/order.entity';
import { OrderStage } from './orders/entities/order-stage.entity';
import { Employee } from './employees/entities/employee.entity';
import { StageDefinition } from './settings/entities/stage-definition.entity';
import { AppSetting } from './settings/entities/app-setting.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  ALL_STAGES,
  DEPT_MAPPING,
  DEFAULT_SETTINGS,
} from './common/seed-data';

// ================================================================
//  FULL DATABASE RESET & CLEAN SEED SCRIPT
//  Cleans ALL data and repopulates with fresh, consistent data
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
  'Nour El-Sherif', 'Ahmed Helmy', 'Karim Abdel Aziz',
];

const CITIES = [
  'Cairo', 'Giza', 'Alexandria', 'Mansoura',
  'Suez', 'Port Said', 'Tanta', 'Asyut',
];

// Core accounts that will always exist after seeding
const CORE_ACCOUNTS = [
  { name: 'Super Admin',       email: 'admin@factory.com',     password: 'password123', role: 'admin',     department: 'Management'   },
  { name: 'Main Accountant',   email: 'accountant@factory.com',password: 'password123', role: 'accountant',department: 'Finance'       },
  { name: 'Factory Supervisor',email: 'staff@factory.com',     password: 'password123', role: 'staff',     department: 'Production'    },
  { name: 'General Manager',   email: 'manager@factory.com',   password: 'password123', role: 'admin',     department: 'Management'    },
  { name: 'Ahmed Designer',    email: 'designer@factory.com',  password: 'password123', role: 'employee',  department: 'Factory Dept'  },
  { name: 'Sara QC',           email: 'qc@factory.com',        password: 'password123', role: 'employee',  department: 'QA Dept'       },
  { name: 'Khalid EMB',        email: 'emb@factory.com',       password: 'password123', role: 'employee',  department: 'Embroidery'    },
  { name: 'Fatma Planning',    email: 'planning@factory.com',  password: 'password123', role: 'employee',  department: 'Planning'      },
  { name: 'Sameh Cutter',      email: 'cutter@factory.com',    password: 'password123', role: 'employee',  department: 'Factory Dept'  },
  { name: 'Heba Logistics',    email: 'logistics@factory.com', password: 'password123', role: 'employee',  department: 'Logistics'     },
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makePhoneNumber(): string {
  return `01${Math.floor(100000000 + Math.random() * 900000000)}`;
}

function makePriceDetails() {
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 items
  const used: string[] = [];
  const items: any[] = [];
  let total = 0;
  let pieces = 0;

  for (let i = 0; i < count; i++) {
    const template = rand(ITEM_CATALOG.filter((t) => !used.includes(t.name)));
    if (!template) break;
    used.push(template.name);
    const qty = Math.floor(Math.random() * 20) + 5; // 5-25 pcs
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

  const orderRepo      = app.get<Repository<Order>>(getRepositoryToken(Order));
  const stageRepo      = app.get<Repository<OrderStage>>(getRepositoryToken(OrderStage));
  const employeeRepo   = app.get<Repository<Employee>>(getRepositoryToken(Employee));
  const stageDefRepo   = app.get<Repository<StageDefinition>>(getRepositoryToken(StageDefinition));
  const settingRepo    = app.get<Repository<AppSetting>>(getRepositoryToken(AppSetting));

  console.log('\n======================================');
  console.log('  FULL DATABASE RESET & RESEED');
  console.log('======================================\n');

  // ── STEP 1: CLEAN ALL DATA ──────────────────────────────────────
  console.log('🧹 Step 1: Cleaning all data...');
  await stageRepo.createQueryBuilder().delete().execute();
  console.log('   ✓ OrderStages cleared');
  await orderRepo.createQueryBuilder().delete().execute();
  console.log('   ✓ Orders cleared');
  await employeeRepo.createQueryBuilder().delete().execute();
  console.log('   ✓ Employees cleared');
  await stageDefRepo.createQueryBuilder().delete().execute();
  console.log('   ✓ Stage Definitions cleared');
  await settingRepo.createQueryBuilder().delete().execute();
  console.log('   ✓ App Settings cleared');

  // ── STEP 2: SEED APP SETTINGS ───────────────────────────────────
  console.log('\n⚙️  Step 2: Seeding app settings...');
  await settingRepo.save(settingRepo.create(DEFAULT_SETTINGS));
  console.log('   ✓ App settings created');

  // ── STEP 3: SEED STAGE DEFINITIONS ─────────────────────────────
  console.log('\n🏭 Step 3: Seeding stage definitions...');
  for (const [index, name] of ALL_STAGES.entries()) {
    await stageDefRepo.save(stageDefRepo.create({
      name,
      department: DEPT_MAPPING[name] || 'Other',
      order_index: index,
      is_active: true,
    }));
  }
  console.log(`   ✓ ${ALL_STAGES.length} stages created`);

  // ── STEP 4: SEED EMPLOYEES ──────────────────────────────────────
  console.log('\n👥 Step 4: Seeding employees...');
  const createdEmployees: Employee[] = [];
  for (const account of CORE_ACCOUNTS) {
    const hashed = await bcrypt.hash(account.password, 10);
    const emp = await employeeRepo.save(
      employeeRepo.create({ ...account, password: hashed }),
    );
    createdEmployees.push(emp);
    console.log(`   ✓ ${emp.name} (${emp.role} / ${emp.department})`);
  }

  // ── STEP 5: SEED 35 ORDERS ─────────────────────────────────────
  console.log('\n📦 Step 5: Seeding 35 fresh orders...');

  const stages = ALL_STAGES;
  const ordersToCreate: Order[] = [];

  for (let i = 1; i <= 35; i++) {
    const order = new Order();

    // Unique order number format: senXXXYYYY
    order.order_number = `sen${String(i).padStart(3, '0')}${Math.floor(1000 + Math.random() * 9000)}`;
    order.customer_name = `${rand(ARAB_NAMES)} ${i % 2 === 0 ? 'Group' : 'Store'}`;
    order.phone = makePhoneNumber();
    order.address = `${Math.floor(Math.random() * 200) + 1} Street, ${rand(CITIES)}, Egypt`;

    // Price details
    const { items, total, pieces } = makePriceDetails();
    order.price_details = items;
    order.total_amount = total;
    order.piece_count = pieces;

    // Production flags — Default to false, system updates them manually
    order.is_design_completed = false;
    order.is_cutting_completed = false;

    // Random stage spread across the workflow
    // Orders 1-10: early stages, 11-25: mid stages, 26-35: late stages
    let stageIndex: number;
    if (i <= 10) {
      stageIndex = Math.floor(Math.random() * 3);       // New Batches → Approved Files
    } else if (i <= 25) {
      stageIndex = 3 + Math.floor(Math.random() * 5);   // Design → EMB Done
    } else {
      stageIndex = 8 + Math.floor(Math.random() * 5);   // Stitching → Shipped
    }
    const currentStage = stages[stageIndex] || stages[0];
    order.current_stage = currentStage;

    // Status: completed if shipped, active otherwise
    order.status = stageIndex === stages.length - 1 ? 'Completed' : 'Active';

    // Random employee assignments
    const salesEmp = rand(createdEmployees);
    const filingEmp = rand(createdEmployees);
    order.sales_team = salesEmp.name;
    order.filing_team_name = filingEmp.name;

    // Deposit: either half amount or full
    order.deposit = Math.random() > 0.5 ? String(Math.floor(total / 2)) : 'Full';
    order.inner_print = Math.random() > 0.7 ? 'Yes' : 'No';

    // Estimated delivery: 5-15 days from now
    const daysOffset = 5 + Math.floor(Math.random() * 10);
    order.estimated_delivery = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);

    // Build a realistic history of order stages
    const orderStages: OrderStage[] = [];
    for (let s = 0; s <= stageIndex; s++) {
      const os = new OrderStage();
      os.stage_name = stages[s];
      os.status = s < stageIndex ? 'Completed' : 'In Progress';
      os.employee_id = rand(createdEmployees).id;
      os.notes = s === 0
        ? 'System: Initial order created via seed.'
        : `System: Advanced to ${stages[s]} stage.`;
      orderStages.push(os);
    }

    order.stages = orderStages;
    ordersToCreate.push(order);

    console.log(`   [${i}/35] Order ${order.order_number} → Stage: "${currentStage}" | ${pieces} PCS | ${total} AED`);
  }

  await orderRepo.save(ordersToCreate);

  // ── DONE ────────────────────────────────────────────────────────
  console.log('\n======================================');
  console.log('  ✅ SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================');
  console.log(`  Employees : ${createdEmployees.length}`);
  console.log(`  Stages    : ${ALL_STAGES.length} definitions`);
  console.log(`  Orders    : 35 across all stages`);
  console.log('\nCredentials:');
  console.log('  admin@factory.com      → password123');
  console.log('  accountant@factory.com → password123');
  console.log('  staff@factory.com      → password123');
  console.log('======================================\n');

  await app.close();
}

bootstrap().catch((err) => {
  console.error('\n❌ Seeding failed:', err);
  process.exit(1);
});
