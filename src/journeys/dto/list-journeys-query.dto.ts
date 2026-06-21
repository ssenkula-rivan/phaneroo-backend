import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { JourneyStatus } from '../entities/journey.entity';

export class ListJourneysQueryDto {
  @IsOptional()
  @IsEnum(JourneyStatus)
  status?: JourneyStatus;

  @IsOptional()
  @IsUUID()
  coordinatorUserId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
