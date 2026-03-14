import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderStage } from './entities/order-stage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderStage])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
