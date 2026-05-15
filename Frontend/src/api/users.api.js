import api from './axios';

export const getFreelancers = (params) => api.get('/users', { params });
