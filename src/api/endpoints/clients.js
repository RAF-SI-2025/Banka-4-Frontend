import api from '../client';

export const clientsApi = {
  getAll:   (params)   => api.get('/clients', { params }),
  getById:  async (id) => {
    // Backend nema GET /clients/{id} endpoint, pa pretražujemo listu
    const res = await api.get('/clients', { params: { page: 1, page_size: 9999 } });
    const list = res?.data ?? res ?? [];
    const clients = Array.isArray(list) ? list : list.data ?? [];
    const found = clients.find(c =>
      String(c.id) === String(id) ||
      String(c.user_id) === String(id) ||
      String(c.client_id) === String(id)
    );
    if (!found) throw { error: 'Klijent nije pronađen.' };
    return found;
  },
  create:   (data)     => api.post('/clients/register', data),
  update:   (id, data) => api.patch(`/clients/${id}`, data),
};
