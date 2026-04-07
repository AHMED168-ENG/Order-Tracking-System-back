import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Employee } from '../employees/entities/employee.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStage } from '../orders/entities/order-stage.entity';
import { AppSetting } from '../settings/entities/app-setting.entity';
import { StageDefinition } from '../settings/entities/stage-definition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Order,
      OrderStage,
      AppSetting,
      StageDefinition,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
