import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Journey } from '../../journeys/entities/journey.entity';
import { User } from '../../users/entities/user.entity';

@Entity('location_pings')
@Index(['journeyId', 'recordedAt'])
export class LocationPing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Journey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journey_id' })
  journey: Journey;

  @Index()
  @Column({ name: 'journey_id' })
  journeyId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'coordinator_user_id' })
  coordinator: User;

  @Index()
  @Column({ name: 'coordinator_user_id' })
  coordinatorUserId: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ name: 'speed_kph', type: 'float', nullable: true })
  speedKph?: number | null;

  @Column({ name: 'heading_degrees', type: 'float', nullable: true })
  headingDegrees?: number | null;

  @Column({ name: 'accuracy_meters', type: 'float', nullable: true })
  accuracyMeters?: number | null;

  @Column({ name: 'recorded_at', type: 'datetime' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
