import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.get('PORT') || 3000;
    const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:5173';

    // Trust proxy (Cloudflare + Nginx)
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', 1);

    // Increase body size limit (default 100kb is too small for large contact lists)
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Security
    app.use(helmet());
    app.use(compression());

    // CORS
    app.enableCors({
        origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:5174', 'https://jolu.ai'],
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    // Global prefix
    app.setGlobalPrefix('api');

    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
