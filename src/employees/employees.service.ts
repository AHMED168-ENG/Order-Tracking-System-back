import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
  ) {}

  async findAll() {
    return this.employeesRepository.find({
      select: ['id', 'name', 'email', 'role', 'department'],
    });
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.employeesRepository.findOne({ where: { email } });
  }

  async create(employeeData: any) {
    const existing = await this.findByEmail(employeeData.email);
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(employeeData.password || 'password123', 10);
    const employee = this.employeesRepository.create({
      ...employeeData,
      password: hashedPassword,
    });
    return this.employeesRepository.save(employee);
  }

  async remove(id: number) {
    const target = await this.employeesRepository.findOne({ where: { id } });
    if (!target) throw new ConflictException('Employee not found');
    
    if (target.role === 'admin') {
      throw new ConflictException('Admin accounts cannot be deleted for security reasons.');
    }
    
    return this.employeesRepository.delete(id);
  }
}
