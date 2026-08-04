import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Shared line-item shape used by invoices and quotations. */
export class LineItemDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 5000, description: 'unit price in cents' })
  @IsInt()
  @Min(0)
  unitPriceCents: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
