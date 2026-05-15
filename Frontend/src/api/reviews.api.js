import api from './axios';

export const getReviews = (userId) => api.get(`/users/${userId}/reviews`);
export const reviewOrder = (orderId, data) => api.post(`/orders/${orderId}/review`, data);
export const createReview = (data) => api.post('/reviews', data); // legacy
