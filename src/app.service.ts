import { Injectable } from '@nestjs/common';

export interface AppInfo {
  nombre: string;
  version: string;
  descripcion: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

@Injectable()
export class AppService {
  getInfo(): AppInfo {
    return {
      nombre: 'contratacion-back',
      version: '0.0.1',
      descripcion: 'API REST para la gestión de contratación, empresas, contratos, reuniones y trabajadores.',
      timestamp: new Date().toISOString(),
    };
  }

  getHealth(): HealthStatus {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
