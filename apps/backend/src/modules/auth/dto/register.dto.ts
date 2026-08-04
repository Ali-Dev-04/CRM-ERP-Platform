import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'ada@lovelace.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'C0rrect-Horse-Battery', minLength: 12 })
  @IsString()
  @MinLength(12)
  @Matches(/[A-Za-z]/, { message: 'password must contain a letter' })
  @Matches(/\d/, { message: 'password must contain a number' })
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty({ description: 'Name of the organization to create' })
  @IsString()
  @MinLength(2)
  organizationName: string;
}
