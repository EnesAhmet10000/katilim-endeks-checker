import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { ComplianceService } from './services/compliance.service.js';
import { registerComplianceRoutes } from './controllers/compliance.controller.js';

export async function createServer() {
  const server = Fastify({
    disableRequestLogging: true,
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn'
    }
  });

  // Security & Middleware
  await server.register(cors, {
    origin: false
  });

  await server.register(helmet, {
    contentSecurityPolicy: false
  });

  await server.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow
  });

  const complianceService = new ComplianceService();

  // Root welcome route
  server.get('/', async () => {
    return {
      service: 'Katılım Finans Uygunluk Kontrolü API',
      version: '1.0.0',
      status: 'active',
      endpoints: {
        check: '/api/v1/compliance/check?q={symbol}',
        search: '/api/v1/instruments/search?q={query}',
        health: '/api/v1/health'
      }
    };
  });

  // Register API routes
  await registerComplianceRoutes(server, complianceService);

  return server;
}

export async function startServer() {
  const server = await createServer();
  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`🚀 Katılım Finans API running at http://${config.host}:${config.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Start when executed directly
if (process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts')) {
  startServer();
}
