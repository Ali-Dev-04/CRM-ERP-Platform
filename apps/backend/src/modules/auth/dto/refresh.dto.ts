import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Opaque refresh token returned at login/register' })
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
