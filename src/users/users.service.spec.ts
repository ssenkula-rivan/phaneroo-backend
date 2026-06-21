import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CoordinatorProfile } from './entities/coordinator-profile.entity';
import { Role } from '../common/enums/role.enum';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let profilesRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((entity) => entity),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'user-1', ...entity })),
      createQueryBuilder: jest.fn(),
    };
    profilesRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((entity) => entity),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(CoordinatorProfile), useValue: profilesRepo },
        { provide: ConfigService, useValue: { get: () => 4 } },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    const viewerDto = {
      email: 'viewer@phaneroo.example.org',
      phoneNumber: '+256700000010',
      fullName: 'View Only',
      password: 'Password123!',
      role: Role.VIEWER,
    };

    it('creates a non-coordinator user with no profile row', async () => {
      usersRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'user-1', ...viewerDto, coordinatorProfile: null });

      const result = await service.create(viewerDto as any);

      expect(result.id).toBe('user-1');
      expect(profilesRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a duplicate email or phone number', async () => {
      usersRepo.findOne.mockResolvedValueOnce({ id: 'existing' });

      await expect(service.create(viewerDto as any)).rejects.toThrow(ConflictException);
      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('requires coordinatorCode/district/region when role is coordinator', async () => {
      usersRepo.findOne.mockResolvedValueOnce(null);
      const incompleteCoordinatorDto = { ...viewerDto, role: Role.COORDINATOR };

      await expect(service.create(incompleteCoordinatorDto as any)).rejects.toThrow(
        ConflictException,
      );
      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a coordinatorCode that is already in use', async () => {
      usersRepo.findOne.mockResolvedValueOnce(null);
      profilesRepo.findOne.mockResolvedValueOnce({ id: 'profile-x' });

      const coordinatorDto = {
        ...viewerDto,
        role: Role.COORDINATOR,
        coordinatorCode: 'CRD-001',
        district: 'Kampala',
        region: 'Central',
      };

      await expect(service.create(coordinatorDto as any)).rejects.toThrow(ConflictException);
      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('creates a coordinator user together with its profile row', async () => {
      usersRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-1',
          coordinatorProfile: { coordinatorCode: 'CRD-001' },
        });
      profilesRepo.findOne.mockResolvedValueOnce(null);

      const coordinatorDto = {
        ...viewerDto,
        role: Role.COORDINATOR,
        coordinatorCode: 'CRD-001',
        district: 'Kampala',
        region: 'Central',
      };

      const result = await service.create(coordinatorDto as any);

      expect(profilesRepo.save).toHaveBeenCalledTimes(1);
      expect(result.coordinatorProfile?.coordinatorCode).toBe('CRD-001');
    });
  });

  describe('findById', () => {
    it('throws NotFound for an unknown id', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('no-such-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('sets isActive to false via update()', async () => {
      const existingUser = { id: 'user-1', isActive: true, coordinatorProfile: null };
      usersRepo.findOne
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce({ ...existingUser, isActive: false });

      const result = await service.deactivate('user-1');

      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
      expect(result.isActive).toBe(false);
    });
  });
});
