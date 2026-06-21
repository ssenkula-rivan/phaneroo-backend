import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';

interface OAuthLoginDto {
  idToken: string;
  provider: string;
  email: string;
  fullName: string;
}

interface OAuthRegisterDto {
  idToken: string;
  provider: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  region: string;
  district: string;
  stageName?: string;
  role: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Throttle(3, 60_000)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    const { accessToken, refreshToken, expiresIn } = await this.authService.login(
      user.email,
      dto.password,
    );
    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  }

  @Throttle(5, 60_000)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const { accessToken, refreshToken, expiresIn, user } = await this.authService.login(
      dto.email,
      dto.password,
    );
    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  }

  @Throttle(5, 60_000)
  @Post('oauth/login')
  @HttpCode(HttpStatus.OK)
  async oauthLogin(@Body() dto: OAuthLoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new Error('User not found. Please register first.');
    }
    const tokens = await this.authService.generateTokens(user.id, user.email, user.role);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  }

  @Throttle(3, 60_000)
  @Post('oauth/register')
  @HttpCode(HttpStatus.CREATED)
  async oauthRegister(@Body() dto: OAuthRegisterDto) {
    const createDto: CreateUserDto = {
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      fullName: dto.fullName,
      password: Math.random().toString(36).slice(-16),
      role: dto.role as Role,
      region: dto.region,
      district: dto.district,
      stageName: dto.stageName,
    };
    const user = await this.usersService.create(createDto);
    const tokens = await this.authService.generateTokens(user.id, user.email, user.role);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
