import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Order } from '../orders/entities/order.entity';
import { OrderStage } from '../orders/entities/order-stage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderStage])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
