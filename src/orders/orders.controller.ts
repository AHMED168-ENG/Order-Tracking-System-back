import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFiles, UploadedFile, ForbiddenException } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname, join } from 'path';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Public route for customers
  @Get('track/:order_number')
  trackOrder(@Param('order_number') order_number: string) {
    return this.ordersService.trackOrder(order_number);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  @Get('suggested-number')
  getSuggestedNumber() {
    return this.ordersService.getSuggestedNumber();
  }

  // Protected routes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll(
    @Query('search') search?: string, 
    @Query('department') department?: string,
    @Query('stage') stage?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.ordersService.findAll(search, department, stage, +page, +limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.findOneWithRole(+id, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  @Post('create')
  @UseInterceptors(FileInterceptor('invoice', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  create(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: any,
    @UploadedFile() invoice?: Express.Multer.File,
  ) {
    if (invoice && req.user.role === 'admin') {
      createOrderDto.invoice_image = `/uploads/${invoice.filename}`;
    }
    return this.ordersService.create(createOrderDto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @Post('upload-excel')
  @UseInterceptors(FileInterceptor('file'))
  uploadExcel(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    // Only Filing Team (Planning dept) or Admin can upload
    if (req.user.role !== 'admin' && req.user.department !== 'Planning') {
      throw new ForbiddenException('Only Filing Team members can upload Excel files');
    }
    return this.ordersService.bulkCreateFromExcel(file, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update-stage')
  @UseInterceptors(FilesInterceptor('attachments', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async updateStage(
    @Body() updateStageDto: UpdateStageDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req: any,
    @UploadedFile('invoice') invoice?: Express.Multer.File,
  ) {
    const order = await this.ordersService.updateStage(updateStageDto, files, req.user);
    
    if (invoice && req.user.role === 'admin') {
      order.invoice_image = `/uploads/${invoice.filename}`;
      await this.ordersService.saveOrder(order);
    }
    
    return order;
  }
}
