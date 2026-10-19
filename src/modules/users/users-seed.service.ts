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
    const total = await this.usersService.count();

    if (total > 0) {
      return;
    }

    const email = this.configService.get<string>('seed.adminEmail');
    const password = this.configService.get<string>('seed.adminPassword');
    const name = this.configService.get<string>('seed.adminNombre');

    await this.usersService.create({
      email: email as string,
      password: password as string,
      name: name as string,
      role: UserRole.ADMIN,
      active: true,
    });

    this.logger.warn(
      `Usuario administrador inicial creado (${email}). Cambie la contraseña en el primer acceso.`,
    );
  }
}
