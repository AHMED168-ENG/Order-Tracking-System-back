import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderStage } from '../orders/entities/order-stage.entity';
import { DEPT_MAPPING } from '../common/constants';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderStage)
    private stagesRepository: Repository<OrderStage>,
  ) {}

  async getStats() {
    const total = await this.ordersRepository.count();
    
    // Total Orders Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalOrdersToday = await this.ordersRepository
      .createQueryBuilder('order')
      .where('order.created_at >= :today', { today })
      .getCount();

    // Orders completed
    const completed = await this.ordersRepository.count({ where: { status: 'Completed' } });
    
    // Orders currently in production
    const inProduction = await this.ordersRepository.count({ where: { status: 'In Progress' } });

    // Pending
    const pending = await this.ordersRepository.count({ where: { status: 'Pending' } });

    // Active stages aggregation
    const activeOrders = await this.ordersRepository
      .createQueryBuilder('order')
      .where('order.status != :status', { status: 'Completed' })
      .select('current_stage')
      .addSelect('COUNT(*)', 'count')
      .groupBy('current_stage')
      .getRawMany();

    // Production efficiency indicator
    const efficiencyRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

    // Orders by Department
    const departmentStats: { [key: string]: number } = {};
    activeOrders.forEach(st => {
      const dept = DEPT_MAPPING[st.current_stage] || 'Other';
      departmentStats[dept] = (departmentStats[dept] || 0) + parseInt(st.count, 10);
    });

    // Latest updates
    const latestUpdates = await this.stagesRepository
      .createQueryBuilder('stage')
      .leftJoinAndSelect('stage.order', 'order')
      .orderBy('stage.updated_at', 'DESC')
      .limit(10)
      .getMany();

    return {
      total,
      totalOrdersToday,
      inProduction,
      completed,
      pending,
      efficiencyRate,
      stagesChart: activeOrders.map(st => ({
        current_stage: st.current_stage,
        count: parseInt(st.count, 10)
      })),
      departmentChart: Object.keys(departmentStats).map(name => ({
        name,
        count: departmentStats[name]
      })),
      latestUpdates: latestUpdates.map(st => ({
        order_number: st.order.order_number,
        stage_name: st.stage_name,
        status: st.status,
        updated_at: st.updated_at
      }))
    };
  }
}
