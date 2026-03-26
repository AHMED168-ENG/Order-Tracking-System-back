import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { Employee } from './employees/entities/employee.entity';
import { Order } from './orders/entities/order.entity';
import { OrderStage } from './orders/entities/order-stage.entity';
import { AppSetting } from './settings/entities/app-setting.entity';
import { StageDefinition } from './settings/entities/stage-definition.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'garment_tracking',
  synchronize: false,
  logging: true,
  entities: [Employee, Order, OrderStage, AppSetting, StageDefinition],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
});
