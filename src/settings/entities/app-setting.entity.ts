import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('app_settings')
export class AppSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  phone_numbers: string;

  @Column({ type: 'text', nullable: true })
  whatsapp: string;

  @Column({ type: 'text', nullable: true })
  facebook_url: string;

  @Column({ type: 'text', nullable: true })
  instagram_url: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  other_info: string;

  @UpdateDateColumn()
  updated_at: Date;
}
