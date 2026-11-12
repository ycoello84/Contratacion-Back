import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from './entities/user-role.enum.js';
import { UsersService } from './users.service.js';

@Injectable()
export class UsersSeedService implements OnModuleInit {
  private readonly logger = new Logger(UsersSeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdminUser();
  }

  async seedAdminUser(): Promise<void> {
    const email = this.configService.get<string>('seed.adminEmail');
    const password = this.configService.get<string>('seed.adminPassword');
    const name = this.configService.get<string>('seed.adminNombre');

    if (!email || !password || !name) {
      this.logger.warn(
        'Seed de administrador omitido: faltan SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD o SEED_ADMIN_NOMBRE.',
      );
      return;
    }

    const existing = await this.usersService.findByEmailWithPassword(email);

    if (existing) {
      this.logger.log(`Usuario administrador seed ya existe (${email}).`);
      return;
    }

    await this.usersService.create({
      email,
      password,
      name,
      role: UserRole.ADMIN,
      active: true,
    });

    this.logger.warn(
      `Usuario administrador seed creado (${email}). Cambie la contraseña si es necesario.`,
    );
  }
}
