import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, Req, UseInterceptors, UploadedFiles, UploadedFile, ForbiddenException, Res } from '@nestjs/common';
import { Response } from 'express';
import { FilesInterceptor, FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname, join } from 'path';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
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
    @Req() req: any,
    @Query('search') search: string,
    @Query('stage') stage: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('employeeId') employeeId?: string,
  ) {
    const department = ['admin', 'accountant'].includes(req.user.role) ? null : req.user.department;
    return this.ordersService.findAll(search, department, stage, +page, +limit, employeeId ? +employeeId : undefined);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'employee', 'staff')
  @Get('excel-template')
  async getExcelTemplate(@Res() res: Response) {
    return this.ordersService.getExcelTemplate(res);
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
    if (req.user.role === 'accountant') {
      throw new ForbiddenException('Accountants are not allowed to modify orders');
    }

    const order = await this.ordersService.updateStage(updateStageDto, files, req.user);
    
    if (invoice && req.user.role === 'admin') {
      order.invoice_image = `/uploads/${invoice.filename}`;
      await this.ordersService.saveOrder(order);
    }
    
    return order;
  }
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'accountant')
  @Post(':id/update')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'invoice', maxCount: 1 },
    { name: 'stage_image', maxCount: 1 }
  ], {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req: any,
    @UploadedFiles() files?: { invoice?: Express.Multer.File[], stage_image?: Express.Multer.File[] },
  ) {
    if (files?.invoice?.[0]) {
        updateOrderDto.invoice_image = `/uploads/${files.invoice[0].filename}`;
    }
    if (files?.stage_image?.[0]) {
        updateOrderDto.stage_image = `/uploads/${files.stage_image[0].filename}`;
    }
    return this.ordersService.update(+id, updateOrderDto, req.user);
  }
}
