import 'module-alias/register';
import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { API_PREFIX } from './constants';
import { setupSwagger, createValidationPipe } from './config';
import { HttpExceptionFilter, SuccessInterceptor } from './common';
import { UserService } from './modules/user/user.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('port', 3000);

  app.enableCors({ origin: config.get('corsOrigin') || true, credentials: true });
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new SuccessInterceptor());

  setupSwagger(app);

  let actualPort = port;
  try {
    await app.listen(port);
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE' && port === 3000) {
      actualPort = 3001;
      await app.listen(actualPort);
      console.warn(`\n  Port 3000 was in use, listening on ${actualPort}. Set PORT in .env to fix.\n`);
    } else {
      if (err?.code === 'EADDRINUSE') {
        console.error(`\n  Port ${port} is already in use. Set PORT in .env or run: lsof -ti :${port} | xargs kill\n`);
      }
      throw err;
    }
  }

  const userService = app.get(UserService);
  const superUser = await userService.createSuperUserIfNotExists();

  const base = `http://localhost:${actualPort}`;
  console.log(`\n  Application: ${base}`);
  console.log(`  API:         ${base}/${API_PREFIX}`);
  console.log(`  Docs:        ${base}/docs`);
  if (superUser) {
    console.log(`  Super user:  ${superUser.email}`);
  }
  console.log('');
}
bootstrap();
