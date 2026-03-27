import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { OrderStage } from '../orders/entities/order-stage.entity';
import { Employee } from '../employees/entities/employee.entity';

@Injectable()
export class AccountantDashboardService {
  constructor(
    @InjectRepository(OrderStage)
    private stagesRepository: Repository<OrderStage>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  private getDateRange(period: string) {
    const end = new Date();
    const start = new Date();
    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else {
      // month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }

  async getProductivity(period: string = 'month') {
    const { start, end } = this.getDateRange(period);

    // Group stages by employee within date range, joining the Order to get piece_count
    const qb = this.stagesRepository.createQueryBuilder('stage')
      .leftJoinAndSelect('stage.order', 'order')
      .leftJoinAndSelect('stage.employee', 'employee')
      .where('stage.updated_at BETWEEN :start AND :end', { start, end })
      .andWhere('stage.employee_id IS NOT NULL');

    const stages = await qb.getMany();

    const employeeMap = {};
    
    stages.forEach(s => {
      const empId = s.employee_id;
      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employee_name: s.employee ? s.employee.name : 'Unknown User',
          stages_completed: 0,
          pieces_processed: 0,
          orders: new Set(),
        };
      }
      employeeMap[empId].stages_completed += 1;
      employeeMap[empId].orders.add(s.order_id);
      employeeMap[empId].pieces_processed += s.order ? Number(s.order.piece_count) : 0;
    });

    const results = Object.keys(employeeMap).map(id => ({
      employee_id: id,
      name: employeeMap[id].employee_name,
      stages_completed: employeeMap[id].stages_completed,
      unique_orders_touched: employeeMap[id].orders.size,
      pieces_processed: employeeMap[id].pieces_processed,
    })).sort((a, b) => b.pieces_processed - a.pieces_processed);

    return results;
  }

  async getStats(period: string = 'month') {
    const prod = await this.getProductivity(period);
    
    const totalStages = prod.reduce((acc, p) => acc + p.stages_completed, 0);
    const totalPieces = prod.reduce((acc, p) => acc + p.pieces_processed, 0);
    const activeStaff = prod.length;
    const topPerformer = prod.length > 0 ? prod[0] : null;

    return {
      total_stages: totalStages,
      total_pieces: totalPieces,
      active_staff: activeStaff,
      top_performer: topPerformer ? topPerformer.name : 'N/A'
    };
  }
}
