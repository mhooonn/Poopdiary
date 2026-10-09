
import { apiBaseUrl } from '../../config/api';
import { createApiClient } from './client';

const api = createApiClient({ baseUrl: apiBaseUrl });

export const getHealth = api.getHealth;

// Food API
export const listFood = api.listFood;
export const createFood = api.createFood;
export const updateFood = api.updateFood;
export const deleteFood = api.deleteFood;

// Drinks API
export const listDrinks = api.listDrinks;
export const getDrink = api.getDrink;
export const createDrink = api.createDrink;
export const updateDrink = api.updateDrink;
export const deleteDrink = api.deleteDrink;

// Bowel API
export const listBowel = api.listBowel;
export const getBowel = api.getBowel;
export const createBowel = api.createBowel;
export const updateBowel = api.updateBowel;
export const deleteBowel = api.deleteBowel;

export { ApiError, createApiClient } from './client';
