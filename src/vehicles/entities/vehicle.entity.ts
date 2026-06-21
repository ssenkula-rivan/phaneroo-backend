import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VehicleStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'registration_number' })
  registrationNumber: string;

  @Column({ nullable: true })
  type?: string;

  @Column()
  capacity: number;

  @Column({ name: 'driver_name', nullable: true })
  driverName?: string;

  @Column({ name: 'driver_phone', nullable: true })
  driverPhone?: string;

  @Column({ name: 'fuel_level_percent', type: 'float', nullable: true })
  fuelLevelPercent?: number;

  @Column({ name: 'last_fuel_stop_at', type: 'datetime', nullable: true })
  lastFuelStopAt?: Date | null;

  @Column({ type: 'varchar', default: VehicleStatus.ACTIVE })
  status: VehicleStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
