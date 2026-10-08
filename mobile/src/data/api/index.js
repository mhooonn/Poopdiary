
import { apiBaseUrl } from '../../config/api';
import { createApiClient } from './client';

const api = createApiClient({ baseUrl: apiBaseUrl });

export const getHealth = api.getHealth;
export const getDiary = api.getDiary;

// Food API
export const listFood = api.listFood;
export const createFood = api.createFood;
export const updateFood = api.updateFood;
export const deleteFood = api.deleteFood;

// Bowel API
export const listBowel = api.listBowel;
export const getBowel = api.getBowel;
export const createBowel = api.createBowel;
export const updateBowel = api.updateBowel;
export const deleteBowel = api.deleteBowel;

export { ApiError, createApiClient } from './client';
