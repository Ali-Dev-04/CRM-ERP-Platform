import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 25;
const MAX_SIZE = 100;

export class PaginationDto {
  @ApiPropertyOptional({ default: DEFAULT_PAGE, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({ default: DEFAULT_SIZE, minimum: 1, maximum: MAX_SIZE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SIZE)
  @IsOptional()
  size: number = DEFAULT_SIZE;

  @ApiPropertyOptional({ description: 'e.g. "createdAt:desc", "name:asc"' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z]+:(asc|desc)$/, {
    message: 'sort must be like "field:asc" or "field:desc"',
  })
  sort?: string;

  get offset(): number {
    return (this.page - 1) * this.size;
  }
}
