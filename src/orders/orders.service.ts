import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, DeepPartial } from 'typeorm';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { Order } from './entities/order.entity';
import { OrderStage } from './entities/order-stage.entity';
import { ALL_STAGES } from '../common/seed-data';
import { StageDefinition } from '../settings/entities/stage-definition.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderStage)
    private stagesRepository: Repository<OrderStage>,
    @InjectRepository(StageDefinition)
    private stageDefinitionsRepository: Repository<StageDefinition>,
  ) {}

  async getExcelTemplate(res: Response) {
    const stages = await this.stageDefinitionsRepository.find({
      where: { is_active: true },
      order: { order_index: 'ASC' },
    });
    const stageNames = stages.map((s) => s.name);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Orders Template');

    sheet.columns = [
      { header: 'Order Number', key: 'orderNumber', width: 20 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Pieces', key: 'pieces', width: 10 },
      { header: 'Stage', key: 'stage', width: 25 },
      { header: 'B.C.D', key: 'bcd', width: 15 },
      { header: 'F C D', key: 'fcd', width: 15 },
      { header: 'Sales Team', key: 'salesTeam', width: 20 },
      { header: 'Filing Team', key: 'filingTeam', width: 20 },
      { header: 'Deposit', key: 'deposit', width: 15 },
    ];

    // Add a single empty row for the user to start filling out
    sheet.addRow({
      orderNumber: '',
      customerName: '',
      phone: '',
      address: '',
      totalAmount: 0,
      pieces: 1,
      stage: stageNames[0] || 'New Batches',
      salesTeam: '',
      filingTeam: '',
      deposit: '',
    });

    // Formatting Header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell: ExcelJS.Cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFEFEF' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add Data Validation Dropdown to 'Stage' column (G) for the first 1000 rows
    const stageColChar = 'G';
    const dropDownList = `"${stageNames.join(',')}"`;

    for (let i = 2; i <= 1000; i++) {
      sheet.getCell(`${stageColChar}${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [dropDownList],
      };
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'orders_template.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  async bulkCreateFromExcel(file: Express.Multer.File, user: any) {
    if (!file) throw new BadRequestException('No file uploaded');

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; message: string }>,
      successfulOrders: [] as any[],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +1 for zero-index, +1 for header row

      try {
        const orderNumber = String(
          row['Order Number'] || row['order_number'] || '',
        ).trim();
        const customerName = String(
          row['Customer Name'] || row['customer_name'] || '',
        ).trim();
        const phone = String(row['Phone'] || row['phone'] || '').trim();
        const address = String(row['Address'] || row['address'] || '').trim();
        const totalAmount = Number(
          row['Total Amount'] || row['total_amount'] || 0,
        );
        const pieceCount = Number(
          row['Pieces'] ||
            row['pieces'] ||
            row['Piece Count'] ||
            row['piece_count'] ||
            0,
        );
        const stageFromExcel = String(
          row['Stage'] || row['stage'] || row['Current Stage'] || '',
        ).trim();
        const bcd = row['B.C.D'] || row['bcd'] || null;
        const fcdValue = row['F C D'] || row['fcd'] || null;
        const salesTeam = String(
          row['Sales Team'] || row['sales_team'] || '',
        ).trim();
        const filingTeam = String(
          row['Filing Team'] ||
            row['filing_team_name'] ||
            row['filing_team'] ||
            '',
        ).trim();
        const deposit = String(row['Deposit'] || row['deposit'] || '').trim();

        if (!orderNumber || !customerName || !phone) {
          throw new Error(
            'Missing required fields (Order Number, Customer Name, or Phone)',
          );
        }

        const existing = await this.ordersRepository.findOne({
          where: { order_number: orderNumber },
        });
        if (existing) {
          throw new Error(`Order number ${orderNumber} already exists`);
        }

        // Try to use the stage from Excel, validting it exists in active stages
        let initialStageName = 'New Batches';
        const activeStages = await this.stageDefinitionsRepository.find({
          where: { is_active: true },
        });
        const validStageNames = activeStages.map((s) => s.name);

        if (stageFromExcel && validStageNames.includes(stageFromExcel)) {
          initialStageName = stageFromExcel;
        } else {
          // Get first stage dynamically (or fallback to 'New Batches')
          const firstStage = activeStages.sort(
            (a, b) => a.order_index - b.order_index,
          )[0];
          initialStageName = firstStage?.name || 'New Batches';
        }

        let orderStatus = 'Pending';
        // Check if the initial stage is the last stage
        const lastStage = activeStages.sort(
          (a, b) => b.order_index - a.order_index,
        )[0];
        if (initialStageName === lastStage?.name) orderStatus = 'Completed';
        else if (initialStageName !== validStageNames[0])
          orderStatus = 'In Progress';

        const orderData: DeepPartial<Order> = {
          order_number: orderNumber,
          customer_name: customerName,
          phone,
          address,
          total_amount: totalAmount,
          piece_count: pieceCount,
          status: orderStatus,
          current_stage: initialStageName,
          estimated_delivery: bcd ? new Date(bcd) : null,
          fcd: fcdValue ? new Date(fcdValue) : null,
          sales_team: salesTeam || null,
          filing_team_name: filingTeam || null,
          deposit: deposit || null,
        };

        const order = this.ordersRepository.create(orderData);
        const savedOrder = await this.ordersRepository.save(order);

        await this.stagesRepository.save(
          this.stagesRepository.create({
            order_id: savedOrder.id,
            stage_name: initialStageName,
            status: orderStatus,
            notes: 'Created via bulk upload',
          }),
        );

        results.success++;
        results.successfulOrders.push({
          order_number: savedOrder.order_number,
          customer_name: savedOrder.customer_name,
          current_stage: savedOrder.current_stage,
        });
      } catch (err) {
        results.failed++;
        results.errors.push({ row: rowNum, message: err.message });
      }
    }

    return results;
  }

  async findAll(
    search?: string,
    department?: string,
    stage?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const queryBuilder = this.ordersRepository.createQueryBuilder('order');

    if (search) {
      queryBuilder.andWhere(
        '(order.order_number LIKE :search OR order.customer_name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (department && department !== 'Management') {
      const stagesForDept = await this.stageDefinitionsRepository.find({
        where: { department },
      });
      const stageNames = stagesForDept.map((s) => s.name);

      if (stageNames.length > 0) {
        queryBuilder.andWhere('order.current_stage IN (:...stages)', {
          stages: stageNames,
        });
      } else {
        // If no stages found for this dept, show nothing (or handle error)
        queryBuilder.andWhere('1=0');
      }
    }

    if (stage) {
      queryBuilder.andWhere('order.current_stage = :stage', { stage });
    }

    const [items, total] = await queryBuilder
      .orderBy('order.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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

  async findOne(id: number) {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const stages = await this.stagesRepository.find({
      where: { order_id: id },
      order: { id: 'ASC' },
      relations: ['employee'],
    });

    return { order, stages };
  }

  async findOneWithRole(id: number, role: string) {
    const { order, stages } = await this.findOne(id);
    if (role !== 'admin') {
      delete (order as any).invoice_image;
    }
    return { order, stages };
  }

  async trackOrder(order_number: string) {
    const order = await this.ordersRepository.findOne({
      where: { order_number },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Hide sensitive fields for public tracking
    delete (order as any).invoice_image;

    const stages = await this.stagesRepository.find({
      where: { order_id: order.id },
      order: { id: 'ASC' },
      relations: ['employee'],
    });

    return { order, stages };
  }
  async getSuggestedNumber() {
    const lastOrder = await this.ordersRepository.findOne({
      where: {},
      order: { order_number: 'DESC' },
    });

    if (!lastOrder) return 'SNC2024001';

    const match = lastOrder.order_number.match(/(\d+)/);
    if (!match) return 'SNC2024001';

    const nextNum = parseInt(match[0]) + 1;
    return `SNC${nextNum}`;
  }

  async create(createOrderDto: CreateOrderDto, user: any) {
    const existing = await this.ordersRepository.findOne({
      where: { order_number: createOrderDto.order_number },
    });
    if (existing) {
      throw new ConflictException(
        `Order number ${createOrderDto.order_number} already exists`,
      );
    }
    // Get first stage dynamically
    const firstStage = await this.stageDefinitionsRepository.findOne({
      where: {},
      order: { order_index: 'ASC' },
    });
    const initialStageName = firstStage?.name || 'New Batches';

    // Handle price_details parsing if it's a string (from FormData)
    let priceDetails = createOrderDto.price_details;
    if (typeof priceDetails === 'string') {
      try {
        priceDetails = JSON.parse(priceDetails);
      } catch (e) {
        priceDetails = [];
      }
    }

    const newOrder = this.ordersRepository.create({
      ...createOrderDto,
      price_details: priceDetails,
      piece_count: createOrderDto.piece_count || 0,
      invoice_image: createOrderDto.invoice_image || undefined,
      status: 'Pending',
      current_stage: initialStageName,
    });

    const savedOrder = await this.ordersRepository.save(newOrder);

    const initialStage = this.stagesRepository.create({
      order_id: savedOrder.id,
      stage_name: initialStageName,
      status: 'Pending',
      notes: 'Order created by ' + user.name,
    });
    await this.stagesRepository.save(initialStage);

    return savedOrder;
  }

  async updateStage(
    updateStageDto: UpdateStageDto,
    files: any[] = [],
    user?: any,
  ) {
    const { order_id, stage_name, status, notes, estimated_delivery } =
      updateStageDto;

    const order = await this.ordersRepository.findOne({
      where: { id: order_id },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (estimated_delivery) {
      order.estimated_delivery = new Date(estimated_delivery);
    }

    const attachments = files.map((file) => `/uploads/${file.filename}`);

    const newStage = this.stagesRepository.create({
      order_id,
      stage_name,
      status,
      notes,
      attachments,
      employee_id: user?.id,
    });
    await this.stagesRepository.save(newStage);

    // Dynamic status determination
    const lastStage = await this.stageDefinitionsRepository.findOne({
      order: { order_index: 'DESC' },
      where: { is_active: true },
    });

    const firstStage = await this.stageDefinitionsRepository.findOne({
      order: { order_index: 'ASC' },
      where: { is_active: true },
    });

    let orderStatus = 'In Progress';
    if (stage_name === lastStage?.name) orderStatus = 'Completed';
    else if (stage_name === firstStage?.name && status === 'Pending')
      orderStatus = 'Pending';

    order.current_stage = stage_name;
    order.status = orderStatus;

    const savedOrder = await this.ordersRepository.save(order);

    // Auto-transition logic
    if (stage_name === 'Design & Cut Pieces Ready') {
      const nextStageName = 'Ready for Embroidery';
      const autoStage = this.stagesRepository.create({
        order_id,
        stage_name: nextStageName,
        status: 'Pending',
        notes: 'Auto-transitioned from Design & Cut Pieces Ready',
        attachments: [],
        employee_id: user?.id,
      });
      await this.stagesRepository.save(autoStage);
      savedOrder.current_stage = nextStageName;
      return this.ordersRepository.save(savedOrder);
    }

    return savedOrder;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    // Handle price_details parsing if it's a string
    let priceDetails = updateOrderDto.price_details;
    if (typeof priceDetails === 'string') {
      try {
        priceDetails = JSON.parse(priceDetails);
      } catch (e) {
        // keep old or set empty
      }
    }

    if (priceDetails) {
      order.price_details = priceDetails;
      // Re-calculate totals if price_details changed
      if (Array.isArray(priceDetails)) {
        order.total_amount = priceDetails.reduce(
          (sum, item) => sum + Number(item.price) * Number(item.quantity),
          0,
        );
        order.piece_count = priceDetails.reduce(
          (sum, item) => sum + Number(item.quantity),
          0,
        );
      }
    }

    // Map other fields
    if (updateOrderDto.customer_name)
      order.customer_name = updateOrderDto.customer_name;
    if (updateOrderDto.phone) order.phone = updateOrderDto.phone;
    if (updateOrderDto.address) order.address = updateOrderDto.address;
    if (updateOrderDto.sales_team) order.sales_team = updateOrderDto.sales_team;
    if (updateOrderDto.filing_team_name)
      order.filing_team_name = updateOrderDto.filing_team_name;
    if (updateOrderDto.deposit) order.deposit = updateOrderDto.deposit;
    if (updateOrderDto.estimated_delivery)
      order.estimated_delivery = new Date(updateOrderDto.estimated_delivery);
    if (updateOrderDto.fcd) order.fcd = new Date(updateOrderDto.fcd);
    if (updateOrderDto.order_number)
      order.order_number = updateOrderDto.order_number;
    if (updateOrderDto.invoice_image)
      order.invoice_image = updateOrderDto.invoice_image;

    // Handle Stage and Status transitions
    const oldStage = order.current_stage;
    const newStage = updateOrderDto.current_stage;
    const newStatus = updateOrderDto.status;

    if (newStatus) order.status = newStatus;

    if (newStage && newStage !== oldStage) {
      order.current_stage = newStage;
      // Also update status if transitioning to the same stage
      await this.stagesRepository.save(
        this.stagesRepository.create({
          order_id: order.id,
          stage_name: newStage,
          status: newStatus || order.status,
          notes: `Updated via Edit Order form`,
        }),
      );
    } else if (newStatus && newStatus !== order.status) {
      // If only status changed (in the same stage)
      await this.stagesRepository.save(
        this.stagesRepository.create({
          order_id: order.id,
          stage_name: order.current_stage,
          status: newStatus,
          notes: `Status updated via Edit Order form`,
        }),
      );
    }

    return this.ordersRepository.save(order);
  }

  async saveOrder(order: Order) {
    return this.ordersRepository.save(order);
  }
}
