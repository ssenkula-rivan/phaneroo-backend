import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { VehicleStatus } from '../entities/vehicle.entity';

export class CreateVehicleDto {
  @Matches(/^[A-Z0-9 -]{4,15}$/, {
    message: 'registrationNumber must be 4-15 uppercase letters/digits/spaces/hyphens',
  })
  registrationNumber: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'driverPhone must be a valid phone number' })
  driverPhone?: string;

  @IsOptional()
  @IsIn(Object.values(VehicleStatus))
  status?: VehicleStatus;
}
