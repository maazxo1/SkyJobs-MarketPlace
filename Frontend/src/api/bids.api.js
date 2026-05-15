import api from './axios';

export const getMyBids = () => api.get('/bids');
export const submitBid = (data) => api.post('/bids', data);
export const updateBid = (id, data) => api.put(`/bids/${id}`, data);
export const withdrawBid = (id) => api.delete(`/bids/${id}`);
export const acceptBid = (id) => api.patch(`/bids/${id}/accept`);
export const rejectBid = (id, reason) => api.patch(`/bids/${id}/reject`, { reason });
