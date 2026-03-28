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

  async getAggregatedProductivity(period: string = 'month') {
    const { start, end } = this.getDateRange(period);

    // Group stages by employee within date range, joining the Order to get piece_count
    const qb = this.stagesRepository
      .createQueryBuilder('stage')
      .leftJoinAndSelect('stage.order', 'order')
      .leftJoinAndSelect('stage.employee', 'employee')
      .where('stage.updated_at BETWEEN :start AND :end', { start, end })
      .andWhere('stage.employee_id IS NOT NULL');

    const stages = await qb.getMany();

    const employeeMap: Record<number, any> = {};

    stages.forEach((s) => {
      const empId = s.employee_id;
      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          id: empId,
          employee_name: s.employee ? s.employee.name : 'Unknown User',
          email: s.employee ? s.employee.email : '',
          phone: s.employee ? s.employee.phone : '',
          stages_completed: 0,
          pieces_processed: 0,
          orders: new Set(),
        };
      }
      employeeMap[empId].stages_completed += 1;
      employeeMap[empId].orders.add(s.order_id);
      employeeMap[empId].pieces_processed += s.order
        ? Number(s.order.piece_count)
        : 0;
    });

    const results = Object.values(employeeMap).map((emp: any) => ({
      employee_id: emp.id,
      name: emp.employee_name,
      email: emp.email,
      phone: emp.phone,
      stages_completed: emp.stages_completed,
      unique_orders_touched: emp.orders.size,
      pieces_processed: emp.pieces_processed,
    })).sort((a: any, b: any) => b.pieces_processed - a.pieces_processed);

    return results;
  }

  async getProductivity(period: string = 'month', search: string = '', page: number = 1, limit: number = 10) {
    let results = await this.getAggregatedProductivity(period);

    if (search) {
      const lowerSearch = search.toLowerCase();
      results = results.filter((emp: any) => 
        emp.name.toLowerCase().includes(lowerSearch) ||
        (emp.email && emp.email.toLowerCase().includes(lowerSearch)) ||
        (emp.phone && emp.phone.includes(search))
      );
    }

    const total = results.length;
    const startIndex = (page - 1) * limit;
    const paginatedData = results.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  async getStats(period: string = 'month') {
    const prod = await this.getAggregatedProductivity(period);

    const totalStages = prod.reduce((acc, p) => acc + p.stages_completed, 0);
    const totalPieces = prod.reduce((acc, p) => acc + p.pieces_processed, 0);
    const activeStaff = prod.length;
    const topPerformer = prod.length > 0 ? prod[0] : null;

    return {
      total_stages: totalStages,
      total_pieces: totalPieces,
      active_staff: activeStaff,
      top_performer: topPerformer ? topPerformer.name : 'N/A',
    };
  }

  async getEmployeeOrders(employeeId: number, period: string = 'month') {
    const { start, end } = this.getDateRange(period);
    
    const qb = this.stagesRepository.createQueryBuilder('stage')
      .leftJoinAndSelect('stage.order', 'order')
      .leftJoinAndSelect('stage.employee', 'employee')
      .where('stage.employee_id = :employeeId', { employeeId })
      .andWhere('stage.updated_at BETWEEN :start AND :end', { start, end });

    const stages = await qb.orderBy('stage.updated_at', 'DESC').getMany();

    // Map unique orders out of the stages
    const orderMap = new Map();
    
    stages.forEach(stage => {
      if (stage.order && !orderMap.has(stage.order.id)) {
        orderMap.set(stage.order.id, {
          order_id: stage.order.id,
          order_number: stage.order.order_number,
          customer_name: stage.order.customer_name,
          pieces: stage.order.piece_count || 0,
          stage_actioned: stage.stage_name,
          action_date: stage.updated_at
        });
      }
    });

    return {
      employee_id: employeeId,
      employee_name: stages.length > 0 ? stages[0].employee?.name : 'Unknown Employee',
      orders: Array.from(orderMap.values())
    };
  }
}
