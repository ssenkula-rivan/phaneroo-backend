import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ADMIN_ROLES, Role } from '../common/enums/role.enum';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { AssignVehicleDto } from './dto/assign-vehicle.dto';

const READ_ROLES: Role[] = [...ADMIN_ROLES, Role.STAGE_LEADER, Role.VIEWER];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Roles(...ADMIN_ROLES)
  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Roles(...READ_ROLES)
  @Get()
  list(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.vehiclesService.list({
      status,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    });
  }

  @Roles(...READ_ROLES)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findById(id);
  }

  @Roles(...ADMIN_ROLES)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Post(':id/assign')
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignVehicleDto) {
    return this.vehiclesService.assign(id, dto.coordinatorUserId);
  }

  @Roles(...ADMIN_ROLES)
  @Post(':id/unassign')
  unassign(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.unassign(id);
  }

  @Roles(...READ_ROLES)
  @Get(':id/assignments')
  getAssignmentHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.getAssignmentHistory(id);
  }
}
