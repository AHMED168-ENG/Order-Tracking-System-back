import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderStage } from '../orders/entities/order-stage.entity';
import { DEPT_MAPPING, ALL_STAGES } from '../common/seed-data';
import { StageDefinition } from '../settings/entities/stage-definition.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderStage)
    private stagesRepository: Repository<OrderStage>,
    @InjectRepository(StageDefinition)
    private stageDefinitionsRepository: Repository<StageDefinition>,
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

    // All stages aggregation (including Completed/Shipped)
    const activeOrders = await this.ordersRepository
      .createQueryBuilder('order')
      .select('current_stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(piece_count)', 'total_pieces')
      .groupBy('current_stage')
      .getRawMany();

    // Production efficiency indicator
    const efficiencyRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

    // Get all defined stages to ensure zero-counts are included
    const allDefinedStages = await this.stageDefinitionsRepository.find({
      order: { order_index: 'ASC' },
      where: { is_active: true }
    });

    const stagesChart = allDefinedStages.map(stage => {
      const activeData = activeOrders.find(ao => ao.current_stage === stage.name);
      return {
        current_stage: stage.name,
        count: activeData ? parseInt(activeData.count, 10) : 0,
        total_pieces: activeData ? parseInt(activeData.total_pieces || '0', 10) : 0
      };
    });

    // Orders by Department (now using all defined stages)
    const departmentStats: { [key: string]: number } = {};
    activeOrders.forEach(st => {
      const stageDef = allDefinedStages.find(sd => sd.name === st.current_stage);
      const dept = stageDef ? stageDef.department : (DEPT_MAPPING[st.current_stage] || 'Other');
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
      stages: allDefinedStages,
      stagesChart,
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
