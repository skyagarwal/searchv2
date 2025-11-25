import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });
  
  const config = app.get(ConfigService);
  const port = parseInt(config.get<string>('PORT') || '3100', 10);

  // Enable global validation pipes for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup comprehensive Swagger documentation
  setupSwagger(app);

  await app.listen(port);
  
  // eslint-disable-next-line no-console
  console.log(`🚀 Search API listening on http://localhost:${port}`);
  console.log(`📚 API Documentation available at http://localhost:${port}/api-docs`);
  console.log(`📄 OpenAPI JSON available at http://localhost:${port}/api-docs-json`);
  console.log(`🔧 Legacy docs available at http://localhost:${port}/docs`);
}

bootstrap();
