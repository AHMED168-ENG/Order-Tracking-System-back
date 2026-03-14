import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.employeesService.findAll(+page, +limit);
  }

  @Post()
  create(@Body() employeeData: any) {
    return this.employeesService.create(employeeData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(+id);
  }
}
