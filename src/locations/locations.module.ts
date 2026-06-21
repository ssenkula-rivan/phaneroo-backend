import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { LocationPing } from './entities/location-ping.entity';
import { Journey } from '../journeys/entities/journey.entity';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { LocationsGateway } from './locations.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationPing, Journey]),

    JwtModule.register({}),
  ],
  providers: [LocationsService, LocationsGateway],
  controllers: [LocationsController],
  exports: [LocationsService],
})
export class LocationsModule {}
