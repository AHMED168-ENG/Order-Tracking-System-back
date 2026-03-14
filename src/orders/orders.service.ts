import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderStage } from './entities/order-stage.entity';
import { ALL_STAGES, DEPT_MAPPING } from '../common/constants';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderStage)
    private stagesRepository: Repository<OrderStage>,
  ) {}

  async findAll(search?: string, department?: string) {
    const queryBuilder = this.ordersRepository.createQueryBuilder('order');

    if (search) {
      queryBuilder.andWhere(
        '(order.order_number LIKE :search OR order.customer_name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (department && department !== 'Management') {
      const stagesForDept = ALL_STAGES.filter(
        (stage) => DEPT_MAPPING[stage] === department,
      );
      if (stagesForDept.length > 0) {
        queryBuilder.andWhere('order.current_stage IN (:...stages)', {
          stages: stagesForDept,
        });
      }
    }

    return queryBuilder.orderBy('order.created_at', 'DESC').getMany();
  }

  async findOne(id: number) {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    
    const stages = await this.stagesRepository.find({
      where: { order_id: id },
      order: { id: 'ASC' },
    });

    return { order, stages };
  }

  async trackOrder(order_number: string) {
    const order = await this.ordersRepository.findOne({ where: { order_number } });
    if (!order) throw new NotFoundException('Order not found');
    
    const stages = await this.stagesRepository.find({
      where: { order_id: order.id },
      order: { id: 'ASC' },
    });

    return { order, stages };
  }

  async create(createOrderDto: CreateOrderDto, user: any) {
    const newOrder = this.ordersRepository.create({
      ...createOrderDto,
      status: 'Pending',
      current_stage: 'New Batches',
    });
    
    const savedOrder = await this.ordersRepository.save(newOrder);

    const initialStage = this.stagesRepository.create({
      order_id: savedOrder.id,
      stage_name: 'New Batches',
      status: 'Pending',
      notes: 'Order created by ' + user.name,
    });
    await this.stagesRepository.save(initialStage);

    return savedOrder;
  }

  async updateStage(updateStageDto: UpdateStageDto) {
    const { order_id, stage_name, status, notes } = updateStageDto;
    
    const order = await this.ordersRepository.findOne({ where: { id: order_id } });
    if (!order) throw new NotFoundException('Order not found');

    const newStage = this.stagesRepository.create({
      order_id,
      stage_name,
      status,
      notes,
    });
    await this.stagesRepository.save(newStage);

    let orderStatus = 'In Progress';
    if (stage_name === 'Shipped') orderStatus = 'Completed';
    else if (stage_name === 'New Batches' && status === 'Pending') orderStatus = 'Pending';
    
    order.current_stage = stage_name;
    order.status = orderStatus;
    
    return this.ordersRepository.save(order);
  }
}
