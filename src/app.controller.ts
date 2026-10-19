import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator.js';
import { AppService } from './app.service.js';
import type { AppInfo, HealthStatus } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getInfo(): AppInfo {
    return this.appService.getInfo();
  }

  @Public()
  @Get('health')
  getHealth(): HealthStatus {
    return this.appService.getHealth();
  }
}
