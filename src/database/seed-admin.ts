import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity.js';
import { UserRole } from '../modules/users/entities/user-role.enum.js';

async function run(): Promise<void> {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3307),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? 'rootpassword',
    database: process.env.DB_DATABASE ?? 'contratacion_db',
    entities: [User],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
  });

  await dataSource.initialize();

  try {
    const repository = dataSource.getRepository(User);
    const email = (process.env.SEED_ADMIN_EMAIL ?? 'contrahlg@gmail.com').toLowerCase();
    const existing = await repository.findOne({ where: { email } });

    if (existing) {
      console.log(`El usuario administrador ya existe: ${email} (id=${existing.id}).`);
      return;
    }

    const user = repository.create({
      email,
      name: process.env.SEED_ADMIN_NOMBRE ?? 'Administrador del sitio',
      role: UserRole.ADMIN,
      active: true,
      passwordHash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*', 10),
    });

    const saved = await repository.save(user);
    console.log(`Usuario administrador creado: ${saved.email} (id=${saved.id}).`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error: unknown) => {
  console.error('Error al ejecutar el seed del administrador:', error);
  process.exitCode = 1;
});