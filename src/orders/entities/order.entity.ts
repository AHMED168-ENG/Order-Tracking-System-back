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

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_amount: number;

  @Column({ type: 'int', default: 0 })
  piece_count: number;

  @Column({ type: 'text', nullable: true })
  invoice_image?: string;

  @Column({ length: 50 })
  status: string;

  @Column({ length: 100 })
  current_stage: string;

  @Column({ type: 'date', nullable: true })
  estimated_delivery: Date | null; // B.C.D

  @Column({ type: 'date', nullable: true })
  fcd: Date | null;

  @Column({ type: 'varchar', length: 10, default: 'No' })
  inner_print: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sales_team: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  filing_team_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deposit: string | null;

  @Column({ type: 'boolean', default: false })
  is_design_completed: boolean;

  @Column({ type: 'boolean', default: false })
  is_cutting_completed: boolean;

  @Column({ type: 'jsonb', nullable: true })
  price_details: any;

  @OneToMany(() => OrderStage, (stage) => stage.order, { cascade: true })
  stages: OrderStage[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
