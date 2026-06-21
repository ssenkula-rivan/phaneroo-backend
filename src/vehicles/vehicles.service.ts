import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleAssignment } from './entities/vehicle-assignment.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

export interface ListVehiclesFilter {
  status?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(VehicleAssignment)
    private readonly assignmentsRepo: Repository<VehicleAssignment>,
  ) {}

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const existing = await this.vehiclesRepo.findOne({
      where: { registrationNumber: dto.registrationNumber },
    });
    if (existing) {
      throw new ConflictException('A vehicle with this registration number already exists');
    }
    const vehicle = this.vehiclesRepo.create(dto);
    return this.vehiclesRepo.save(vehicle);
  }

  async list(filter: ListVehiclesFilter): Promise<{ items: Vehicle[]; total: number }> {
    const qb = this.vehiclesRepo.createQueryBuilder('vehicle');
    if (filter.status) qb.andWhere('vehicle.status = :status', { status: filter.status });
    qb.orderBy('vehicle.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.pageSize)
      .take(filter.pageSize);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findById(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepo.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findById(id);
    Object.assign(vehicle, dto);
    if (dto.fuelLevelPercent !== undefined) {
      vehicle.lastFuelStopAt = new Date();
    }
    return this.vehiclesRepo.save(vehicle);
  }

  async assign(vehicleId: string, coordinatorUserId: string): Promise<VehicleAssignment> {
    await this.findById(vehicleId);

    const currentlyOpen = await this.assignmentsRepo.findOne({
      where: { vehicleId, unassignedAt: IsNull() },
    });
    if (currentlyOpen) {
      currentlyOpen.unassignedAt = new Date();
      await this.assignmentsRepo.save(currentlyOpen);
    }

    const assignment = this.assignmentsRepo.create({
      vehicleId,
      coordinatorUserId,
      assignedAt: new Date(),
    });
    return this.assignmentsRepo.save(assignment);
  }

  async unassign(vehicleId: string): Promise<void> {
    const currentlyOpen = await this.assignmentsRepo.findOne({
      where: { vehicleId, unassignedAt: IsNull() },
    });
    if (!currentlyOpen) {
      throw new NotFoundException('This vehicle has no active assignment');
    }
    currentlyOpen.unassignedAt = new Date();
    await this.assignmentsRepo.save(currentlyOpen);
  }

  async getAssignmentHistory(vehicleId: string): Promise<VehicleAssignment[]> {
    await this.findById(vehicleId);
    return this.assignmentsRepo.find({
      where: { vehicleId },
      order: { assignedAt: 'DESC' },
    });
  }
}
