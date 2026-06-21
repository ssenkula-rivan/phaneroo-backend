import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phoneNumber must be 7-15 digits, optionally starting with +',
  })
  phoneNumber: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password: string;

  @IsEnum(Role)
  role: Role;

  @ValidateIf((dto) => dto.role === Role.COORDINATOR)
  @IsString()
  coordinatorCode?: string;

  @ValidateIf((dto) => dto.role === Role.COORDINATOR)
  @IsString()
  district?: string;

  @ValidateIf((dto) => dto.role === Role.COORDINATOR)
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  stageName?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'emergencyContactPhone must be a valid phone number' })
  emergencyContactPhone?: string;
}
