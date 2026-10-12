import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ComplianceService } from '../services/compliance.service.js';

interface CheckQuery {
  q?: string;
  query?: string;
  refresh?: string | boolean;
}

interface SearchQuery {
  q?: string;
  limit?: string;
}

export async function registerComplianceRoutes(server: FastifyInstance, complianceService: ComplianceService) {
  // Check compliance: GET /api/v1/compliance/check?q=TOASO
  server.get('/api/v1/compliance/check', async (request: FastifyRequest<{ Querystring: CheckQuery }>, reply: FastifyReply) => {
    const rawQuery = request.query.q || request.query.query;
    const forceRefresh = request.query.refresh === 'true' || request.query.refresh === true;

    if (!rawQuery || rawQuery.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'Sorgu parametresi (q) eksik.',
        executionTimeMs: 0
      });
    }

    try {
      const response = await complianceService.check(rawQuery, forceRefresh);
      return reply.status(200).send(response);
    } catch (err: any) {
      server.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'Katılım uygunluğu kontrol edilirken bir sunucu hatası oluştu.',
        details: err.message
      });
    }
  });

  // Autocomplete search: GET /api/v1/instruments/search?q=TOA
  server.get('/api/v1/instruments/search', async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
    const q = request.query.q || '';
    const limit = Number(request.query.limit) || 8;

    const results = complianceService.search(q, limit);
    return reply.status(200).send({
      query: q,
      results
    });
  });

  // Health and Adapter Diagnostics: GET /api/v1/health
  server.get('/api/v1/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const health = complianceService.getHealth();
    return reply.status(200).send({
      status: 'degraded',
      version: '1.1.0',
      timestamp: new Date().toISOString(),
      adapters: health
    });
  });
}
