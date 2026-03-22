import apiClient from '../client';

export const ordersApi = {
  getSupervisorOrders(params = {}) {
    return apiClient.get('/supervisor/orders', { params });
  },

  approveOrder(orderId) {
    return apiClient.post(`/supervisor/orders/${orderId}/approve`);
  },

  declineOrder(orderId, payload = {}) {
    return apiClient.post(`/supervisor/orders/${orderId}/decline`, payload);
  },

  cancelOrder(orderId, payload = {}) {
    return apiClient.post(`/supervisor/orders/${orderId}/cancel`, payload);
  },
};