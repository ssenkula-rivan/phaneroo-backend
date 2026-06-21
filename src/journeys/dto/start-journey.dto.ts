import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class StartJourneyDto {
  @IsString()
  @MinLength(2)
  departureName: string;

  @IsLatitude()
  departureLat: number;

  @IsLongitude()
  departureLng: number;

  @IsString()
  @MinLength(2)
  destinationName: string;

  @IsLatitude()
  destinationLat: number;

  @IsLongitude()
  destinationLng: number;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  vehicleNumberPlate: string;
}
