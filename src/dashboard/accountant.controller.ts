import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccountantDashboardService } from './accountant.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('accountant')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'accountant')
export class AccountantController {
  constructor(private readonly accountantService: AccountantDashboardService) {}

  @Get('productivity')
  async getProductivity(@Query('period') period: string) {
    return this.accountantService.getProductivity(period || 'month');
  }

  @Get('stats')
  async getStats(@Query('period') period: string) {
    return this.accountantService.getStats(period || 'month');
  }
}
