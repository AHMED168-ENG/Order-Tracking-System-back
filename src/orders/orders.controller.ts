import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Public route for customers
  @Get('track/:order_number')
  trackOrder(@Param('order_number') order_number: string) {
    return this.ordersService.trackOrder(order_number);
  }

  // Protected routes
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('search') search?: string, @Query('department') department?: string) {
    return this.ordersService.findAll(search, department);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  create(@Body() createOrderDto: CreateOrderDto, @Request() req: any) {
    return this.ordersService.create(createOrderDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update-stage')
  updateStage(@Body() updateStageDto: UpdateStageDto) {
    return this.ordersService.updateStage(updateStageDto);
  }
}
