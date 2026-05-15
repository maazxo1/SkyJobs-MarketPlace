import api from './axios';

export const listOrders = (params = {}) => api.get('/orders', { params });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const startOrder = (id) => api.post(`/orders/${id}/start`);
export const deliverOrder = (id, data) => api.post(`/orders/${id}/deliver`, data);
export const approveOrder = (id) => api.post(`/orders/${id}/approve`);
export const requestRevision = (id, data) => api.post(`/orders/${id}/request-revision`, data);
export const cancelOrder = (id, data) => api.post(`/orders/${id}/cancel`, data);
export const cancelRespond = (id, data) => api.post(`/orders/${id}/cancel-respond`, data);
export const getDeliveries = (id) => api.get(`/orders/${id}/deliveries`);
export const reviewOrder = (id, data) => api.post(`/orders/${id}/review`, data);
export const openDispute = (id, data) => api.post(`/orders/${id}/dispute`, data);
export const requestExtension = (id, data) => api.post(`/orders/${id}/request-extension`, data);
export const respondExtension = (id, extId, data) => api.post(`/orders/${id}/extensions/${extId}/respond`, data);
