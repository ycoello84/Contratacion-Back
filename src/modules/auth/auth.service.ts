import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtPayload } from './strategies/jwt.strategy.js';
import type { AuthResponse, AuthUserPayload } from './dto/auth-response.dto.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.activo) {
      throw new UnauthorizedException('El usuario se encuentra inactivo.');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const expiresIn = this.configService.get<number>('jwt.expiresIn') ?? 3600;

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.toPayload(user.id, user.email, user.nombre, user.rol),
    };
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado.`);
    }

    const passwordMatches = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual.',
      );
    }

    await this.usersService.update(userId, {
      password: changePasswordDto.newPassword,
    });

    return { message: 'Contraseña actualizada correctamente.' };
  }

  toPayload(
    id: number,
    email: string,
    nombre: string,
    rol: AuthenticatedUser['rol'],
  ): AuthUserPayload {
    return { id, email, nombre, rol };
  }
}
