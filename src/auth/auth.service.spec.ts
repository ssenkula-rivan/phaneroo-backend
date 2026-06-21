import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { Role } from '../common/enums/role.enum';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let refreshTokenRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  const activeUserFixture = (passwordHash: string) => ({
    id: 'user-1',
    email: 'grace@phaneroo.example.org',
    fullName: 'Grace Achieng',
    role: Role.COORDINATOR,
    isActive: true,
    passwordHash,
  });

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), findById: jest.fn() };
    refreshTokenRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((entity) => entity),
      update: jest.fn(),
    };

    const configValues: Record<string, string> = {
      'jwt.accessSecret': 'test-access-secret',
      'jwt.accessExpiresIn': '15m',
      'jwt.refreshExpiresIn': '7d',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed.jwt.token') } },
        { provide: ConfigService, useValue: { get: (key: string) => configValues[key] } },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('validateCredentials', () => {
    it('returns the user when the password matches', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      usersService.findByEmail.mockResolvedValue(activeUserFixture(hash));

      const user = await service.validateCredentials(
        'grace@phaneroo.example.org',
        'correct-password',
      );

      expect(user.email).toBe('grace@phaneroo.example.org');
    });

    it('throws Unauthorized for a wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      usersService.findByEmail.mockResolvedValue(activeUserFixture(hash));

      await expect(
        service.validateCredentials('grace@phaneroo.example.org', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws the SAME error for a non-existent user as for a wrong password (no enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateCredentials('nobody@phaneroo.example.org', 'whatever'),
      ).rejects.toThrow('Invalid email or password');
    });

    it('rejects a deactivated user even with the correct password', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      usersService.findByEmail.mockResolvedValue({ ...activeUserFixture(hash), isActive: false });

      await expect(
        service.validateCredentials('grace@phaneroo.example.org', 'correct-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('issues an access token and a refresh token, and persists the hashed refresh token', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      usersService.findByEmail.mockResolvedValue(activeUserFixture(hash));

      const result = await service.login('grace@phaneroo.example.org', 'correct-password');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toHaveLength(128);
      expect(result.expiresIn).toBe(900);
      expect(refreshTokenRepo.save).toHaveBeenCalledTimes(1);
      const saved = refreshTokenRepo.save.mock.calls[0][0];
      expect(saved.tokenHash).not.toBe(result.refreshToken);
      expect(saved.userId).toBe('user-1');
    });
  });

  describe('refresh', () => {
    it('rotates a valid token: issues new tokens and revokes the old one', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        tokenHash: 'irrelevant-since-mocked',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86_400_000),
      });
      usersService.findById.mockResolvedValue(activeUserFixture('unused-hash'));

      const result = await service.refresh('some-raw-refresh-token');

      expect(result.accessToken).toBe('signed.jwt.token');
      const revocationCall = refreshTokenRepo.save.mock.calls.find((args) => args[0].revokedAt);
      expect(revocationCall).toBeDefined();
      expect(revocationCall![0].revokedAt).toBeInstanceOf(Date);
    });

    it('rejects an expired token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        tokenHash: 'x',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an already-revoked token (replay attempt)', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        tokenHash: 'x',
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86_400_000),
      });

      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token whose user has since been deactivated', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        tokenHash: 'x',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86_400_000),
      });
      usersService.findById.mockResolvedValue({ ...activeUserFixture('h'), isActive: false });

      await expect(service.refresh('some-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('marks the matching refresh token as revoked', async () => {
      await service.logout('some-refresh-token');

      expect(refreshTokenRepo.update).toHaveBeenCalledTimes(1);
      const [where, patch] = refreshTokenRepo.update.mock.calls[0];
      expect(where).toHaveProperty('tokenHash');
      expect(patch.revokedAt).toBeInstanceOf(Date);
    });
  });
});
