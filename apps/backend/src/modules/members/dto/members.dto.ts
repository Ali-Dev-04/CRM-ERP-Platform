import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

const ROLE_NAMES = ['Owner', 'Admin', 'Member'] as const;

export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiProperty({ enum: ROLE_NAMES, default: 'Member' })
  @IsEnum(ROLE_NAMES)
  role: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ROLE_NAMES })
  @IsEnum(ROLE_NAMES)
  role: string;
}
