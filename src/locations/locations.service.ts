import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { LocationPing } from './entities/location-ping.entity';
import { Journey, JourneyStatus } from '../journeys/entities/journey.entity';
import { CreateLocationDto } from './dto/create-location.dto';

export interface LocationCreatedEvent {
  journeyId: string;
  coordinatorUserId: string;
  latitude: number;
  longitude: number;
  speedKph?: number | null;
  headingDegrees?: number | null;
  recordedAt: string;
}

export interface LiveLocationRow {
  journeyId: string;
  coordinatorUserId: string;
  coordinatorName: string;
  destinationName: string;
  latitude: number;
  longitude: number;
  speedKph: number | null;
  recordedAt: Date;
}

export interface NearbyCoordinatorRow {
  coordinatorUserId: string;
  journeyId: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  recordedAt: Date;
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(LocationPing) private readonly locationsRepo: Repository<LocationPing>,
    @InjectRepository(Journey) private readonly journeysRepo: Repository<Journey>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(coordinatorUserId: string, dto: CreateLocationDto): Promise<LocationPing> {
    const journey = await this.journeysRepo.findOne({ where: { id: dto.journeyId } });
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    if (journey.coordinatorUserId !== coordinatorUserId) {
      throw new ForbiddenException('You can only report locations for your own journey');
    }
    if (journey.status !== JourneyStatus.IN_PROGRESS) {
      throw new ConflictException('Cannot record a location for a journey that is not in progress');
    }

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    const rows = await this.dataSource.query(
      `
      INSERT INTO location_pings
        (id, journey_id, coordinator_user_id, latitude, longitude,
         speed_kph, heading_degrees, accuracy_meters, recorded_at, created_at, geom)
      VALUES
        (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, now(),
         ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography)
      RETURNING id, journey_id AS "journeyId", coordinator_user_id AS "coordinatorUserId",
                latitude, longitude, speed_kph AS "speedKph", heading_degrees AS "headingDegrees",
                accuracy_meters AS "accuracyMeters", recorded_at AS "recordedAt", created_at AS "createdAt";
      `,
      [
        dto.journeyId,
        coordinatorUserId,
        dto.latitude,
        dto.longitude,
        dto.speedKph ?? null,
        dto.headingDegrees ?? null,
        dto.accuracyMeters ?? null,
        recordedAt,
      ],
    );

    const created: LocationPing = rows[0];

    const event: LocationCreatedEvent = {
      journeyId: created.journeyId,
      coordinatorUserId: created.coordinatorUserId,
      latitude: created.latitude,
      longitude: created.longitude,
      speedKph: created.speedKph,
      headingDegrees: created.headingDegrees,
      recordedAt: created.recordedAt.toString(),
    };
    this.eventEmitter.emit('location.created', event);

    return created;
  }

  async getLiveLocations(): Promise<LiveLocationRow[]> {
    return this.dataSource.query(`
      SELECT DISTINCT ON (lp.journey_id)
        lp.journey_id AS "journeyId",
        lp.coordinator_user_id AS "coordinatorUserId",
        u."fullName" AS "coordinatorName",
        j.destination_name AS "destinationName",
        lp.latitude,
        lp.longitude,
        lp.speed_kph AS "speedKph",
        lp.recorded_at AS "recordedAt"
      FROM location_pings lp
      INNER JOIN journeys j ON j.id = lp.journey_id AND j.status = 'in_progress'
      INNER JOIN users u ON u.id = lp.coordinator_user_id
      ORDER BY lp.journey_id, lp.recorded_at DESC;
    `);
  }

  async getRouteHistory(journeyId: string): Promise<LocationPing[]> {
    const journey = await this.journeysRepo.findOne({ where: { id: journeyId } });
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    return this.locationsRepo.find({
      where: { journeyId },
      order: { recordedAt: 'ASC' },
    });
  }

  async findCoordinatorsNear(
    lat: number,
    lng: number,
    radiusMeters: number,
  ): Promise<NearbyCoordinatorRow[]> {
    return this.dataSource.query(
      `
      WITH latest_pings AS (
        SELECT lp.*,
               ROW_NUMBER() OVER (PARTITION BY lp.coordinator_user_id ORDER BY lp.recorded_at DESC) AS rn
        FROM location_pings lp
      )
      SELECT
        lp.coordinator_user_id AS "coordinatorUserId",
        lp.journey_id AS "journeyId",
        lp.latitude,
        lp.longitude,
        lp.recorded_at AS "recordedAt",
        ST_Distance(lp.geom, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS "distanceMeters"
      FROM latest_pings lp
      WHERE lp.rn = 1
        AND ST_DWithin(lp.geom, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
      ORDER BY "distanceMeters" ASC;
      `,
      [lat, lng, radiusMeters],
    );
  }
}
