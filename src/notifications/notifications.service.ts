import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationCreatedEvent } from '../locations/locations.service';
import { User } from '../users/entities/user.entity';
import { ADMIN_ROLES } from '../common/enums/role.enum';
import { Journey } from '../journeys/entities/journey.entity';

export interface NotificationPayload {
  type: 'JOURNEY_STARTED' | 'LOCATION_UPDATE' | 'JOURNEY_ENDED';
  coordinatorId: string;
  coordinatorName: string;
  coordinatorPhone: string;
  journeyId: string;
  vehicleNumberPlate?: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Journey) private readonly journeysRepo: Repository<Journey>,
  ) {}

  @OnEvent('journey.started')
  async handleJourneyStarted(event: {
    journeyId: string;
    coordinatorUserId: string;
    vehicleNumberPlate: string;
  }): Promise<void> {
    const journey = await this.journeysRepo.findOne({
      where: { id: event.journeyId },
      relations: ['coordinator'],
    });

    if (!journey) return;

    const notification: NotificationPayload = {
      type: 'JOURNEY_STARTED',
      coordinatorId: event.coordinatorUserId,
      coordinatorName: journey.coordinator.fullName,
      coordinatorPhone: journey.coordinator.phoneNumber,
      journeyId: event.journeyId,
      vehicleNumberPlate: event.vehicleNumberPlate,
      timestamp: new Date().toISOString(),
      message: `${journey.coordinator.fullName} started a journey in vehicle ${event.vehicleNumberPlate}`,
    };

    await this.notifyAdmins(notification);
  }

  @OnEvent('location.created')
  async handleLocationUpdate(event: LocationCreatedEvent): Promise<void> {
    const journey = await this.journeysRepo.findOne({
      where: { id: event.journeyId },
      relations: ['coordinator'],
    });

    if (!journey) return;

    const notification: NotificationPayload = {
      type: 'LOCATION_UPDATE',
      coordinatorId: event.coordinatorUserId,
      coordinatorName: journey.coordinator.fullName,
      coordinatorPhone: journey.coordinator.phoneNumber,
      journeyId: event.journeyId,
      latitude: event.latitude,
      longitude: event.longitude,
      timestamp: event.recordedAt,
      message: `Location update from ${journey.coordinator.fullName}`,
    };

    await this.notifyAdmins(notification);
  }

  @OnEvent('journey.ended')
  async handleJourneyEnded(event: { journeyId: string; coordinatorUserId: string }): Promise<void> {
    const journey = await this.journeysRepo.findOne({
      where: { id: event.journeyId },
      relations: ['coordinator'],
    });

    if (!journey) return;

    const notification: NotificationPayload = {
      type: 'JOURNEY_ENDED',
      coordinatorId: event.coordinatorUserId,
      coordinatorName: journey.coordinator.fullName,
      coordinatorPhone: journey.coordinator.phoneNumber,
      journeyId: event.journeyId,
      timestamp: new Date().toISOString(),
      message: `${journey.coordinator.fullName} ended their journey`,
    };

    await this.notifyAdmins(notification);
  }

  private async notifyAdmins(notification: NotificationPayload): Promise<void> {
    const admins = await this.usersRepo.find({
      where: ADMIN_ROLES.map((role) => ({ role, isActive: true })),
    });

    this.logger.log(
      `Notification: ${notification.message} (to ${admins.length} admins)`,
    );

  }
}
