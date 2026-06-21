import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ADMIN_ROLES, Role } from '../common/enums/role.enum';
import { JourneysService } from './journeys.service';
import { StartJourneyDto } from './dto/start-journey.dto';
import { ListJourneysQueryDto } from './dto/list-journeys-query.dto';
import { BulkUpdateJourneysDto } from './dto/bulk-update-journeys.dto';

const READ_ROLES: Role[] = [...ADMIN_ROLES, Role.STAGE_LEADER, Role.VIEWER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('journeys')
export class JourneysController {
  constructor(private readonly journeysService: JourneysService) {}

  @Roles(Role.COORDINATOR, ...ADMIN_ROLES)
  @Post('start')
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartJourneyDto) {
    return this.journeysService.start(user.userId, dto);
  }

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: ListJourneysQueryDto) {
    return this.journeysService.list(query);
  }

  @Roles(...ADMIN_ROLES)
  @Patch('bulk')
  bulkUpdate(@Body() dto: BulkUpdateJourneysDto) {
    return this.journeysService.bulkUpdateStatus(dto.ids, dto.status);
  }

  @Roles(...READ_ROLES)
  @Get('active')
  listActive() {
    return this.journeysService.listActive();
  }

  @Get('mine/active')
  findMyActive(@CurrentUser() user: AuthenticatedUser) {
    return this.journeysService.findActiveForCoordinator(user.userId);
  }

  @Roles(Role.COORDINATOR, ...ADMIN_ROLES)
  @Post(':id/end')
  end(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const isAdmin = (ADMIN_ROLES as string[]).includes(user.role);
    return this.journeysService.end(id, user.userId, isAdmin);
  }

  @Roles(...READ_ROLES)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.journeysService.findById(id);
  }
}
