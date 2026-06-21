import { IsUUID } from 'class-validator';

export class AssignVehicleDto {
  @IsUUID()
  coordinatorUserId: string;
}
