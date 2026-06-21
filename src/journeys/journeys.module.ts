import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Journey } from './entities/journey.entity';
import { JourneysService } from './journeys.service';
import { JourneysController } from './journeys.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Journey])],
  providers: [JourneysService],
  controllers: [JourneysController],
  exports: [JourneysService],
})
export class JourneysModule {}
