import { UserRole } from '../../modules/users/entities/user-role.enum.js';

export interface AuthenticatedUser {
  id: number;
  email: string;
  nombre: string;
  rol: UserRole;
}
