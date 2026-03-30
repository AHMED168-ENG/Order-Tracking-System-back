import { Injectable, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CORE_ACCOUNTS } from '../common/seed-data';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeesService implements OnModuleInit {
  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
  ) {}

  async onModuleInit() {
    const adminExists = await this.employeesRepository.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
      console.log('Seeding initial accounts...');
      
      for (const account of CORE_ACCOUNTS) {
        const hashed = await bcrypt.hash(account.password, 10);
        await this.employeesRepository.save(this.employeesRepository.create({
          ...account,
          password: hashed
        }));
      }
      console.log('Initial accounts seeded successfully.');
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    const [items, total] = await this.employeesRepository.findAndCount({
      select: ['id', 'name', 'email', 'phone', 'role', 'department', 'avatar'],
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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

  async findOne(id: number): Promise<Employee | null> {
    return this.employeesRepository.findOne({ 
      where: { id },
      select: ['id', 'name', 'email', 'phone', 'role', 'department', 'avatar']
    });
  }

  async updateProfile(id: number, updateData: any) {
    const employee = await this.employeesRepository.findOne({ where: { id } });
    if (!employee) throw new ConflictException('Employee not found');

    if (updateData.email && updateData.email !== employee.email) {
      const existing = await this.findByEmail(updateData.email);
      if (existing) throw new ConflictException('Email already in use');
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password;
    }

    // Don't allow changing role/department via profile update for security
    delete updateData.role;
    delete updateData.department;

    Object.assign(employee, updateData);
    return this.employeesRepository.save(employee);
  }

  async updateByAdmin(id: number, updateData: any) {
    const employee = await this.employeesRepository.findOne({ where: { id } });
    if (!employee) throw new ConflictException('Employee not found');

    if (updateData.email && updateData.email !== employee.email) {
      const existing = await this.findByEmail(updateData.email);
      if (existing) throw new ConflictException('Email already in use by another employee');
    }

    // Admin can update name, email, role, department, phone
    const { name, email, role, department, phone } = updateData;
    if (name !== undefined) employee.name = name;
    if (email !== undefined) employee.email = email;
    if (role !== undefined) employee.role = role;
    if (department !== undefined) employee.department = department;
    if (phone !== undefined) employee.phone = phone;

    return this.employeesRepository.save(employee);
  }
}
