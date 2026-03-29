import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { DEFAULT_SETTINGS } from '../common/seed-data';

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
        this.settingsRepository.create(DEFAULT_SETTINGS),
      );
    }
  }

  async getSettings() {
    try {
      const settings = await this.settingsRepository.find();
      if (settings.length === 0) {
        console.log('No settings found, creating default...');
        const newSettings = this.settingsRepository.create(DEFAULT_SETTINGS);
        return await this.settingsRepository.save(newSettings);
      }
      return settings[0];
    } catch (error) {
      console.error('Error in getSettings:', error);
      throw error;
    }
  }

  async updateSettings(updateData: Partial<AppSetting>) {
    try {
      const settings = await this.getSettings();
      Object.assign(settings, updateData);
      return await this.settingsRepository.save(settings);
    } catch (error) {
      console.error('Error in updateSettings:', error);
      throw error;
    }
  }
}
