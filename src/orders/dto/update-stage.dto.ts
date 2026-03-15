import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStageDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  order_id: number;

  @IsString()
  @IsNotEmpty()
  stage_name: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  estimated_delivery?: string;
}
