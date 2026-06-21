import {
  Body,
  Controller,
  Delete,
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
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ADMIN_ROLES, Role } from '../common/enums/role.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { BulkDeactivateUsersDto } from './dto/bulk-deactivate-users.dto';
import { BulkUpdateUsersDto } from './dto/bulk-update-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(...ADMIN_ROLES)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles(...ADMIN_ROLES, Role.STAGE_LEADER)
  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query);
  }

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.userId);
  }

  @Roles(...ADMIN_ROLES)
  @Patch('bulk')
  bulkUpdate(@Body() dto: BulkUpdateUsersDto) {
    const { ids, ...fields } = dto;
    return this.usersService.bulkUpdate(ids, fields);
  }

  @Roles(...ADMIN_ROLES)
  @Post('bulk/deactivate')
  bulkDeactivate(@Body() dto: BulkDeactivateUsersDto) {
    return this.usersService.bulkDeactivate(dto.ids);
  }

  @Roles(...ADMIN_ROLES)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(dto.userId, dto.newPassword);
  }

  @Roles(...ADMIN_ROLES)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Roles(...ADMIN_ROLES)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Delete(':id')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(id);
  }
}
