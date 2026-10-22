import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global de DTOs con sanitización de campos extras
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Removemos las propiedades no definidas en los DTOs
      forbidNonWhitelisted: true, // Lanzamos error si se envían propiedades no permitidas
      transform: true, // Transformamos tipos automáticamente (ej. string a number)
    }),
  );

  await app.listen(3000);
}
bootstrap();
