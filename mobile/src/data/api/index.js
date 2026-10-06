import { apiBaseUrl } from '../../config/api';

import { createApiClient } from './client';

const api = createApiClient({ baseUrl: apiBaseUrl });

export const getHealth = api.getHealth;
export const getDiary = api.getDiary;
export { ApiError, createApiClient } from './client';
