import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Journey, JourneyStatus } from './entities/journey.entity';
import { StartJourneyDto } from './dto/start-journey.dto';

export interface ListJourneysFilter {
  status?: JourneyStatus;
  coordinatorUserId?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class JourneysService {
  constructor(
    @InjectRepository(Journey) private readonly journeysRepo: Repository<Journey>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async start(coordinatorUserId: string, dto: StartJourneyDto): Promise<Journey> {
    const active = await this.journeysRepo.findOne({
      where: { coordinatorUserId, status: JourneyStatus.IN_PROGRESS },
    });
    if (active) {
      throw new ConflictException(
        'You already have an active journey. End it before starting a new one.',
      );
    }

    const journey = this.journeysRepo.create({
      coordinatorUserId,
      vehicleId: dto.vehicleId ?? null,
      vehicleNumberPlate: dto.vehicleNumberPlate,
      departureName: dto.departureName,
      departureLat: dto.departureLat,
      departureLng: dto.departureLng,
      destinationName: dto.destinationName,
      destinationLat: dto.destinationLat,
      destinationLng: dto.destinationLng,
      status: JourneyStatus.IN_PROGRESS,
      startedAt: new Date(),
    });
    const savedJourney = await this.journeysRepo.save(journey);

    this.eventEmitter.emit('journey.started', {
      journeyId: savedJourney.id,
      coordinatorUserId,
      vehicleNumberPlate: dto.vehicleNumberPlate,
    });

    return savedJourney;
  }

  async end(
    journeyId: string,
    requesterUserId: string,
    requesterIsAdmin: boolean,
  ): Promise<Journey> {
    const journey = await this.findById(journeyId);
    if (!requesterIsAdmin && journey.coordinatorUserId !== requesterUserId) {
      throw new ForbiddenException('You can only end your own journey');
    }
    if (journey.status !== JourneyStatus.IN_PROGRESS) {
      throw new ConflictException('Only an in-progress journey can be ended');
    }
    journey.status = JourneyStatus.COMPLETED;
    journey.endedAt = new Date();
    const savedJourney = await this.journeysRepo.save(journey);

    this.eventEmitter.emit('journey.ended', {
      journeyId: savedJourney.id,
      coordinatorUserId: savedJourney.coordinatorUserId,
    });

    return savedJourney;
  }

  async findById(id: string): Promise<Journey> {
    const journey = await this.journeysRepo.findOne({ where: { id } });
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    return journey;
  }

  async findActiveForCoordinator(coordinatorUserId: string): Promise<Journey | null> {
    return this.journeysRepo.findOne({
      where: { coordinatorUserId, status: JourneyStatus.IN_PROGRESS },
    });
  }

  async listActive(): Promise<Journey[]> {
    return this.journeysRepo.find({
      where: { status: JourneyStatus.IN_PROGRESS },
      relations: ['coordinator', 'coordinator.coordinatorProfile', 'vehicle'],
      order: { startedAt: 'ASC' },
    });
  }

  async list(filter: ListJourneysFilter): Promise<{ items: Journey[]; total: number }> {
    const qb = this.journeysRepo
      .createQueryBuilder('journey')
      .leftJoinAndSelect('journey.coordinator', 'coordinator')
      .leftJoinAndSelect('coordinator.coordinatorProfile', 'profile')
      .leftJoinAndSelect('journey.vehicle', 'vehicle');

    if (filter.status) {
      qb.andWhere('journey.status = :status', { status: filter.status });
    }
    if (filter.coordinatorUserId) {
      qb.andWhere('journey.coordinatorUserId = :coordinatorUserId', {
        coordinatorUserId: filter.coordinatorUserId,
      });
    }

    qb.orderBy('journey.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.pageSize)
      .take(filter.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async bulkUpdateStatus(
    ids: string[],
    status: JourneyStatus,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const id of ids) {
      const journey = await this.findById(id);
      const wasInProgress = journey.status === JourneyStatus.IN_PROGRESS;
      if (status === JourneyStatus.COMPLETED && wasInProgress) {
        journey.status = JourneyStatus.COMPLETED;
        journey.endedAt = new Date();
      } else if (status === JourneyStatus.CANCELLED) {
        journey.status = JourneyStatus.CANCELLED;
        if (wasInProgress) {
          journey.endedAt = new Date();
        }
      } else {
        journey.status = status;
      }
      await this.journeysRepo.save(journey);
      updated += 1;
    }
    return { updated };
  }
}
