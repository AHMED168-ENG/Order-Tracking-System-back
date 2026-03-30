import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderStage } from './entities/order-stage.entity';
import { StageDefinition } from '../settings/entities/stage-definition.entity';
import { Employee } from '../employees/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderStage, StageDefinition])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
