import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('apiPrefix') ?? '';
  const port = configService.get<number>('port') ?? 3000;
  const corsOrigin = configService.get<string[]>('cors.origin') ?? ['*'];

  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: corsOrigin,
    credentials: !corsOrigin.includes('*'),
  });

  app.enableShutdownHooks();

  await app.listen(port);

  Logger.log(
    `API de contratación disponible en http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
}

await bootstrap();
