import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ADMIN_ROLES, Role } from '../common/enums/role.enum';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { NearQueryDto } from './dto/near-query.dto';

const DASHBOARD_ROLES: Role[] = [...ADMIN_ROLES, Role.STAGE_LEADER, Role.VIEWER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Roles(Role.COORDINATOR)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLocationDto) {
    return this.locationsService.create(user.userId, dto);
  }

  @Roles(...DASHBOARD_ROLES)
  @Get('live')
  getLive() {
    return this.locationsService.getLiveLocations();
  }

  @Roles(...DASHBOARD_ROLES)
  @Get('by-journey/:journeyId')
  getRouteHistory(@Param('journeyId', ParseUUIDPipe) journeyId: string) {
    return this.locationsService.getRouteHistory(journeyId);
  }

  @Roles(...DASHBOARD_ROLES)
  @Get('near')
  findNear(@Query() query: NearQueryDto) {
    return this.locationsService.findCoordinatorsNear(query.lat, query.lng, query.radiusMeters);
  }
}
