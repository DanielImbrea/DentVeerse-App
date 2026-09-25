import { initNextjsMonitoring } from '@dental/monitoring/nextjs';

// Server-side errors — critically, this is where Server Action failures
// (including any thrown by requireAdmin()'s UnauthorizedError, which is
// expected/benign and not itself a bug, vs. genuine unexpected errors in
// admin data queries) get reported. beforeSend in
// packages/monitoring/src/nextjs.ts strips auth headers before anything is
// sent, including from server-side captures.
initNextjsMonitoring('admin');
