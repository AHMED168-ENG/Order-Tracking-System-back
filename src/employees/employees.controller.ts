import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.employeesService.findOne(req.user.id);
  }

  @Put('profile')
  updateProfile(@Req() req: any, @Body() updateData: any) {
    return this.employeesService.updateProfile(req.user.id, updateData);
  }

  @Get()
  @Roles('admin')
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.employeesService.findAll(+page, +limit);
  }

  @Post()
  @Roles('admin')
  create(@Body() employeeData: any) {
    return this.employeesService.create(employeeData);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(+id);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.employeesService.updateByAdmin(+id, updateData);
  }
}
