
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

// Exercise API
export const listExercise = api.listExercise;
export const getExercise = api.getExercise;
export const createExercise = api.createExercise;
export const updateExercise = api.updateExercise;
export const deleteExercise = api.deleteExercise;

// Symptoms API
export const listSymptoms = api.listSymptoms;
export const getSymptom = api.getSymptom;
export const createSymptom = api.createSymptom;
export const updateSymptom = api.updateSymptom;
export const deleteSymptom = api.deleteSymptom;

// Sleep API
export const listSleep = api.listSleep;
export const getSleep = api.getSleep;
export const createSleep = api.createSleep;
export const updateSleep = api.updateSleep;
export const deleteSleep = api.deleteSleep;


export { ApiError, createApiClient, subscribeRecordChanges } from './client';
