import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user-role.enum.js';

export const ROLES_KEY = 'roles';

/**
 * Restringe el acceso a las rutas a los roles indicados.
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
