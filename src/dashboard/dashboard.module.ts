import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AccountantDashboardService } from './accountant.service';
import { AccountantController } from './accountant.controller';
import { Order } from '../orders/entities/order.entity';
import { OrderStage } from '../orders/entities/order-stage.entity';
import { StageDefinition } from '../settings/entities/stage-definition.entity';
import { Employee } from '../employees/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderStage, StageDefinition, Employee])],
  controllers: [DashboardController, AccountantController],
  providers: [DashboardService, AccountantDashboardService],
})
export class DashboardModule {}
