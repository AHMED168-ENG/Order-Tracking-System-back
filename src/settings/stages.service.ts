import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StageDefinition } from './entities/stage-definition.entity';
import { ALL_STAGES, DEPT_MAPPING } from '../common/constants';

@Injectable()
export class StagesService implements OnModuleInit {
  constructor(
    @InjectRepository(StageDefinition)
    private stagesRepository: Repository<StageDefinition>,
  ) {}

  async onModuleInit() {
    const count = await this.stagesRepository.count();
    if (count === 0) {
      const initialStages = ALL_STAGES.map((name, index) => ({
        name,
        department: DEPT_MAPPING[name] || 'Other',
        order_index: index,
        is_active: true,
      }));
      await this.stagesRepository.save(this.stagesRepository.create(initialStages));
    }
  }

  async findAll() {
    return this.stagesRepository.find({
      order: { order_index: 'ASC' },
      where: { is_active: true }
    });
  }

  async findAllAdmin() {
    return this.stagesRepository.find({
      order: { order_index: 'ASC' }
    });
  }

  async create(data: Partial<StageDefinition>) {
    const stage = this.stagesRepository.create(data);
    return this.stagesRepository.save(stage);
  }

  async update(id: number, data: Partial<StageDefinition>) {
    await this.stagesRepository.update(id, data);
    return this.findOne(id);
  }

  async findOne(id: number) {
    return this.stagesRepository.findOne({ where: { id } });
  }

  async remove(id: number) {
    return this.stagesRepository.delete(id);
  }

  async reorder(stages: { id: number; order_index: number }[]) {
    for (const item of stages) {
      await this.stagesRepository.update(item.id, { order_index: item.order_index });
    }
    return this.findAll();
  }
}
