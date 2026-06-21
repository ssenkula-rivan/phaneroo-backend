import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { VehicleStatus } from '../entities/vehicle.entity';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'driverPhone must be a valid phone number' })
  driverPhone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fuelLevelPercent?: number;

  @IsOptional()
  @IsIn(Object.values(VehicleStatus))
  status?: VehicleStatus;
}
