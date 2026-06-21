import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ADMIN_ROLES, Role } from '../common/enums/role.enum';
import { RoutesService } from './routes.service';
import { GetRouteQueryDto } from './dto/get-route-query.dto';

const AUTHORIZED_ROLES: Role[] = [...ADMIN_ROLES, Role.STAGE_LEADER, Role.COORDINATOR];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Roles(...AUTHORIZED_ROLES)
  @Get('optimize')
  async getOptimizedRoute(@Query() query: GetRouteQueryDto) {
    return this.routesService.getOptimizedRoute(
      { latitude: query.originLat, longitude: query.originLng },
      { latitude: query.destLat, longitude: query.destLng },
      query.includeAlternatives ?? true,
    );
  }

  @Roles(...AUTHORIZED_ROLES)
  @Get('traffic')
  async getTrafficData(@Query() query: GetRouteQueryDto) {
    return this.routesService.getTrafficData(
      { latitude: query.originLat, longitude: query.originLng },
      { latitude: query.destLat, longitude: query.destLng },
    );
  }
}
