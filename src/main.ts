import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  const config = new DocumentBuilder()
    .setTitle('API de Contratación')
    .setDescription(
      'Documentación oficial de los endpoints para el sistema de contratación',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);

  Logger.log(
    `API de contratación disponible en http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );

  Logger.log(
    `Swagger UI disponible en http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

await bootstrap();
