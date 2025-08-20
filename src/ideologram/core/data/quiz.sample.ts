import { QuizItemLoading } from '../types.js';

// Minimal sample loadings: 2 items per axis (12 total)
export const SAMPLE_QUIZ_LOADINGS: QuizItemLoading[] = [
  { id: 'econ_1', axes: { econ_lr: 0.8 }, quality: 0.8 },
  { id: 'econ_2', axes: { econ_lr: -0.8 }, quality: 0.8, reverse: true },

  { id: 'cult_1', axes: { cult_libcon: -0.8 }, quality: 0.8 },
  { id: 'cult_2', axes: { cult_libcon: 0.8 }, quality: 0.8, reverse: true },

  { id: 'auth_1', axes: { auth_lib: 0.8 }, quality: 0.8 },
  { id: 'auth_2', axes: { auth_lib: -0.8 }, quality: 0.8, reverse: true },

  { id: 'scope_1', axes: { global_local: -0.8 }, quality: 0.8 },
  { id: 'scope_2', axes: { global_local: 0.8 }, quality: 0.8, reverse: true },

  { id: 'tech_1', axes: { tech_prog: 0.8 }, quality: 0.8 },
  { id: 'tech_2', axes: { tech_prog: -0.8 }, quality: 0.8, reverse: true },

  { id: 'epi_1', axes: { epistemic_rat: 0.8 }, quality: 0.8 },
  { id: 'epi_2', axes: { epistemic_rat: -0.8 }, quality: 0.8, reverse: true },
];
