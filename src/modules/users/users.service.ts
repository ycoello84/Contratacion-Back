import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
} from '../../common/dto/pagination.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { FindUsersQueryDto } from './dto/find-users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';
import { UserRole } from './entities/user-role.enum.js';

const SALT_ROUNDS = 10;

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async count(): Promise<number> {
    return this.repository.count();
  }

  async create(dto: CreateUserDto): Promise<SafeUser> {
    await this.ensureEmailIsAvailable(dto.email);

    const user = this.repository.create({
      email: dto.email,
      name: dto.name,
      role: dto.role ?? UserRole.LECTOR,
      active: dto.active ?? true,
      passwordHash: await bcrypt.hash(dto.password, SALT_ROUNDS),
    });

    const saved = await this.repository.save(user);
    return this.toSafeUser(saved);
  }

  async findAll(query: FindUsersQueryDto): Promise<PaginatedResult<SafeUser>> {
    const qb = this.repository.createQueryBuilder('user');

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.active !== undefined) {
      qb.andWhere('user.active = :active', { active: query.active });
    }

    if (query.search) {
      qb.andWhere('(user.name LIKE :search OR user.email LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [users, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .take(query.limit)
      .skip(query.skip)
      .getManyAndCount();

    return buildPaginatedResult(
      users.map((user) => this.toSafeUser(user)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: number): Promise<SafeUser> {
    const user = await this.repository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado.`);
    }

    return this.toSafeUser(user);
  }

  async findEntityById(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdWithPassword(id: number): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async update(id: number, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.repository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado.`);
    }

    if (dto.email && dto.email !== user.email) {
      await this.ensureEmailIsAvailable(dto.email, id);
      user.email = dto.email;
    }

    if (dto.name !== undefined) {
      user.name = dto.name;
    }

    if (dto.role !== undefined) {
      user.role = dto.role;
    }

    if (dto.active !== undefined) {
      user.active = dto.active;
    }

    if (dto.password !== undefined) {
      user.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    const saved = await this.repository.save(user);
    return this.toSafeUser(saved);
  }

  /**
   * Baja lógica: el usuario se desactiva pero se conserva el histórico.
   */
  async deactivate(id: number): Promise<SafeUser> {
    const user = await this.repository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado.`);
    }

    user.active = false;
    const saved = await this.repository.save(user);
    return this.toSafeUser(saved);
  }

  private async ensureEmailIsAvailable(email: string, ignoreId?: number): Promise<void> {
    const existing = await this.repository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(`El email ${email} ya está registrado.`);
    }
  }

  private toSafeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
