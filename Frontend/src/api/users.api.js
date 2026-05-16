import api from './axios';

export const getFreelancers = (params) => api.get('/users', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const getMyEarnings = (params) => api.get('/users/me/earnings', { params });
