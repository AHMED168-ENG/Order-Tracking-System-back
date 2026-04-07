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
import { SettingsModule } from './settings/settings.module';
import { StagesModule } from './settings/stages.module';
import { AppSetting } from './settings/entities/app-setting.entity';
import { StageDefinition } from './settings/entities/stage-definition.entity';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (res) => {
          res.set('Access-Control-Allow-Origin', '*');
        },
      },
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
        entities: [Employee, Order, OrderStage, AppSetting, StageDefinition],
        autoLoadEntities: true, // Automatically loads all entities registered in the project
        synchronize: configService.get<string>('NODE_ENV') !== 'production', // Disable synchronize in production for data safety
        
        /**
         * Connection pooling is critical for production performance.
         * It reuses existing database connections, reducing the latency of opening 
         * new ones and preventing "too many connections" errors under high load.
         */
        extra: {
          max: 5, // Maximum number of concurrent connections in the pool
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    OrdersModule,
    DashboardModule,
    EmployeesModule,
    SettingsModule,
    StagesModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
