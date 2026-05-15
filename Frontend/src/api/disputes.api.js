import api from './axios';

export const getDispute = (id) => api.get(`/disputes/${id}`);
export const respondToDispute = (id, data) => api.post(`/disputes/${id}/respond`, data);
export const submitEvidence = (id, data) => api.post(`/disputes/${id}/evidence`, data);
export const withdrawDispute = (id) => api.post(`/disputes/${id}/withdraw`);
export const sendMessage = (id, data) => api.post(`/disputes/${id}/messages`, data);
