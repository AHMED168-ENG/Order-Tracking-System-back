import { IsNotEmpty, IsOptional, IsString, IsNumber, IsNumberString, MinLength, IsInt, Matches } from 'class-validator';
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
  inner_print?: string;

  @IsString()
  @IsOptional()
  estimated_delivery?: string; // B.C.D

  @IsString()
  @IsOptional()
  fcd?: string;

  @IsString()
  @IsOptional()
  sales_team?: string;

  @IsString()
  @IsOptional()
  filing_team_name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(フル|full|\d+(\.\d+)?)$/i, { message: 'Deposit must be a number or the word "Full"' })
  deposit?: string;

  @IsOptional()
  price_details?: any[];

  @IsString()
  @IsOptional()
  invoice_image?: string;
}
