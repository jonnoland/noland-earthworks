/**
 * Type-only exports for external consumers (e.g. the Noland Field mobile app).
 * Import from this file instead of routers.ts to avoid pulling in server runtime
 * dependencies into non-server TypeScript projects.
 */
export type { AppRouter } from "./routers";
