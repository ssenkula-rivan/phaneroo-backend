import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteSegment {
  distance: number;
  duration: number;
  trafficDelay?: number;
  instructions?: string;
}

export interface OptimizedRoute {
  distance: number;
  duration: number;
  trafficCondition: 'light' | 'moderate' | 'heavy';
  segments: RouteSegment[];
  polyline: string;
  alternativeRoutes?: OptimizedRoute[];
}

@Injectable()
export class RoutesService {
  private readonly logger = new Logger('RoutesService');

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async getOptimizedRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    includeAlternatives = true,
  ): Promise<OptimizedRoute> {
    const googleMapsApiKey = this.configService.get<string>('maps.googleApiKey');

    if (!googleMapsApiKey) {
      this.logger.warn('Google Maps API key not configured, returning direct route');
      return this.getDirectRoute(origin, destination);
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/directions/json';
      const params = {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        departure_time: 'now',
        traffic_model: 'best_guess',
        alternatives: includeAlternatives,
        key: googleMapsApiKey,
      };

      const response = await firstValueFrom(this.httpService.get<AxiosResponse>(url, { params }));
      const data: any = (response as any).data;

      if (data.status !== 'OK' || !data.routes?.length) {
        this.logger.warn(`Google Directions API returned: ${data.status}`);
        return this.getDirectRoute(origin, destination);
      }

      const mainRoute = data.routes[0];
      const leg = mainRoute.legs[0];

      const trafficCondition = this.determineTrafficCondition(
        leg.duration.value,
        leg.duration_in_traffic?.value,
      );

      const optimizedRoute: OptimizedRoute = {
        distance: leg.distance.value,
        duration: leg.duration_in_traffic?.value ?? leg.duration.value,
        trafficCondition,
        segments: leg.steps.map((step: any) => ({
          distance: step.distance.value,
          duration: step.duration.value,
          instructions: step.html_instructions,
        })),
        polyline: mainRoute.overview_polyline.points,
      };

      if (includeAlternatives && data.routes.length > 1) {
        optimizedRoute.alternativeRoutes = data.routes.slice(1).map((route: any) => {
          const altLeg = route.legs[0];
          return {
            distance: altLeg.distance.value,
            duration: altLeg.duration_in_traffic?.value ?? altLeg.duration.value,
            trafficCondition: this.determineTrafficCondition(
              altLeg.duration.value,
              altLeg.duration_in_traffic?.value,
            ),
            segments: altLeg.steps.map((step: any) => ({
              distance: step.distance.value,
              duration: step.duration.value,
              instructions: step.html_instructions,
            })),
            polyline: route.overview_polyline.points,
          };
        });
      }

      return optimizedRoute;
    } catch (error) {
      this.logger.error('Failed to fetch route from Google Maps', error);
      return this.getDirectRoute(origin, destination);
    }
  }

  async getTrafficData(
    origin: RoutePoint,
    destination: RoutePoint,
  ): Promise<{ trafficCondition: string; estimatedDelay: number }> {
    const route = await this.getOptimizedRoute(origin, destination, false);
    const baselineDuration = this.calculateHaversineDistance(origin, destination) / 50 * 3600;
    const estimatedDelay = Math.max(0, route.duration - baselineDuration);

    return {
      trafficCondition: route.trafficCondition,
      estimatedDelay,
    };
  }

  private getDirectRoute(origin: RoutePoint, destination: RoutePoint): OptimizedRoute {
    const distance = this.calculateHaversineDistance(origin, destination);
    const duration = (distance / 50) * 3600;

    return {
      distance,
      duration,
      trafficCondition: 'light',
      segments: [
        {
          distance,
          duration,
          instructions: 'Direct route to destination',
        },
      ],
      polyline: this.encodePolyline([origin, destination]),
    };
  }

  private calculateHaversineDistance(point1: RoutePoint, point2: RoutePoint): number {
    const R = 6371e3;
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLng = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private determineTrafficCondition(
    baselineDuration: number,
    trafficDuration?: number,
  ): 'light' | 'moderate' | 'heavy' {
    if (!trafficDuration) return 'light';

    const delay = trafficDuration - baselineDuration;
    const delayPercent = (delay / baselineDuration) * 100;

    if (delayPercent > 50) return 'heavy';
    if (delayPercent > 20) return 'moderate';
    return 'light';
  }

  private encodePolyline(points: RoutePoint[]): string {
    let result = '';
    let prevLat = 0;
    let prevLng = 0;

    for (const point of points) {
      const lat = Math.round(point.latitude * 1e5);
      const lng = Math.round(point.longitude * 1e5);

      result += this.encodeNumber(lat - prevLat);
      result += this.encodeNumber(lng - prevLng);

      prevLat = lat;
      prevLng = lng;
    }

    return result;
  }

  private encodeNumber(num: number): string {
    let encoded = '';
    let value = num < 0 ? ~(num << 1) : num << 1;

    while (value >= 0x20) {
      encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
      value >>= 5;
    }

    encoded += String.fromCharCode(value + 63);
    return encoded;
  }
}
