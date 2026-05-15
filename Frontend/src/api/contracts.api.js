import api from './axios';

export const getMyContracts = () => api.get('/contracts');
export const getContract = (id) => api.get(`/contracts/${id}`);
export const updateContractStatus = (id, status) => api.patch(`/contracts/${id}/status`, { status });
