import { UserRole } from '../../users/entities/user-role.enum.js';

export interface AuthUserPayload {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUserPayload;
}
