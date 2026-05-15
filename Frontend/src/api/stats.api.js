import api from './axios';

export const getPublicStats = () => api.get('/stats');
