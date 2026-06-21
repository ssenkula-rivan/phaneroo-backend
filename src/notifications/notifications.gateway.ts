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
import { NotificationPayload } from './notifications.service';

interface SocketUser {
  userId: string;
  role: Role;
}

@WebSocketGateway({ namespace: '/notifications', cors: { origin: true, credentials: true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('NotificationsGateway');

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

  @SubscribeMessage('subscribeNotifications')
  handleSubscribeNotifications(client: Socket): { joined?: string; error?: string } {
    const user = (client.data as { user?: SocketUser }).user;
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return { error: 'Not authorized to subscribe to notifications' };
    }
    client.join('admin-notifications');
    return { joined: 'admin-notifications' };
  }

  @OnEvent('journey.started')
  @OnEvent('location.created')
  @OnEvent('journey.ended')
  handleNotification(payload: NotificationPayload): void {
    this.server.to('admin-notifications').emit('notification', payload);
  }

  private extractToken(client: Socket): string | undefined {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    const header = client.handshake.headers.authorization;
    const fromHeader = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    return fromAuth ?? fromHeader;
  }
}
