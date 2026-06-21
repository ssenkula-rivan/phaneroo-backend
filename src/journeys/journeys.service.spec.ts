import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JourneysService } from './journeys.service';
import { Journey, JourneyStatus } from './entities/journey.entity';

describe('JourneysService', () => {
  let service: JourneysService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; find: jest.Mock };

  const startDto = {
    departureName: 'Kampala',
    departureLat: 0.3476,
    departureLng: 32.5825,
    destinationName: 'Jinja',
    destinationLat: 0.4244,
    destinationLng: 33.2042,
    vehicleNumberPlate: 'UBJ 123A',
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((entity) => entity),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ id: 'journey-1', ...entity })),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [JourneysService, { provide: getRepositoryToken(Journey), useValue: repo }],
    }).compile();

    service = module.get(JourneysService);
  });

  describe('start', () => {
    it('creates an in-progress journey when the coordinator has no other active one', async () => {
      repo.findOne.mockResolvedValue(null);

      const journey = await service.start('coord-1', startDto);

      expect(journey.status).toBe(JourneyStatus.IN_PROGRESS);
      expect(journey.startedAt).toBeInstanceOf(Date);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { coordinatorUserId: 'coord-1', status: JourneyStatus.IN_PROGRESS },
      });
    });

    it('refuses a second active journey for the same coordinator', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing-journey', status: JourneyStatus.IN_PROGRESS });

      await expect(service.start('coord-1', startDto)).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('end', () => {
    const inProgressJourney = {
      id: 'journey-1',
      coordinatorUserId: 'coord-1',
      status: JourneyStatus.IN_PROGRESS,
    };

    it('lets the owning coordinator end their own journey', async () => {
      repo.findOne.mockResolvedValue({ ...inProgressJourney });

      const result = await service.end('journey-1', 'coord-1', false);

      expect(result.status).toBe(JourneyStatus.COMPLETED);
      expect(result.endedAt).toBeInstanceOf(Date);
    });

    it("lets an admin end someone else's journey", async () => {
      repo.findOne.mockResolvedValue({ ...inProgressJourney });

      const result = await service.end('journey-1', 'some-admin-id', true);

      expect(result.status).toBe(JourneyStatus.COMPLETED);
    });

    it('refuses a non-owning, non-admin coordinator', async () => {
      repo.findOne.mockResolvedValue({ ...inProgressJourney });

      await expect(service.end('journey-1', 'someone-else', false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses to end a journey that is not in progress', async () => {
      repo.findOne.mockResolvedValue({ ...inProgressJourney, status: JourneyStatus.COMPLETED });

      await expect(service.end('journey-1', 'coord-1', false)).rejects.toThrow(ConflictException);
    });

    it('404s for an unknown journey id', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.end('no-such-id', 'coord-1', false)).rejects.toThrow(NotFoundException);
    });
  });
});
