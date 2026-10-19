import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

type RequestWithUser = Request & { user?: AuthenticatedUser };

/**
 * Inyecta el usuario autenticado (o una de sus propiedades) en el controlador.
 */
export const CurrentUser = createParamDecorator(
  (property: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return property ? user[property] : user;
  },
);
