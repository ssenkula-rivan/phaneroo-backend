import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { User } from '../users/entities/user.entity';
import { Journey } from '../journeys/entities/journey.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Journey]),
    JwtModule,
  ],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
