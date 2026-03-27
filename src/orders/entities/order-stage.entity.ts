import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_stages')
export class OrderStage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  order_id: number;

  @ManyToOne('Employee')
  @JoinColumn({ name: 'employee_id' })
  employee: any;

  @Column({ nullable: true })
  employee_id: number;

  @Column({ length: 100 })
  stage_name: string;

  @Column({ length: 50 })
  status: string; // 'Pending', 'In Progress', 'Completed'

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  attachments: string[];

  @UpdateDateColumn()
  updated_at: Date;
}
