import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';
import { CoordinatorProfile } from './coordinator-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Index({ unique: true })
  @Column()
  phoneNumber: string;

  @Column()
  fullName: string;

  @Exclude({ toPlainOnly: true })
  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', default: Role.VIEWER })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => CoordinatorProfile, (profile) => profile.user, { nullable: true })
  coordinatorProfile?: CoordinatorProfile;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
