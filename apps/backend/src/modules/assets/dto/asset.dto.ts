import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  valueCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}

export class AssignAssetDto {
  @ApiPropertyOptional({ description: 'Employee to assign to; omit/null to unassign' })
  @IsOptional()
  @IsString()
  employeeId?: string | null;
}
