import { tradingApi as api } from '../client';

export const priceAlertApi = {
  getAll: () => api.get('/price-alerts'),
  create: (data) => api.post('/price-alerts', data),
  delete: (id) => api.delete(`/price-alerts/${id}`),
};
