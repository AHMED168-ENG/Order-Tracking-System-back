import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrderStage } from './order-stage.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  order_number: string;

  @Column({ length: 255 })
  customer_name: string;

  @Column({ length: 50 })
  status: string;

  @Column({ length: 100 })
  current_stage: string;

  @Column({ type: 'date', nullable: true })
  estimated_delivery: Date;

  @OneToMany(() => OrderStage, (stage) => stage.order, { cascade: true })
  stages: OrderStage[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
