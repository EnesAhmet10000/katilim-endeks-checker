export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  cache: {
    instrumentMetadataTtlMs: 24 * 60 * 60 * 1000, // 24 hours
    stockComplianceTtlMs: 2 * 60 * 60 * 1000,     // 2 hours
    fundComplianceTtlMs: 6 * 60 * 60 * 1000,      // 6 hours
    maxItems: 5000
  },
  rateLimit: {
    max: 100, // max 100 requests per minute per IP
    timeWindow: '1 minute'
  },
  cors: {
    origin: '*'
  }
};
