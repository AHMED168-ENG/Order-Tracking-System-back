import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStage } from '../orders/entities/order-stage.entity';
import { AppSetting } from '../settings/entities/app-setting.entity';
import { StageDefinition } from '../settings/entities/stage-definition.entity';
import { CORE_ACCOUNTS, DEFAULT_SETTINGS, ALL_STAGES, DEPT_MAPPING } from '../common/seed-data';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderStage)
    private readonly stageRepo: Repository<OrderStage>,
    @InjectRepository(AppSetting)
    private readonly settingRepo: Repository<AppSetting>,
    @InjectRepository(StageDefinition)
    private readonly stageDefRepo: Repository<StageDefinition>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Checking database status for seeding...');
    await this.runSeed();
  }

  async runSeed() {
    try {
      // 1. Seed App Settings
      const settingsCount = await this.settingRepo.count();
      if (settingsCount === 0) {
        this.logger.log('Seeding default App Settings...');
        await this.settingRepo.save(this.settingRepo.create(DEFAULT_SETTINGS));
      }

      // 2. Seed Stage Definitions (Sync missing stages)
      this.logger.log('Synchronizing Stage Definitions...');
      for (const [index, name] of ALL_STAGES.entries()) {
        const existing = await this.stageDefRepo.findOne({ where: { name } });
        if (!existing) {
          this.logger.log(`Adding missing stage: ${name}`);
          await this.stageDefRepo.save(
            this.stageDefRepo.create({
              name,
              department: DEPT_MAPPING[name] || 'Other',
              order_index: index,
              is_active: true,
            }),
          );
        } else {
          // Sync order_index and department if they changed
          existing.order_index = index;
          existing.department = DEPT_MAPPING[name] || 'Other';
          await this.stageDefRepo.save(existing);
        }
      }

      // 3. Seed Core Accounts (Only if no employees exist)
      const employeeCount = await this.employeeRepo.count();
      if (employeeCount === 0) {
        this.logger.log('No employees found. Seeding Core Accounts...');
        for (const account of CORE_ACCOUNTS) {
          const hashed = await bcrypt.hash(account.password, 10);
          await this.employeeRepo.save(
            this.employeeRepo.create({
              ...account,
              password: hashed,
            }),
          );
          this.logger.log(`Created core account: ${account.email}`);
        }
      } else {
        this.logger.log('Employees already exist, skipping core account seeding.');
      }

      this.logger.log('Database seeding/synchronization complete!');
    } catch (error) {
      this.logger.error('Error during database seeding:', error.stack);
    }
  }
}
