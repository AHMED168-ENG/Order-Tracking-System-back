import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { AccountantDashboardService } from './accountant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/accountant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'accountant')
export class AccountantController {
  constructor(private readonly accountantService: AccountantDashboardService) {}

  @Get('productivity')
  async getProductivity(
    @Query('period') period: string,
    @Query('search') search: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.accountantService.getProductivity(period || 'month', search || '', +page, +limit);
  }

  @Get('stats')
  async getStats(@Query('period') period: string) {
    return this.accountantService.getStats(period || 'month');
  }

  @Get('employee/:id/orders')
  async getEmployeeOrders(
    @Param('id') id: string,
    @Query('period') period: string
  ) {
    return this.accountantService.getEmployeeOrders(+id, period || 'month');
  }
}
