import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ADMIN_ROLES, Role } from '../common/enums/role.enum';
import { LocationCreatedEvent } from './locations.service';

const DASHBOARD_ROLES: Role[] = [...ADMIN_ROLES, Role.STAGE_LEADER, Role.VIEWER];

interface SocketUser {
  userId: string;
  role: Role;
}

@WebSocketGateway({ namespace: '/tracking', cors: { origin: true, credentials: true } })
export class LocationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('LocationsGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`Socket ${client.id} connected with no token - disconnecting`);
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });
      (client.data as { user: SocketUser }).user = { userId: payload.sub, role: payload.role };
    } catch {
      this.logger.warn(`Socket ${client.id} presented an invalid/expired token - disconnecting`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeDashboard')
  handleSubscribeDashboard(client: Socket): { joined?: string; error?: string } {
    const user = (client.data as { user?: SocketUser }).user;
    if (!user || !DASHBOARD_ROLES.includes(user.role)) {
      return { error: 'Not authorized to subscribe to the dashboard feed' };
    }
    client.join('dashboard');
    return { joined: 'dashboard' };
  }

  @OnEvent('location.created')
  handleLocationCreated(payload: LocationCreatedEvent): void {
    this.server.to('dashboard').emit('location:update', payload);
  }

  private extractToken(client: Socket): string | undefined {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    const header = client.handshake.headers.authorization;
    const fromHeader = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    return fromAuth ?? fromHeader;
  }
}
