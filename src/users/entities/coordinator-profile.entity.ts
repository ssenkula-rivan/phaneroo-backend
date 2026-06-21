import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('coordinator_profiles')
export class CoordinatorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Index({ unique: true })
  @Column({ name: 'coordinator_code' })
  coordinatorCode: string;

  @Column({ name: 'stage_name', nullable: true })
  stageName?: string;

  @Index()
  @Column()
  district: string;

  @Index()
  @Column()
  region: string;

  @Column({ name: 'vehicle_type', nullable: true })
  vehicleType?: string;

  @Column({ name: 'vehicle_registration_number', nullable: true })
  vehicleRegistrationNumber?: string;

  @Column({ name: 'emergency_contact_name', nullable: true })
  emergencyContactName?: string;

  @Column({ name: 'emergency_contact_phone', nullable: true })
  emergencyContactPhone?: string;

  @Column({ name: 'profile_photo_url', nullable: true })
  profilePhotoUrl?: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
