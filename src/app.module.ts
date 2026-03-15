import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Employee } from './employees/entities/employee.entity';
import { Order } from './orders/entities/order.entity';
import { OrderStage } from './orders/entities/order-stage.entity';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmployeesModule } from './employees/employees.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'garment_tracking'),
        entities: [Employee, Order, OrderStage],
        synchronize: true, // Auto-create tables in dev
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    OrdersModule,
    DashboardModule,
    EmployeesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
