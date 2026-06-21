import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

export enum JourneyStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('journeys')
export class Journey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'coordinator_user_id' })
  coordinator: User;

  @Index()
  @Column({ name: 'coordinator_user_id' })
  coordinatorUserId: string;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId?: string | null;

  @Column({ name: 'vehicle_number_plate' })
  vehicleNumberPlate: string;

  @Column({ name: 'departure_name' })
  departureName: string;

  @Column({ name: 'departure_lat', type: 'double precision' })
  departureLat: number;

  @Column({ name: 'departure_lng', type: 'double precision' })
  departureLng: number;

  @Column({ name: 'destination_name' })
  destinationName: string;

  @Column({ name: 'destination_lat', type: 'double precision' })
  destinationLat: number;

  @Column({ name: 'destination_lng', type: 'double precision' })
  destinationLng: number;

  @Index()
  @Column({ type: 'varchar', default: JourneyStatus.PLANNED })
  status: JourneyStatus;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'ended_at', type: 'datetime', nullable: true })
  endedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
