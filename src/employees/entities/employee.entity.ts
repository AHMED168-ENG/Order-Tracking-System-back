import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  department: string;

  @Column({ length: 50 })
  role: string; // 'admin' or 'employee'

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255, nullable: true })
  phone: string;

  @Column({ length: 255 })
  password: string;

  @Column({ type: 'text', nullable: true })
  avatar: string;
}
