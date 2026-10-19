import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { UserRole } from '../../users/entities/user-role.enum.js';
import { UsersService } from '../../users/users.service.js';

export interface JwtPayload {
  sub: number;
  email: string;
  nombre: string;
  rol: UserRole;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') as string,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findEntityById(payload.sub);

    if (!user || !user.activo) {
      throw new UnauthorizedException(
        'El usuario no existe o se encuentra inactivo.',
      );
    }

    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    };
  }
}
