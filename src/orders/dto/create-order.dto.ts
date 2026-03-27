import { IsNotEmpty, IsOptional, IsString, IsNumber, IsNumberString, MinLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  order_number: string;

  @IsString()
  @IsNotEmpty()
  customer_name: string;

  @IsNumberString({}, { message: 'Phone must be a valid number' })
  @MinLength(10, { message: 'Phone must be at least 10 digits' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Total amount must be a number' })
  total_amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Piece count must be an integer' })
  piece_count?: number;

  @IsString()
  @IsOptional()
  estimated_delivery?: string;

  @IsString()
  @IsOptional()
  invoice_image?: string;
}
