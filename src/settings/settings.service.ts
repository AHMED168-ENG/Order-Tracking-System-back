import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(AppSetting)
    private settingsRepository: Repository<AppSetting>,
  ) {}

  async onModuleInit() {
    const count = await this.settingsRepository.count();
    if (count === 0) {
      await this.settingsRepository.save(
        this.settingsRepository.create({
          phone_numbers: 'Not set',
          whatsapp: '',
          facebook_url: '',
          instagram_url: '',
          address: '',
        }),
      );
    }
  }

  async getSettings() {
    const settings = await this.settingsRepository.find();
    return settings[0];
  }

  async updateSettings(updateData: Partial<AppSetting>) {
    const settings = await this.getSettings();
    Object.assign(settings, updateData);
    return this.settingsRepository.save(settings);
  }
}
