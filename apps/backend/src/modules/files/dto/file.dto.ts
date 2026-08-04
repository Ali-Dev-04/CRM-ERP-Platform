import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMimeType, IsString, Min } from 'class-validator';

export class PresignUploadDto {
  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsMimeType()
  contentType: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  sizeBytes: number;
}
