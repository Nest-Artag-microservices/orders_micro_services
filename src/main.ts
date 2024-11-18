import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config/envs';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Main Orders MS');
  const app = await NestFactory.create(AppModule);
  await app.listen(envs.port);
  logger.log(`Application listening on port ${envs.port}`);
}
bootstrap();
