import { IsBoolean, IsLatitude, IsLongitude, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRouteQueryDto {
  @IsLatitude()
  @Type(() => Number)
  originLat: number;

  @IsLongitude()
  @Type(() => Number)
  originLng: number;

  @IsLatitude()
  @Type(() => Number)
  destLat: number;

  @IsLongitude()
  @Type(() => Number)
  destLng: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeAlternatives?: boolean;
}
