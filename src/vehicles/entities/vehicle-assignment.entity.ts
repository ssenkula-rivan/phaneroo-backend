import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { User } from '../../users/entities/user.entity';

@Entity('vehicle_assignments')
export class VehicleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Index()
  @Column({ name: 'vehicle_id' })
  vehicleId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coordinator_user_id' })
  coordinator: User;

  @Index()
  @Column({ name: 'coordinator_user_id' })
  coordinatorUserId: string;

  @Column({ name: 'assigned_at', type: 'datetime' })
  assignedAt: Date;

  @Column({ name: 'unassigned_at', type: 'datetime', nullable: true })
  unassignedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
