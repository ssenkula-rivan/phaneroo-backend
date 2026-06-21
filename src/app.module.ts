import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { JourneysModule } from './journeys/journeys.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RoutesModule } from './routes/routes.module';
import { HealthModule } from './health/health.module';

import { User } from './users/entities/user.entity';
import { CoordinatorProfile } from './users/entities/coordinator-profile.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { Vehicle } from './vehicles/entities/vehicle.entity';
import { VehicleAssignment } from './vehicles/entities/vehicle-assignment.entity';
import { Journey } from './journeys/entities/journey.entity';
import { LocationPing } from './locations/entities/location-ping.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('throttle.ttlSeconds', 60),
        limit: config.get<number>('throttle.limit', 100),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get<string>('database.type') as 'sqlite' | 'postgres';
        const isDev = config.get<string>('nodeEnv') === 'development';

        const baseConfig: any = {
          entities: [
            User,
            CoordinatorProfile,
            RefreshToken,
            Vehicle,
            VehicleAssignment,
            Journey,
            LocationPing,
          ],
          retryAttempts: 10,
          retryDelay: 3000,
          synchronize: isDev,
          logging: isDev ? ['error', 'warn'] : ['error'],
        };

        if (dbType === 'sqlite') {
          return {
            ...baseConfig,
            type: 'sqlite',
            database: config.get<string>('database.database'),
          };
        } else {
          return {
            ...baseConfig,
            type: 'postgres',
            host: config.get<string>('database.host'),
            port: config.get<number>('database.port'),
            username: config.get<string>('database.username'),
            password: config.get<string>('database.password'),
            database: config.get<string>('database.database'),
            ssl: config.get<boolean>('database.ssl'),
          };
        }
      },
    }),
    AuthModule,
    UsersModule,
    VehiclesModule,
    JourneysModule,
    LocationsModule,
    NotificationsModule,
    RoutesModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
