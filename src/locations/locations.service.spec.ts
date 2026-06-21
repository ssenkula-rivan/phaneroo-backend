import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LocationsService } from './locations.service';
import { LocationPing } from './entities/location-ping.entity';
import { Journey, JourneyStatus } from '../journeys/entities/journey.entity';

describe('LocationsService', () => {
  let service: LocationsService;
  let journeysRepo: { findOne: jest.Mock };
  let dataSource: { query: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const inProgressJourney = {
    id: 'journey-1',
    coordinatorUserId: 'coord-1',
    status: JourneyStatus.IN_PROGRESS,
  };

  const pingDto = { journeyId: 'journey-1', latitude: 0.41, longitude: 33.05 };

  const insertedRow = {
    id: 'ping-1',
    journeyId: 'journey-1',
    coordinatorUserId: 'coord-1',
    latitude: 0.41,
    longitude: 33.05,
    speedKph: null,
    headingDegrees: null,
    accuracyMeters: null,
    recordedAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    journeysRepo = { findOne: jest.fn() };
    dataSource = { query: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: getRepositoryToken(LocationPing), useValue: {} },
        { provide: getRepositoryToken(Journey), useValue: journeysRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(LocationsService);
  });

  describe('create', () => {
    it('inserts the ping (lat/lng + PostGIS geom in one parameterized query) and emits an event', async () => {
      journeysRepo.findOne.mockResolvedValue(inProgressJourney);
      dataSource.query.mockResolvedValue([insertedRow]);

      const result = await service.create('coord-1', pingDto);

      expect(result).toEqual(insertedRow);

      const [sql, params] = dataSource.query.mock.calls[0];
      expect(sql).toContain('ST_SetSRID(ST_MakePoint($4, $3), 4326)');
      expect(params[0]).toBe('journey-1');
      expect(params[1]).toBe('coord-1');
      expect(params[2]).toBe(0.41);
      expect(params[3]).toBe(33.05);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'location.created',
        expect.objectContaining({ journeyId: 'journey-1', coordinatorUserId: 'coord-1' }),
      );
    });

    it('404s when the journey does not exist', async () => {
      journeysRepo.findOne.mockResolvedValue(null);

      await expect(service.create('coord-1', pingDto)).rejects.toThrow(NotFoundException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it("refuses to let a coordinator report a location on someone else's journey", async () => {
      journeysRepo.findOne.mockResolvedValue({
        ...inProgressJourney,
        coordinatorUserId: 'someone-else',
      });

      await expect(service.create('coord-1', pingDto)).rejects.toThrow(ForbiddenException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('refuses a ping for a journey that is not in progress', async () => {
      journeysRepo.findOne.mockResolvedValue({
        ...inProgressJourney,
        status: JourneyStatus.COMPLETED,
      });

      await expect(service.create('coord-1', pingDto)).rejects.toThrow(ConflictException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });

  describe('findCoordinatorsNear', () => {
    it('runs a parameterized ST_DWithin query with (lat, lng, radius) in that order', async () => {
      dataSource.query.mockResolvedValue([]);

      await service.findCoordinatorsNear(0.4, 33.0, 5000);

      const [sql, params] = dataSource.query.mock.calls[0];
      expect(sql).toContain('ST_DWithin');
      expect(sql).toContain('ST_Distance');
      expect(params).toEqual([0.4, 33.0, 5000]);
    });
  });
});
