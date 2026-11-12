import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { configuration } from '../config/configuration.js';
import { User } from '../modules/users/entities/user.entity.js';
import { UserRole } from '../modules/users/entities/user-role.enum.js';

async function run(): Promise<void> {
  const config = configuration();

  const dataSource = new DataSource({
    type: 'mysql',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    entities: [User],
    synchronize: false,
    logging: config.database.logging,
  });

  await dataSource.initialize();

  try {
    const repository = dataSource.getRepository(User);
    const email = config.seed.adminEmail.toLowerCase();
    const existing = await repository.findOne({ where: { email } });

    if (existing) {
      console.log(`El usuario administrador ya existe: ${email} (id=${existing.id}).`);
      return;
    }

    const user = repository.create({
      email,
      name: config.seed.adminNombre,
      role: UserRole.ADMIN,
      active: true,
      passwordHash: await bcrypt.hash(config.seed.adminPassword, 10),
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
