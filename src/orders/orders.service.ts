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
      { header: 'B.C.D (YYYY-MM-DD)', key: 'bcd', width: 20 },
      { header: 'F C D (YYYY-MM-DD)', key: 'fcd', width: 20 },
      { header: 'Inner Print (Yes/No)', key: 'innerPrint', width: 20 },
      { header: 'Sales Team', key: 'salesTeam', width: 20 },
      { header: 'Filing Team', key: 'filingTeam', width: 20 },
      { header: 'Deposit (Number/Full)', key: 'deposit', width: 20 },
    ];

    // Add Instructions row
    const instructions = sheet.addRow(['Note: Please fill all mandatory fields (Order Number, Name, Phone). Dates must be YYYY-MM-DD.']);
    instructions.font = { italic: true, color: { argb: 'FFFF0000' } };
    sheet.mergeCells(instructions.number, 1, instructions.number, 13);

    // Add a single empty row for the user to start filling out
    sheet.addRow({
      orderNumber: 'sen001',
      customerName: 'Sample Customer',
      phone: '01000000000',
      address: 'Cairo, Egypt',
      totalAmount: 1000,
      pieces: 1,
      stage: stageNames[0] || 'New Batches',
      bcd: new Date().toISOString().split('T')[0],
      fcd: new Date().toISOString().split('T')[0],
      innerPrint: 'No',
      salesTeam: 'Team A',
      filingTeam: 'Planning Team',
      deposit: 'Full',
    });

    // Formatting Header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell((cellByColumn: ExcelJS.Cell) => {
      cellByColumn.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFEFEF' },
      };
      cellByColumn.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add Data Validation Dropdown to 'Stage' column (G) for the first 1000 rows
    const stageColChar = 'G';
    const dropDownList = `"${stageNames.join(',')}"`;

    for (let i = 3; i <= 1000; i++) {
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
    // sheet_to_json doesn't skip instruction rows automatically, so we skip manually if needed
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet);
    
    // Filter out potential instruction rows (we added one in line 2)
    const data = rawData.filter(row => {
      const firstVal = Object.values(row)[0];
      return firstVal && !String(firstVal).includes('Note:');
    });

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; message: string }>,
      successfulOrders: [] as any[],
    };

    // Pre-fetch all active stages once
    const activeStages = await this.stageDefinitionsRepository.find({
      where: { is_active: true },
      order: { order_index: 'ASC' },
    });
    const validStageNames = activeStages.map((s) => s.name);
    const embroideryIdx = ALL_STAGES.indexOf('Ready for Embroidery');

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Approximate row number

      try {
        // Robust mapping helper
        const getVal = (keys: string[]) => {
          for (const k of keys) {
            if (row[k] !== undefined) return row[k];
          }
          return null;
        };

        const orderNumber = String(getVal(['Order Number', 'order_number', 'orderNumber']) || '').trim();
        const customerName = String(getVal(['Customer Name', 'customer_name', 'customerName']) || '').trim();
        const phone = String(getVal(['Phone', 'phone']) || '').trim();
        const address = String(getVal(['Address', 'address']) || '').trim();
        const totalAmount = Number(getVal(['Total Amount', 'total_amount', 'totalAmount']) || 0);
        const pieceCount = Number(getVal(['Pieces', 'pieces', 'Piece Count', 'piece_count']) || 0);
        const stageFromExcel = String(getVal(['Stage', 'stage', 'Current Stage']) || '').trim();
        const bcd = getVal(['B.C.D', 'bcd', 'B.C.D (YYYY-MM-DD)']);
        const fcdValue = getVal(['F C D', 'fcd', 'F C D (YYYY-MM-DD)']);
        const innerPrint = String(getVal(['Inner Print', 'inner_print', 'Inner Print (Yes/No)']) || 'No').trim();
        const salesTeam = String(getVal(['Sales Team', 'sales_team']) || '').trim();
        const filingTeam = String(getVal(['Filing Team', 'filing_team', 'Filing Team Name']) || '').trim();
        const deposit = String(getVal(['Deposit', 'deposit', 'Deposit (Number/Full)']) || '').trim();

        if (!orderNumber || !customerName || !phone) {
          throw new Error('Missing required fields (Order Number, Customer Name, or Phone)');
        }

        const existing = await this.ordersRepository.findOne({
          where: { order_number: orderNumber },
        });
        if (existing) {
          throw new Error(`Order number ${orderNumber} already exists`);
        }

        // --- Stage & Production Flags Logic ---
        let initialStageName = activeStages[0]?.name || 'New Batches';
        let isDesignCompleted = false;
        let isCuttingCompleted = false;

        if (stageFromExcel && validStageNames.includes(stageFromExcel)) {
          initialStageName = stageFromExcel;
        }

        const stageIdxInSeq = ALL_STAGES.indexOf(initialStageName);

        // Logic: Any stage from "Ready for Embroidery" (embroideryIdx) onwards means production is DONE.
        if (embroideryIdx !== -1 && stageIdxInSeq >= embroideryIdx) {
          isDesignCompleted = true;
          isCuttingCompleted = true;
        } else if (initialStageName === 'Design') {
          // If manually starting at Design, let's assume it's moving forward
          // However, user usually wants it in 'In Progress' with manual flags.
          // Rule from CreateOrderDto usually keeps these false by default.
        } else if (initialStageName === 'Cutting') {
            // Already past design if it's in cutting? Usually yes.
            isDesignCompleted = true;
        }

        let orderStatus = 'Pending';
        const lastStage = activeStages[activeStages.length - 1];
        
        if (initialStageName === lastStage?.name) orderStatus = 'Completed';
        else if (initialStageName !== validStageNames[0]) orderStatus = 'In Progress';

        const orderData: DeepPartial<Order> = {
          order_number: orderNumber,
          customer_name: customerName,
          phone,
          address,
          total_amount: totalAmount,
          piece_count: pieceCount,
          status: orderStatus,
          current_stage: initialStageName,
          is_design_completed: isDesignCompleted,
          is_cutting_completed: isCuttingCompleted,
          inner_print: innerPrint,
          estimated_delivery: bcd ? new Date(bcd) : null,
          fcd: fcdValue ? new Date(fcdValue) : null,
          sales_team: salesTeam || null,
          filing_team_name: filingTeam || null,
          deposit: deposit || null,
        };

        const order = this.ordersRepository.create(orderData);
        const savedOrder = await this.ordersRepository.save(order);

        // Create initial history entry
        await this.stagesRepository.save(
          this.stagesRepository.create({
            order_id: savedOrder.id,
            stage_name: initialStageName,
            status: orderStatus,
            employee_id: user?.id,
            notes: 'Batch: Created via bulk upload',
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
    employeeId?: number,
  ) {
    const queryBuilder = this.ordersRepository.createQueryBuilder('order');

    if (search) {
      queryBuilder.andWhere(
        '(order.order_number LIKE :search OR order.customer_name LIKE :search OR order.phone LIKE :search)',
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

    if (employeeId) {
      queryBuilder
        .innerJoin('order.stages', 'history')
        .andWhere('history.employee_id = :employeeId', { employeeId });
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

    if (!lastOrder) return 'SEN2024001';

    const match = lastOrder.order_number.match(/(\d+)/);
    if (!match) return 'SEN2024001';

    const nextNum = parseInt(match[0]) + 1;
    return `SEN${nextNum}`;
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

    return await this.ordersRepository.save(order);
  }

  async update(id: number, updateOrderDto: UpdateOrderDto, user?: any) {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    // Parse price_details if sent as string (from FormData)
    let priceDetails = updateOrderDto.price_details;
    if (typeof priceDetails === 'string') {
      try {
        priceDetails = JSON.parse(priceDetails);
      } catch (e) {
        /* keep old */
      }
    }

    if (priceDetails && Array.isArray(priceDetails)) {
      order.price_details = priceDetails;
      order.total_amount = priceDetails.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0,
      );
      order.piece_count = priceDetails.reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      );
    }

    if (updateOrderDto.customer_name)
      order.customer_name = updateOrderDto.customer_name;
    if (updateOrderDto.phone) order.phone = updateOrderDto.phone;
    if (updateOrderDto.address) order.address = updateOrderDto.address;
    if (updateOrderDto.sales_team) order.sales_team = updateOrderDto.sales_team;
    if (updateOrderDto.filing_team_name)
      order.filing_team_name = updateOrderDto.filing_team_name;
    if (updateOrderDto.deposit) order.deposit = updateOrderDto.deposit;
    if (updateOrderDto.inner_print)
      order.inner_print = updateOrderDto.inner_print;
    if (updateOrderDto.estimated_delivery)
      order.estimated_delivery = new Date(updateOrderDto.estimated_delivery);
    if (updateOrderDto.fcd) order.fcd = new Date(updateOrderDto.fcd);
    if (updateOrderDto.order_number)
      order.order_number = updateOrderDto.order_number;
    if (updateOrderDto.invoice_image)
      order.invoice_image = updateOrderDto.invoice_image;

    const oldStage = order.current_stage;
    const requestedStage = updateOrderDto.current_stage;
    const newStatus = updateOrderDto.status;
    let readinessChanged = false;
    let readinessNote = '';

    // --- Readiness flags (manual toggle, validated against current stage) ---
    if (updateOrderDto.is_design_completed !== undefined) {
      const designVal = String(updateOrderDto.is_design_completed) === 'true';
      if (designVal !== order.is_design_completed) {
        if (designVal === true && oldStage !== 'Design' && oldStage !== 'Cutting') {
          throw new BadRequestException(`Design can only be marked READY while in 'Design' or 'Cutting' stage.`);
        }
        order.is_design_completed = designVal;
        readinessChanged = true;
        readinessNote += `Design: ${order.is_design_completed ? 'READY' : 'PENDING'}. `;
      }
    }

    if (updateOrderDto.is_cutting_completed !== undefined) {
      const cuttingVal = String(updateOrderDto.is_cutting_completed) === 'true';
      if (cuttingVal !== order.is_cutting_completed) {
        if (cuttingVal === true && oldStage !== 'Cutting' && oldStage !== 'Design') {
          throw new BadRequestException(`Cutting can only be marked READY while in 'Design' or 'Cutting' stage.`);
        }
        order.is_cutting_completed = cuttingVal;
        readinessChanged = true;
        readinessNote += `Cutting: ${order.is_cutting_completed ? 'READY' : 'PENDING'}. `;
      }
    }

    // --- Stage change validation ---
    if (requestedStage && requestedStage !== oldStage) {
      const oldIdx = ALL_STAGES.indexOf(oldStage);
      const newIdx = ALL_STAGES.indexOf(requestedStage);
      const embroideryIdx = ALL_STAGES.indexOf('Ready for Embroidery');

      if (oldIdx !== -1 && newIdx !== -1 && newIdx < oldIdx) {
        // Exception: Allow moving back and forth between 'Design' and 'Cutting'
        const isSwappingDesignCutting = (oldStage === 'Design' && requestedStage === 'Cutting') || (oldStage === 'Cutting' && requestedStage === 'Design');
        
        if (!isSwappingDesignCutting) {
          throw new BadRequestException(
            `Cannot move order back to "${requestedStage}". Progress is forward only.`,
          );
        }
      }

      // Only block manual jumps to Embroidery/later IF the order is still in earlier production stages.
      // Once it has auto-advanced (oldIdx >= embroideryIdx), manual advancement is allowed.
      if (newIdx >= embroideryIdx && embroideryIdx !== -1 && oldIdx < embroideryIdx)
        throw new BadRequestException(
          `"${requestedStage}" is reached automatically. Complete Design and Cutting first.`,
        );
    }

    if (newStatus) order.status = newStatus;

    // --- History entry: Manual stage change ---
    if (requestedStage && requestedStage !== oldStage) {
      // Auto-set the completion flag when the order enters the stage
      if (requestedStage === 'Design') {
        order.is_design_completed = true;
      }
      if (requestedStage === 'Cutting') {
        order.is_cutting_completed = true;
      }

      order.current_stage = requestedStage;
      await this.stagesRepository.save(
        this.stagesRepository.create({
          order_id: order.id,
          stage_name: requestedStage,
          status: newStatus || order.status,
          employee_id: user?.id,
          notes: updateOrderDto.notes || `Moved to ${requestedStage}`,
          attachments: updateOrderDto.stage_image ? [updateOrderDto.stage_image] : undefined,
        }),
      );
    } else if (readinessChanged) {
      await this.stagesRepository.save(
        this.stagesRepository.create({
          order_id: order.id,
          stage_name: order.current_stage,
          status: order.status,
          employee_id: user?.id,
          notes:
            updateOrderDto.notes || readinessNote.trim() || 'Readiness updated',
          attachments: updateOrderDto.stage_image ? [updateOrderDto.stage_image] : undefined,
        }),
      );
    } else if (updateOrderDto.notes || updateOrderDto.stage_image) {
      await this.stagesRepository.save(
        this.stagesRepository.create({
          order_id: order.id,
          stage_name: order.current_stage,
          status: order.status,
          employee_id: user?.id,
          notes: updateOrderDto.notes || 'Added transition image',
          attachments: updateOrderDto.stage_image ? [updateOrderDto.stage_image] : undefined,
        }),
      );
    }

    // --- Auto-transition to Embroidery ---
    // Fires as soon as both Design and Cutting are marked READY (either via stage change or manual button).
    if (
      order.is_design_completed &&
      order.is_cutting_completed &&
      (order.current_stage === 'Design' || order.current_stage === 'Cutting')
    ) {
      const embroideryStage = 'Ready for Embroidery';
      const oldStageBeforeAuto = order.current_stage;
      order.current_stage = embroideryStage;

      // Save a history entry for the auto-transition
      await this.stagesRepository.save(
        this.stagesRepository.create({
          order_id: order.id,
          stage_name: embroideryStage,
          status: order.status,
          employee_id: user?.id,
          notes: 'System: Auto-advanced — Both Design & Cutting are Completed.',
        }),
      );
    }

    return await this.ordersRepository.save(order);
  }

  async saveOrder(order: Order) {
    return this.ordersRepository.save(order);
  }
}
