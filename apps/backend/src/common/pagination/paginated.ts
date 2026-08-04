import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';

/**
 * Standard list-response envelope for all paginated endpoints.
 */
export class Paginated<T> {
  @ApiProperty({ isArray: true })
  readonly items: T[];

  @ApiProperty()
  readonly page: number;

  @ApiProperty()
  readonly size: number;

  @ApiProperty()
  readonly total: number;

  @ApiProperty()
  readonly totalPages: number;

  constructor(items: T[], total: number, pagination: PaginationDto) {
    this.items = items;
    this.total = total;
    this.page = pagination.page;
    this.size = pagination.size;
    this.totalPages = pagination.size === 0 ? 0 : Math.ceil(total / pagination.size);
  }
}
