import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CoordinatorProfile } from '../users/entities/coordinator-profile.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { VehicleAssignment } from '../vehicles/entities/vehicle-assignment.entity';
import { Journey } from '../journeys/entities/journey.entity';
import { LocationPing } from '../locations/entities/location-ping.entity';

dotenv.config();

const dbType = (process.env.DB_TYPE || 'postgres') as 'postgres' | 'sqlite';

const dataSourceOptions: any = {
  type: dbType,
  entities: [
    User,
    CoordinatorProfile,
    RefreshToken,
    Vehicle,
    VehicleAssignment,
    Journey,
    LocationPing,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

if (dbType === 'sqlite') {
  dataSourceOptions.database = process.env.DB_DATABASE || './data/phaneroo.sqlite';
} else {
  dataSourceOptions.host = process.env.DB_HOST;
  dataSourceOptions.port = parseInt(process.env.DB_PORT ?? '5432', 10);
  dataSourceOptions.username = process.env.DB_USERNAME;
  dataSourceOptions.password = process.env.DB_PASSWORD;
  dataSourceOptions.database = process.env.DB_DATABASE;
  dataSourceOptions.ssl = process.env.DB_SSL === 'true';
}

export const AppDataSource = new DataSource(dataSourceOptions);
