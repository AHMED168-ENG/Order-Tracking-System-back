import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('stage_definitions')
export class StageDefinition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  department: string;

  @Column({ default: 0 })
  order_index: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price_per_piece: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
