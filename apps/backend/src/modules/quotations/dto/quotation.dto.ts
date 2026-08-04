import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuotationStatus } from '@prisma/client';
import { LineItemDto } from '../../../common/dto/line-item.dto';

export class CreateQuotationDto {
  @ApiProperty()
  @IsString()
  clientId: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountCents?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  taxCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [LineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lines: LineItemDto[];
}

export class UpdateQuotationStatusDto {
  @ApiProperty({ enum: QuotationStatus })
  @IsEnum(QuotationStatus)
  status: QuotationStatus;
}
