/**
 * src/services/api.ts
 *
 * Backward-compatibility re-export barrel.
 * All existing `import { api } from '@/services/api'` calls continue to work.
 *
 * Source of truth: @/services/http/ApiClient.ts
 */
export { httpClient as api, ApiError, TokenStore as tokenStore } from './http/ApiClient';

