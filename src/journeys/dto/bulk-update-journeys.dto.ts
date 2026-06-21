import { ArrayMinSize, IsArray, IsEnum, IsUUID } from 'class-validator';
import { JourneyStatus } from '../entities/journey.entity';

export class BulkUpdateJourneysDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];

  @IsEnum(JourneyStatus)
  status: JourneyStatus;
}
