import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: Reads allowed origins from FRONTEND_URL env var.
  // In production, set FRONTEND_URL to your deployed frontend domain (e.g. https://myapp.com).
  // Multiple origins can be separated by commas: "https://app1.com,https://app2.com"
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins = frontendUrl
    ? frontendUrl.split(',').map((url) => url.trim())
    : true; // Allow all origins if not specified (dev fallback)

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  
  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Backend running on port ${port}`);
  console.log(`CORS allowed origins: ${frontendUrl || 'ALL (dev mode)'}`);
}
bootstrap();
