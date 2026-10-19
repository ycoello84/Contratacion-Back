import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { FindUsersQueryDto } from './dto/find-users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserRole } from './entities/user-role.enum.js';
import { UsersService } from './users.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { SafeUser } from './users.service.js';

@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<SafeUser> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: FindUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SafeUser> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SafeUser> {
    if (currentUser.id === id) {
      if (updateUserDto.activo === false) {
        throw new BadRequestException(
          'No es posible desactivar la cuenta propia.',
        );
      }
      if (updateUserDto.rol && updateUserDto.rol !== currentUser.rol) {
        throw new BadRequestException(
          'No es posible modificar el rol de la cuenta propia.',
        );
      }
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SafeUser> {
    if (currentUser.id === id) {
      throw new BadRequestException('No es posible desactivar la cuenta propia.');
    }

    return this.usersService.deactivate(id);
  }
}
