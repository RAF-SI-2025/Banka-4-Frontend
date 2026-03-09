import api from '../client';

export const employeesApi = {
  getAll:  (params)   => api.get('/zaposleni', { params }),
  getById: (id)       => api.get(`/zaposleni/${id}`),
  create:  (data)     => api.post('/zaposleni', data),
  update:  (id, data) => api.put(`/zaposleni/${id}`, data),
  remove:  (id)       => api.delete(`/zaposleni/${id}`),
};
