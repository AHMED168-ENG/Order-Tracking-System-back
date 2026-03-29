import { IsOptional, IsString, IsNumber, IsNumberString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  order_number?: string;

  @IsString()
  @IsOptional()
  customer_name?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Phone must be a valid number' })
  @MinLength(10, { message: 'Phone must be at least 10 digits' })
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Total amount must be a number' })
  total_amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Piece count must be a number' })
  piece_count?: number;

  @IsString()
  @IsOptional()
  estimated_delivery?: string;

  @IsString()
  @IsOptional()
  sales_team?: string;

  @IsString()
  @IsOptional()
  invoice_image?: string;

  @IsOptional()
  price_details?: any;
}
