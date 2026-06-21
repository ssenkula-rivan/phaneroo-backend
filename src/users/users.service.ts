import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CoordinatorProfile } from './entities/coordinator-profile.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/enums/role.enum';

export interface ListUsersFilter {
  role?: Role;
  district?: string;
  region?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(CoordinatorProfile)
    private readonly profilesRepo: Repository<CoordinatorProfile>,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepo.findOne({
      where: [{ email: dto.email }, { phoneNumber: dto.phoneNumber }],
    });
    if (existing) {
      throw new ConflictException('A user with this email or phone number already exists');
    }

    if (dto.role === Role.COORDINATOR) {
      if (!dto.coordinatorCode || !dto.district || !dto.region) {
        throw new ConflictException(
          'coordinatorCode, district and region are required for the coordinator role',
        );
      }
      const codeTaken = await this.profilesRepo.findOne({
        where: { coordinatorCode: dto.coordinatorCode },
      });
      if (codeTaken) {
        throw new ConflictException('coordinatorCode is already in use');
      }
    }

    const saltRounds = this.configService.get<number>('bcryptSaltRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = this.usersRepo.create({
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      fullName: dto.fullName,
      passwordHash,
      role: dto.role,
    });
    const savedUser = await this.usersRepo.save(user);

    if (dto.role === Role.COORDINATOR) {
      const profile = this.profilesRepo.create({
        userId: savedUser.id,
        coordinatorCode: dto.coordinatorCode as string,
        district: dto.district as string,
        region: dto.region as string,
        stageName: dto.stageName,
        vehicleType: dto.vehicleType,
        vehicleRegistrationNumber: dto.vehicleRegistrationNumber,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
      });
      await this.profilesRepo.save(profile);
    }

    return this.findById(savedUser.id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email }, relations: ['coordinatorProfile'] });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: ['coordinatorProfile'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async list(filter: ListUsersFilter): Promise<{ items: User[]; total: number }> {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.coordinatorProfile', 'profile');

    if (filter.role) qb.andWhere('user.role = :role', { role: filter.role });
    if (typeof filter.isActive === 'boolean')
      qb.andWhere('user.isActive = :isActive', { isActive: filter.isActive });
    if (filter.district) qb.andWhere('profile.district = :district', { district: filter.district });
    if (filter.region) qb.andWhere('profile.region = :region', { region: filter.region });

    qb.orderBy('user.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.pageSize)
      .take(filter.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    await this.usersRepo.save(user);

    if (user.coordinatorProfile) {
      const profile = user.coordinatorProfile;
      if (dto.stageName !== undefined) profile.stageName = dto.stageName;
      if (dto.district !== undefined) profile.district = dto.district;
      if (dto.region !== undefined) profile.region = dto.region;
      if (dto.vehicleType !== undefined) profile.vehicleType = dto.vehicleType;
      if (dto.vehicleRegistrationNumber !== undefined)
        profile.vehicleRegistrationNumber = dto.vehicleRegistrationNumber;
      if (dto.emergencyContactName !== undefined)
        profile.emergencyContactName = dto.emergencyContactName;
      if (dto.emergencyContactPhone !== undefined)
        profile.emergencyContactPhone = dto.emergencyContactPhone;
      await this.profilesRepo.save(profile);
    }

    return this.findById(id);
  }

  async deactivate(id: string): Promise<User> {
    return this.update(id, { isActive: false });
  }

  async bulkDeactivate(ids: string[]): Promise<{ updated: number }> {
    let updated = 0;
    for (const id of ids) {
      await this.deactivate(id);
      updated += 1;
    }
    return { updated };
  }

  async bulkUpdate(
    ids: string[],
    fields: { isActive?: boolean; district?: string; region?: string; stageName?: string },
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const id of ids) {
      await this.update(id, fields);
      updated += 1;
    }
    return { updated };
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.findById(userId);
    const saltRounds = this.configService.get<number>('bcryptSaltRounds', 12);
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await this.usersRepo.save(user);
  }
}
