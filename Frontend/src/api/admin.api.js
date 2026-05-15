import api from './axios';

export const getUsers = (params) => api.get('/admin/users', { params });
export const banUser = (id) => api.patch(`/admin/users/${id}/ban`);
export const getStats = () => api.get('/admin/stats');
export const getContracts = () => api.get('/admin/contracts');
export const getAdminJobs = (params) => api.get('/admin/jobs', { params });
export const adminDeleteJob = (id) => api.delete(`/admin/jobs/${id}`);
