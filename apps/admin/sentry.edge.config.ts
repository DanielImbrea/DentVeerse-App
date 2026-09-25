import { initNextjsMonitoring } from '@dental/monitoring/nextjs';

// Covers errors in middleware.ts (Edge runtime), including any failure in
// the session-refresh logic added this session for the admin security fix.
initNextjsMonitoring('admin');
