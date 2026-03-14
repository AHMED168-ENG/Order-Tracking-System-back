import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateStageDto {
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
}
