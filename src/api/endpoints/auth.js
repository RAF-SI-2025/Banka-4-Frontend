import api from '../client';

export const authApi = {
  login:          (data)  => api.post('/auth/login', data),
  aktivacija:     (data)  => api.post('/auth/aktivacija', data),
  resetZahtev:    (email) => api.post('/auth/reset-zahtev', { email }),
  resetLozinka:   (data)  => api.post('/auth/reset-lozinka', data),
  changePassword: (data)  => api.post('/auth/promena-lozinke', data),
  refresh:        (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};
