import api from './client';

const DELAY = 600;

const delay = ms => new Promise(r => setTimeout(r, ms));

const FAKE_USER = {
  id:       1,
  ime:      'Petar',
  prezime:  'Petrović',
  email:    'petar.petrovic@rafbank.rs',
  jeAdmin:  true,
};

const FAKE_ZAPOSLENI = [
  { id: 1, ime: 'Petar',   prezime: 'Petrović',  email: 'petar.petrovic@rafbank.rs',  pozicija: 'Direktor',          departman: 'Uprava',       aktivan: true },
  { id: 2, ime: 'Ana',     prezime: 'Jovanović',  email: 'ana.jovanovic@rafbank.rs',   pozicija: 'Menadžer',          departman: 'Finansije',    aktivan: true },
  { id: 3, ime: 'Marko',   prezime: 'Nikolić',    email: 'marko.nikolic@rafbank.rs',   pozicija: 'Programer',         departman: 'IT',           aktivan: true },
  { id: 4, ime: 'Jelena',  prezime: 'Đorđević',   email: 'jelena.djordjevic@rafbank.rs', pozicija: 'Analitičar',     departman: 'Finansije',    aktivan: false },
  { id: 5, ime: 'Stefan',  prezime: 'Popović',    email: 'stefan.popovic@rafbank.rs',  pozicija: 'Sistemski admin',   departman: 'IT',           aktivan: true },
  { id: 6, ime: 'Milica',  prezime: 'Stanković',  email: 'milica.stankovic@rafbank.rs', pozicija: 'HR menadžer',     departman: 'HR',           aktivan: true },
  { id: 7, ime: 'Nikola',  prezime: 'Ilić',       email: 'nikola.ilic@rafbank.rs',     pozicija: 'Tester',            departman: 'IT',           aktivan: false },
  { id: 8, ime: 'Ivana',   prezime: 'Marković',   email: 'ivana.markovic@rafbank.rs',  pozicija: 'Računovođa',       departman: 'Finansije',    aktivan: true },
];

api.interceptors.request.use(async config => {
  await delay(DELAY);

  const { method, url, data: rawData, params } = config;
  const data = typeof rawData === 'string' ? JSON.parse(rawData || '{}') : rawData ?? {};
  const path = url?.replace(import.meta.env.VITE_API_URL ?? '', '') ?? '';

  if (method === 'post' && path === '/auth/login') {
    if (data.email && data.lozinka) {
      return throwFakeResponse(config, {
        data: { user: FAKE_USER, token: 'fake-jwt-token-123', refreshToken: 'fake-refresh-token-456' },
        message: 'Prijava uspešna',
      });
    }
    return throwFakeError(config, 401, 'Pogrešan email ili lozinka.');
  }

  if (method === 'post' && path === '/auth/refresh') {
    return throwFakeResponse(config, {
      data: { token: 'fake-jwt-refreshed-' + Date.now(), refreshToken: 'fake-refresh-' + Date.now() },
    });
  }

  if (method === 'post' && path === '/auth/promena-lozinke') {
    return throwFakeResponse(config, { message: 'Lozinka je uspešno promenjena.' });
  }

  if (method === 'post' && path === '/auth/reset-zahtev') {
    return throwFakeResponse(config, { message: 'Email je poslat.' });
  }

  if (method === 'post' && path === '/auth/reset-lozinka') {
    return throwFakeResponse(config, { message: 'Lozinka je promenjena.' });
  }

  if (method === 'post' && path === '/auth/aktivacija') {
    return throwFakeResponse(config, { message: 'Nalog je aktiviran.' });
  }

  const idMatch = path.match(/^\/zaposleni\/(\d+)$/);

  if (method === 'get' && idMatch) {
    const zaposleni = FAKE_ZAPOSLENI.find(z => z.id === Number(idMatch[1]));
    if (zaposleni) {
      return throwFakeResponse(config, { data: zaposleni });
    }
    return throwFakeError(config, 404, 'Zaposleni nije pronađen.');
  }

  if (method === 'put' && idMatch) {
    const idx = FAKE_ZAPOSLENI.findIndex(z => z.id === Number(idMatch[1]));
    if (idx !== -1) {
      Object.assign(FAKE_ZAPOSLENI[idx], data);
      return throwFakeResponse(config, { data: FAKE_ZAPOSLENI[idx], message: 'Zaposleni je ažuriran.' });
    }
    return throwFakeError(config, 404, 'Zaposleni nije pronađen.');
  }

  if (method === 'delete' && idMatch) {
    const idx = FAKE_ZAPOSLENI.findIndex(z => z.id === Number(idMatch[1]));
    if (idx !== -1) {
      FAKE_ZAPOSLENI.splice(idx, 1);
      return throwFakeResponse(config, { message: 'Zaposleni je obrisan.' });
    }
    return throwFakeError(config, 404, 'Zaposleni nije pronađen.');
  }

  if (method === 'get' && path === '/zaposleni') {
    let filtered = [...FAKE_ZAPOSLENI];

    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter(z =>
        z.ime.toLowerCase().includes(s) ||
        z.prezime.toLowerCase().includes(s) ||
        z.email.toLowerCase().includes(s)
      );
    }
    if (params?.status === 'aktivan')   filtered = filtered.filter(z => z.aktivan);
    if (params?.status === 'neaktivan') filtered = filtered.filter(z => !z.aktivan);
    if (params?.departman) filtered = filtered.filter(z => z.departman.toLowerCase().includes(params.departman.toLowerCase()));
    if (params?.pozicija)  filtered = filtered.filter(z => z.pozicija.toLowerCase().includes(params.pozicija.toLowerCase()));

    const page  = Number(params?.page)  || 1;
    const limit = Number(params?.limit) || 20;
    const start = (page - 1) * limit;
    const sliced = filtered.slice(start, start + limit);

    return throwFakeResponse(config, {
      data:  sliced,
      total: filtered.length,
      page,
      limit,
    });
  }

  if (method === 'post' && path === '/zaposleni') {
    const novi = { id: Date.now(), ...data };
    FAKE_ZAPOSLENI.push(novi);
    return throwFakeResponse(config, {
      data: novi,
      message: 'Zaposleni je kreiran.',
    }, 201);
  }

  return config;
});

function throwFakeResponse(config, responseData, status = 200) {
  config.adapter = () =>
    Promise.resolve({
      data:    responseData,
      status,
      headers: {},
      config,
      request: {},
    });
  return config;
}

function throwFakeError(config, status, errorMsg) {
  config.adapter = () =>
    Promise.reject({
      response: {
        status,
        data: { error: errorMsg },
      },
      config,
    });
  return config;
}
