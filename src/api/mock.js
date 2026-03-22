import { ORDER_DIRECTION, ORDER_STATUS, ORDER_TYPE } from '../utils/orders/orderModel';
import api from './client';

const DELAY = 400;
const delay = ms => new Promise(r => setTimeout(r, ms));

// ─── FAKE DATA ────────────────────────────────────────────────────────────────

export const MOCK_ORDERS = [
  {
    id: 101,
    agent_name: 'Miloš Milošević',
    asset_name: 'AAPL',
    asset_type: 'Stock',
    order_type: ORDER_TYPE.MARKET,
    quantity: 10,
    contract_size: 1,
    price_per_unit: 192.5,
    direction: ORDER_DIRECTION.BUY,
    remaining_portions: 10,
    status: ORDER_STATUS.PENDING,
    approved_by: '—',
    last_modification: '2026-03-17T09:30:00Z',
    settlement_date: null,
  },
  {
    id: 102,
    agent_name: 'Jelena Jovanović',
    asset_name: 'EUR/USD',
    asset_type: 'Forex',
    order_type: ORDER_TYPE.LIMIT,
    quantity: 2,
    contract_size: 1000,
    price_per_unit: 1.09,
    direction: ORDER_DIRECTION.SELL,
    remaining_portions: 2,
    status: ORDER_STATUS.PENDING,
    approved_by: '—',
    last_modification: '2026-03-17T10:00:00Z',
    settlement_date: '2026-03-15T00:00:00Z',
  },
  {
    id: 103,
    agent_name: 'Ana Anić',
    asset_name: 'CLZ26',
    asset_type: 'Futures',
    order_type: ORDER_TYPE.STOP,
    quantity: 3,
    contract_size: 100,
    price_per_unit: 80,
    direction: ORDER_DIRECTION.BUY,
    remaining_portions: 3,
    status: ORDER_STATUS.APPROVED,
    approved_by: 'Supervisor Admin',
    last_modification: '2026-03-16T14:12:00Z',
    settlement_date: '2026-12-20T00:00:00Z',
  },
  {
    id: 104,
    agent_name: 'Petar Petrović',
    asset_name: 'MSFT',
    asset_type: 'Stock',
    order_type: ORDER_TYPE.STOP_LIMIT,
    quantity: 5,
    contract_size: 1,
    price_per_unit: 410,
    direction: ORDER_DIRECTION.SELL,
    remaining_portions: 0,
    status: ORDER_STATUS.DONE,
    approved_by: 'Supervisor Admin',
    last_modification: '2026-03-14T11:45:00Z',
    settlement_date: null,
  },
  {
    id: 105,
    agent_name: 'Nikola Nikolić',
    asset_name: 'TSLA',
    asset_type: 'Stock',
    order_type: ORDER_TYPE.LIMIT,
    quantity: 8,
    contract_size: 1,
    price_per_unit: 215,
    direction: ORDER_DIRECTION.BUY,
    remaining_portions: 8,
    status: ORDER_STATUS.DECLINED,
    approved_by: 'Supervisor Admin',
    last_modification: '2026-03-13T08:15:00Z',
    settlement_date: null,
  },
];

const FAKE_EXCHANGE_RATES = [
    { code: 'EUR', flag: 'https://flagcdn.com/w40/eu.webp',  buy: 116.80, mid: 117.15, sell: 117.50 },
    { code: 'USD', flag: 'https://flagcdn.com/w40/us.webp',  buy: 107.20, mid: 107.55, sell: 107.90 },
    { code: 'CHF', flag: 'https://flagcdn.com/w40/ch.webp',  buy: 119.50, mid: 119.90, sell: 120.30 },
    { code: 'GBP', flag: 'https://flagcdn.com/w40/gb.webp',  buy: 136.40, mid: 136.80, sell: 137.20 },
    { code: 'JPY', flag: 'https://flagcdn.com/w40/jp.webp',  buy: 0.712,  mid: 0.716,  sell: 0.720  },
    { code: 'CAD', flag: 'https://flagcdn.com/w40/ca.webp',  buy: 77.80,  mid: 78.10,  sell: 78.40  },
    { code: 'AUD', flag: 'https://flagcdn.com/w40/au.webp',  buy: 68.20,  mid: 68.50,  sell: 68.80  },
];

let FAKE_MY_ACCOUNTS = [
    { account_id: 1, account_number: '265-1234567890123-45', name: 'Tekući račun RSD',    currency: 'RSD', balance: 285430.50, available_balance: 280430.50, reserved_funds: 5000.00,  daily_limit: 150000, monthly_limit: 500000,  status: 'ACTIVE', owner_name: 'Nikola Nikolić', account_type: 'PERSONAL' },
    { account_id: 2, account_number: '265-9876543210987-12', name: 'Devizni račun EUR',   currency: 'EUR', balance: 2450.00,   available_balance: 2450.00,   reserved_funds: 0,        daily_limit: 5000,   monthly_limit: 20000,   status: 'ACTIVE', owner_name: 'Nikola Nikolić', account_type: 'PERSONAL' },
    { account_id: 3, account_number: '265-1111222233334-56', name: 'Poslovni račun DOO',  currency: 'RSD', balance: 1250000.00,available_balance: 1200000.00,reserved_funds: 50000.00, daily_limit: 500000, monthly_limit: 2000000, status: 'ACTIVE', owner_name: 'Nikola Nikolić', account_type: 'BUSINESS', company_name: 'Nikolić DOO', pib: '123456789', mb: '12345678' },
];

const FAKE_MY_TRANSACTIONS = {
    1: [
        { transaction_id: 1, date: '2026-03-17T08:30:00', recipient_payer: 'JKP Infostan',          payment_code: '289', amount: 8500,   type: 'WITHDRAWAL', currency: 'RSD' },
        { transaction_id: 2, date: '2026-03-15T09:00:00', recipient_payer: 'Firma XY d.o.o.',        payment_code: '253', amount: 95000,  type: 'DEPOSIT',    currency: 'RSD' },
        { transaction_id: 3, date: '2026-03-14T18:22:00', recipient_payer: 'Supermarket Maxi',       payment_code: '289', amount: 4320,   type: 'WITHDRAWAL', currency: 'RSD' },
        { transaction_id: 4, date: '2026-03-12T11:00:00', recipient_payer: 'Interni transfer na EUR', payment_code: '220', amount: 50000,  type: 'WITHDRAWAL', currency: 'RSD' },
        { transaction_id: 5, date: '2026-03-08T07:45:00', recipient_payer: 'SBB d.o.o.',             payment_code: '289', amount: 3200,   type: 'WITHDRAWAL', currency: 'RSD' },
        { transaction_id: 6, date: '2026-03-05T13:30:00', recipient_payer: 'Povraćaj uplata',        payment_code: '189', amount: 2000,   type: 'DEPOSIT',    currency: 'RSD' },
    ],
    2: [
        { transaction_id: 7, date: '2026-03-12T11:00:00', recipient_payer: 'Interni transfer sa RSD', payment_code: '220', amount: 426.45, type: 'DEPOSIT',    currency: 'EUR' },
        { transaction_id: 8, date: '2026-02-20T10:00:00', recipient_payer: 'Amazon EU',               payment_code: '289', amount: 89.99,  type: 'WITHDRAWAL', currency: 'EUR' },
    ],
    3: [
        { transaction_id: 9, date: '2026-03-16T09:00:00', recipient_payer: 'Kupac - Petar Petrović', payment_code: '253', amount: 180000, type: 'DEPOSIT',    currency: 'RSD' },
        { transaction_id:10, date: '2026-03-10T14:00:00', recipient_payer: 'Dobavljač - Vuk d.o.o.', payment_code: '253', amount: 75000,  type: 'WITHDRAWAL', currency: 'RSD' },
    ],
};

const FAKE_EMPLOYEE = {
    employee_id:   1,
    first_name:    'Petar',
    last_name:     'Petrović',
    email:         'admin@rafbank.rs',
    username:      'ppetrovic',
    password:      'pass123',
    gender:        'M',
    date_of_birth: '1985-03-15',
    phone_number:  '+381601234567',
    address:       'Knez Mihailova 10, Beograd',
    department:    'Management',
    position_id:   1,
    active:        true,
    is_admin:      true,
    identity_type: 'EMPLOYEE',
    permissions:   ['employee.view', 'employee.create', 'employee.update', 'employee.delete'],
};

const FAKE_EMPLOYEES = [
    { employee_id: 1, first_name: 'Petar',   last_name: 'Petrović',  email: 'admin@rafbank.rs',             username: 'ppetrovic',  position_id: 1, department: 'Management', active: true,  gender: 'M', date_of_birth: '1985-03-15', phone_number: '+381601234567', address: 'Knez Mihailova 10' },
    { employee_id: 2, first_name: 'Ana',     last_name: 'Jovanović', email: 'ana.jovanovic@rafbank.rs',     username: 'ajovanovic', position_id: 2, department: 'Finance',    active: true,  gender: 'F', date_of_birth: '1990-07-22', phone_number: '+381601234568', address: 'Bulevar Kralja Aleksandra 5' },
    { employee_id: 3, first_name: 'Marko',   last_name: 'Nikolić',   email: 'marko.nikolic@rafbank.rs',     username: 'mnikolic',   position_id: 3, department: 'IT',         active: true,  gender: 'M', date_of_birth: '1992-11-03', phone_number: '+381601234569', address: 'Nemanjina 15' },
    { employee_id: 4, first_name: 'Jelena',  last_name: 'Đorđević',  email: 'jelena.djordjevic@rafbank.rs', username: 'jdjordjevic', position_id: 4, department: 'Finance',   active: false, gender: 'F', date_of_birth: '1988-01-10', phone_number: '+381601234570', address: 'Cara Dušana 20' },
    { employee_id: 5, first_name: 'Stefan',  last_name: 'Popović',   email: 'stefan.popovic@rafbank.rs',    username: 'spopovic',   position_id: 5, department: 'IT',         active: true,  gender: 'M', date_of_birth: '1995-05-18', phone_number: '+381601234571', address: 'Terazije 8' },
];

const FAKE_CLIENT = {
    id:            101,
    first_name:    'Nikola',
    last_name:     'Nikolić',
    email:         'klijent@gmail.com',
    username:      'nnikolic',
    identity_type: 'CLIENT',
    phone:         '+381601234599',
    address:       'Bulevar Oslobođenja 5, Novi Sad',
};

// Accounts — both English and Serbian field names for full compatibility
const FAKE_ACCOUNTS = [
    {
        id: 1,
        name: 'Tekući račun RSD', broj: 'Tekući račun RSD',
        number: '265-1234567890123-45', accountNumber: '265-1234567890123-45',
        currency: 'RSD', valuta: 'RSD',
        balance: 285430.50, stanje: 285430.50,
        type: 'CURRENT',
    },
    {
        id: 2,
        name: 'Devizni račun EUR', broj: 'Devizni račun EUR',
        number: '265-9876543210987-12', accountNumber: '265-9876543210987-12',
        currency: 'EUR', valuta: 'EUR',
        balance: 2450.00, stanje: 2450.00,
        type: 'FOREIGN',
    },
    {
        id: 3,
        name: 'Štedni račun RSD', broj: 'Štedni račun RSD',
        number: '265-1111222233334-56', accountNumber: '265-1111222233334-56',
        currency: 'RSD', valuta: 'RSD',
        balance: 120000.00, stanje: 120000.00,
        type: 'SAVINGS',
    },
];

const FAKE_TRANSACTIONS = [
    { id: 1, description: 'Komunalne usluge',        date: '2026-03-17T08:30:00', amount: 8500,    type: 'debit' },
    { id: 2, description: 'Uplata plate',            date: '2026-03-15T09:00:00', amount: 95000,   type: 'credit' },
    { id: 3, description: 'Supermarket Maxi',        date: '2026-03-14T18:22:00', amount: 4320,    type: 'debit' },
    { id: 4, description: 'Transfer na EUR račun',   date: '2026-03-12T11:00:00', amount: 50000,   type: 'debit' },
    { id: 5, description: 'Povraćaj sredstava',      date: '2026-03-10T14:15:00', amount: 2000,    type: 'credit' },
    { id: 6, description: 'Internet i TV pretplata', date: '2026-03-08T07:45:00', amount: 3200,    type: 'debit' },
    { id: 7, description: 'Frizerski salon',         date: '2026-03-05T13:30:00', amount: 1800,    type: 'debit' },
];

const FAKE_CARDS = [
    { id: 1, card_number: '5326123412343458', holder_name: 'Petar Petrović', expiration_date: '08/27', creation_date: '2022-06-15T00:00:00Z', cvv: '312', type: 'Debitna', account_name: 'Lični tekući račun', account_number: '12345678901234578', limit_daily: 50000, limit_monthly: 120000, limit: 120000, status: 'ACTIVE', transactions: [] },
    { id: 2, card_number: '4532123412341289', holder_name: 'Petar Petrović', expiration_date: '04/28', creation_date: '2023-01-09T00:00:00Z', cvv: '491', type: 'Debitna', account_name: 'Devizni račun', account_number: '265000000000123456', limit_daily: 30000, limit_monthly: 85000, limit: 85000, status: 'BLOCKED', transactions: [] },
];

let FAKE_RECIPIENTS = [
    { id: 1, name: 'Marko Marković',  account_number: '265000000000000001', initials: 'MM' },
    { id: 2, name: 'Ana Jovanović',   account_number: '170000000000000002', initials: 'AJ' },
    { id: 3, name: 'Stefan Popović',  account_number: '265000000000000003', initials: 'SP' },
];
let nextRecipientId = 4;

const FAKE_RATES = [
    { currency: 'EUR', buy: 116.80, sell: 117.50 },
    { currency: 'USD', buy: 107.20, sell: 107.90 },
    { currency: 'GBP', buy: 136.40, sell: 137.20 },
    { currency: 'CHF', buy: 119.50, sell: 120.30 },
];

let FAKE_TRANSFERS_HISTORY = [
    { id: 1, date: '2026-03-12T11:00:00', fromAccountNumber: '265-1234567890123-45', toAccountNumber: '265-9876543210987-12', initialAmount: 50000, finalAmount: 426.45, fromCurrency: 'RSD', toCurrency: 'EUR', status: 'SUCCESS' },
    { id: 2, date: '2026-03-05T09:30:00', fromAccountNumber: '265-1234567890123-45', toAccountNumber: '265-1111222233334-56', initialAmount: 20000, finalAmount: 20000,  fromCurrency: 'RSD', toCurrency: 'RSD', status: 'SUCCESS' },
];
let nextTransferId = 3;

const FAKE_CLIENTS_LIST = [
    { id: 101, first_name: 'Nikola',  last_name: 'Nikolić',  email: 'klijent@gmail.com',    phone: '+381601234599', address: 'Bulevar Oslobođenja 5', active: true },
    { id: 102, first_name: 'Milica',  last_name: 'Stević',   email: 'milica.s@gmail.com',   phone: '+381601234600', address: 'Cara Lazara 12', active: true },
    { id: 103, first_name: 'Đorđe',   last_name: 'Lazović',  email: 'djordje.l@gmail.com',  phone: '+381601234601', address: 'Francuska 7', active: true },
    { id: 104, first_name: 'Tamara',  last_name: 'Ristić',   email: 'tamara.r@gmail.com',   phone: '+381601234602', address: 'Makedonska 3', active: false },
    { id: 105, first_name: 'Vladimir',last_name: 'Kovač',    email: 'vladimir.k@gmail.com', phone: '+381601234603', address: 'Rige od Fere 4', active: true },
];

let FAKE_LOANS = [
    {
        id: 1, name: 'Stambeni kredit', total_amount: 4500000, remaining_debt: 3120000, currency: 'RSD', status: 'AKTIVAN',
        nks: 3.5, eks: 4.2, next_due_date: '01.04.2026.', next_installment: 28500,
        installments: [
            { id: 1, date: '01.03.2026.', amount: 28500, principal: 14200, interest: 14300, status: 'PLAĆENO' },
            { id: 2, date: '01.02.2026.', amount: 28500, principal: 14150, interest: 14350, status: 'PLAĆENO' },
            { id: 3, date: '01.01.2026.', amount: 28500, principal: 14100, interest: 14400, status: 'PLAĆENO' },
            { id: 4, date: '01.12.2025.', amount: 28500, principal: 14050, interest: 14450, status: 'PLAĆENO' },
        ],
    },
    {
        id: 2, name: 'Potrošački kredit', total_amount: 300000, remaining_debt: 87000, currency: 'RSD', status: 'AKTIVAN',
        nks: 6.9, eks: 7.5, next_due_date: '15.04.2026.', next_installment: 9200,
        installments: [
            { id: 5, date: '15.03.2026.', amount: 9200, principal: 8600, interest: 600, status: 'PLAĆENO' },
            { id: 6, date: '15.02.2026.', amount: 9200, principal: 8550, interest: 650, status: 'PLAĆENO' },
            { id: 7, date: '15.01.2026.', amount: 9200, principal: 8500, interest: 700, status: 'PLAĆENO' },
        ],
    },
];

let FAKE_LOAN_REQUESTS = [
    { id: 1, client_name: 'Nikola Nikolić',  amount: 500000, currency: 'RSD', duration_months: 60, rate_type: 'FIKSNA',     status: 'NA ČEKANJU' },
    { id: 2, client_name: 'Milica Stević',   amount: 200000, currency: 'RSD', duration_months: 24, rate_type: 'VARIJABILNA', status: 'ODOBRENA' },
    { id: 3, client_name: 'Đorđe Lazović',   amount: 1200000, currency: 'RSD', duration_months: 120, rate_type: 'FIKSNA',   status: 'NA ČEKANJU' },
];
let nextLoanReqId = 4;

const FAKE_PAYMENTS = [
    { id: 1, date: '2026-03-17', from: '265-1234567890123-45', to: '160000000000000001', amount: 8500,  currency: 'RSD', description: 'Komunalne usluge', status: 'SUCCESS', type: 'payment' },
    { id: 2, date: '2026-03-12', from: '265-1234567890123-45', to: '265-9876543210987-12', amount: 50000, currency: 'RSD', description: 'Menjačnica EUR', status: 'SUCCESS', type: 'exchange' },
    { id: 3, date: '2026-03-08', from: '265-1234567890123-45', to: '220000000000000003', amount: 3200,  currency: 'RSD', description: 'Internet i TV', status: 'SUCCESS', type: 'payment' },
    { id: 4, date: '2026-03-01', from: '265-1234567890123-45', to: '170000000000000002', amount: 15000, currency: 'RSD', description: 'Stanarima za mart', status: 'SUCCESS', type: 'payment' },
    { id: 5, date: '2026-02-28', from: '265-9876543210987-12', to: '265-1234567890123-45', amount: 500, currency: 'EUR', description: 'Povraćaj konverzija', status: 'SUCCESS', type: 'exchange' },
];

// ─── INTERCEPTOR ─────────────────────────────────────────────────────────────

api.interceptors.request.use(async config => {
    await delay(DELAY);

    const { method, url, data: rawData, params } = config;
    const data = typeof rawData === 'string' ? JSON.parse(rawData || '{}') : rawData ?? {};
    const path = url?.replace(import.meta.env.VITE_API_URL ?? '', '') ?? '';

    // ── AUTH ─────────────────────────────────────────────────────────────────

    if (method === 'post' && (path === '/auth/login' || path === '/login')) {
        if (data.email && data.password) {
            return ok(config, { token: 'fake-jwt-employee-token', refresh_token: 'fake-refresh-token', user: FAKE_EMPLOYEE });
        }
        return err(config, 401, 'Pogrešan email ili lozinka.');
    }

    if (method === 'post' && path === '/client/login') {
        if (data.email && data.password) {
            return ok(config, { token: 'fake-jwt-client-token', refresh_token: 'fake-refresh-token-client', user: FAKE_CLIENT });
        }
        return err(config, 401, 'Pogrešan email ili lozinka.');
    }

    if (method === 'post' && (path === '/auth/refresh' || path === '/refresh')) {
        return ok(config, { token: 'fake-jwt-employee-token', refresh_token: 'fake-refresh-token' });
    }

    if (method === 'post' && (path === '/auth/activate' || path === '/activate')) {
        return ok(config, { message: 'Nalog je aktiviran.' });
    }

    if (method === 'post' && (path === '/auth/forgot-password' || path === '/forgot-password')) {
        return ok(config, { message: 'Email je poslat.' });
    }

    if (method === 'post' && (path === '/auth/reset-password' || path === '/reset-password')) {
        return ok(config, { message: 'Lozinka je promenjena.' });
    }

    if (method === 'post' && (path === '/auth/change-password' || path === '/change-password')) {
        return ok(config, { message: 'Lozinka je uspešno promenjena.' });
    }

    // ── EMPLOYEES ────────────────────────────────────────────────────────────

    if (method === 'post' && (path === '/register' || path === '/clients/register')) {
        const novi = { employee_id: Date.now(), ...data };
        FAKE_EMPLOYEES.push(novi);
        return ok(config, { data: novi, message: 'Zaposleni je kreiran.' }, 201);
    }

    const empIdMatch = path.match(/^\/zaposleni\/(\d+)$/);

    if (empIdMatch) {
        const id = Number(empIdMatch[1]);
        if (method === 'get') {
            const emp = FAKE_EMPLOYEES.find(e => e.employee_id === id);
            return emp ? ok(config, { data: emp }) : err(config, 404, 'Zaposleni nije pronađen.');
        }
        if (method === 'patch' || method === 'put') {
            const idx = FAKE_EMPLOYEES.findIndex(e => e.employee_id === id);
            if (idx !== -1) {
                Object.assign(FAKE_EMPLOYEES[idx], data);
                return ok(config, { data: FAKE_EMPLOYEES[idx], message: 'Zaposleni je ažuriran.' });
            }
            return err(config, 404, 'Zaposleni nije pronađen.');
        }
        if (method === 'delete') {
            const idx = FAKE_EMPLOYEES.findIndex(e => e.employee_id === id);
            if (idx !== -1) { FAKE_EMPLOYEES.splice(idx, 1); return ok(config, { message: 'Zaposleni je obrisan.' }); }
            return err(config, 404, 'Zaposleni nije pronađen.');
        }
    }

    if (method === 'get' && (path === '/zaposleni' || path === '')) {
        let filtered = [...FAKE_EMPLOYEES];
        if (params?.email)      filtered = filtered.filter(e => e.email.toLowerCase().includes(params.email.toLowerCase()));
        if (params?.first_name) filtered = filtered.filter(e => e.first_name.toLowerCase().includes(params.first_name.toLowerCase()));
        if (params?.last_name)  filtered = filtered.filter(e => e.last_name.toLowerCase().includes(params.last_name.toLowerCase()));
        const page     = Number(params?.page)      || 1;
        const pageSize = Number(params?.page_size) || 20;
        const start    = (page - 1) * pageSize;
        return ok(config, { data: filtered.slice(start, start + pageSize), total: filtered.length, page, page_size: pageSize, total_pages: Math.ceil(filtered.length / pageSize) });
    }

    // ── CLIENTS ADMIN ────────────────────────────────────────────────────────

    const clientAdminIdMatch = path.match(/^\/clients\/(\d+)$/);
    if (clientAdminIdMatch) {
        const id = Number(clientAdminIdMatch[1]);
        if (method === 'get') {
            const c = FAKE_CLIENTS_LIST.find(x => x.id === id);
            return c ? ok(config, { data: c }) : err(config, 404, 'Klijent nije pronađen.');
        }
        if (method === 'patch' || method === 'put') {
            const idx = FAKE_CLIENTS_LIST.findIndex(x => x.id === id);
            if (idx !== -1) { Object.assign(FAKE_CLIENTS_LIST[idx], data); return ok(config, { data: FAKE_CLIENTS_LIST[idx] }); }
            return err(config, 404, 'Klijent nije pronađen.');
        }
    }

    if (method === 'get' && path === '/clients') {
        let filtered = [...FAKE_CLIENTS_LIST];
        if (params?.email)      filtered = filtered.filter(c => c.email.toLowerCase().includes(params.email.toLowerCase()));
        if (params?.first_name) filtered = filtered.filter(c => c.first_name.toLowerCase().includes(params.first_name.toLowerCase()));
        if (params?.last_name)  filtered = filtered.filter(c => c.last_name.toLowerCase().includes(params.last_name.toLowerCase()));
        const page     = Number(params?.page)      || 1;
        const pageSize = Number(params?.page_size) || 20;
        const start    = (page - 1) * pageSize;
        return ok(config, { data: filtered.slice(start, start + pageSize), total: filtered.length, page, page_size: pageSize, total_pages: Math.ceil(filtered.length / pageSize) });
    }

    // ── EXCHANGE RATES ───────────────────────────────────────────────────────

    if (method === 'get' && path === '/exchange/rates') {
        return ok(config, FAKE_EXCHANGE_RATES);
    }

    if (method === 'post' && path === '/exchange/convert') {
        const { amount, fromCurrency, toCurrency } = data;
        const fromRate = FAKE_EXCHANGE_RATES.find(r => r.code === fromCurrency)?.mid ?? 1;
        const toRate   = FAKE_EXCHANGE_RATES.find(r => r.code === toCurrency)?.mid   ?? 1;
        const fromInRSD = fromCurrency === 'RSD' ? amount : amount * fromRate;
        const result    = toCurrency   === 'RSD' ? fromInRSD : fromInRSD / toRate;
        return ok(config, { result: parseFloat(result.toFixed(4)), fromCurrency, toCurrency, amount });
    }

    // ── MY ACCOUNTS (full shape for Accounts.jsx) ─────────────────────────

    const myAccTxMatch = path.match(/^\/accounts\/(\d+)\/transactions$/);
    if (myAccTxMatch) {
        const id = Number(myAccTxMatch[1]);
        return ok(config, { data: FAKE_MY_TRANSACTIONS[id] ?? [] });
    }

    const myAccIdMatch = path.match(/^\/accounts\/(\d+)$/);
    if (myAccIdMatch) {
        const id = Number(myAccIdMatch[1]);
        if (method === 'get') {
            const acc = FAKE_MY_ACCOUNTS.find(a => a.account_id === id);
            return acc ? ok(config, { data: acc }) : err(config, 404, 'Račun nije pronađen.');
        }
        if (method === 'patch' || method === 'put') {
            const idx = FAKE_MY_ACCOUNTS.findIndex(a => a.account_id === id);
            if (idx !== -1) {
                Object.assign(FAKE_MY_ACCOUNTS[idx], data);
                return ok(config, { data: FAKE_MY_ACCOUNTS[idx], message: 'Račun je ažuriran.' });
            }
            return err(config, 404, 'Račun nije pronađen.');
        }
    }

    if (method === 'get' && path === '/accounts') {
        return ok(config, { data: FAKE_MY_ACCOUNTS });
    }

    // ── CARDS ─────────────────────────────────────────────────────────────

    const cardsByUserMatch = path.match(/^\/cards\/user\/(\d+)$/);
    if (cardsByUserMatch) {
        if (method === 'get')  return ok(config, FAKE_CARDS);
        if (method === 'post') return ok(config, { message: 'Zahtev za novu karticu je primljen.' }, 201);
    }

    const cardIdMatch = path.match(/^\/cards\/(\d+)$/);
    if (cardIdMatch) {
        const id = Number(cardIdMatch[1]);
        const card = FAKE_CARDS.find(c => c.id === id);
        if (!card) return err(config, 404, 'Kartica nije pronađena.');
        if (method === 'get') return ok(config, card);
    }

    if (method === 'get' && path === '/cards') {
        return ok(config, { data: FAKE_CARDS });
    }

    // ── PAYMENTS (from AccountDetailsModal) ──────────────────────────────

    if (method === 'post' && path === '/payments') {
        const novo = { id: Date.now(), ...data, status: 'SUCCESS', date: new Date().toISOString(), type: 'payment' };
        FAKE_PAYMENTS.unshift(novo);
        return ok(config, { data: novo, message: 'Nalog za plaćanje je primljen.' }, 201);
    }

    // ── AUTH ME ───────────────────────────────────────────────────────────

    if (method === 'get' && path === '/auth/me') {
        return ok(config, { data: FAKE_CLIENT });
    }

    // ── CLIENT ACCOUNTS ──────────────────────────────────────────────────────

    if (method === 'get' && path === '/client/accounts') {
        return ok(config, { data: FAKE_ACCOUNTS });
    }

    // ── CLIENT TRANSACTIONS ──────────────────────────────────────────────────

    if (method === 'get' && path === '/client/transactions') {
        return ok(config, { data: FAKE_TRANSACTIONS });
    }

    // ── CLIENT RATES ─────────────────────────────────────────────────────────

    if (method === 'get' && path === '/client/rates') {
        return ok(config, { data: FAKE_RATES });
    }

    // ── CLIENT RECIPIENTS ────────────────────────────────────────────────────

    const recipientIdMatch = path.match(/^\/client\/recipients\/(\d+)$/);
    if (recipientIdMatch) {
        const id = Number(recipientIdMatch[1]);
        if (method === 'put' || method === 'patch') {
            const idx = FAKE_RECIPIENTS.findIndex(r => r.id === id);
            if (idx !== -1) {
                Object.assign(FAKE_RECIPIENTS[idx], data);
                return ok(config, { data: FAKE_RECIPIENTS[idx], message: 'Primalac je ažuriran.' });
            }
            return err(config, 404, 'Primalac nije pronađen.');
        }
        if (method === 'delete') {
            const idx = FAKE_RECIPIENTS.findIndex(r => r.id === id);
            if (idx !== -1) { FAKE_RECIPIENTS.splice(idx, 1); return ok(config, { message: 'Primalac je obrisan.' }); }
            return err(config, 404, 'Primalac nije pronađen.');
        }
    }

    if (path === '/client/recipients') {
        if (method === 'get') {
            return ok(config, { data: FAKE_RECIPIENTS });
        }
        if (method === 'post') {
            const initials = (data.name || '')
                .split(' ').slice(0, 2)
                .map(w => w[0]?.toUpperCase() ?? '').join('');
            const novo = { id: nextRecipientId++, ...data, initials };
            FAKE_RECIPIENTS.push(novo);
            return ok(config, { data: novo, message: 'Primalac je dodat.' }, 201);
        }
    }

    // ── TRANSFERS ────────────────────────────────────────────────────────────

    if (method === 'post' && path === '/client/transfers/preview') {
        const { fromAccountId, toAccountId, amount } = data;
        const from = FAKE_ACCOUNTS.find(a => a.id === fromAccountId);
        const to   = FAKE_ACCOUNTS.find(a => a.id === toAccountId);
        if (!from || !to) return err(config, 400, 'Račun nije pronađen.');
        if (from.currency === to.currency) {
            return ok(config, { data: { kurs: 1, commission: 0, finalAmount: amount } });
        }
        const rate    = FAKE_RATES.find(r => r.currency === to.currency || r.currency === from.currency);
        const kurs    = from.currency === 'RSD' ? (1 / (rate?.sell ?? 117.50)) : (rate?.sell ?? 117.50);
        const commission = amount * 0.005;
        const finalAmount = (amount - commission) * kurs;
        return ok(config, { data: { kurs, commission, finalAmount } });
    }

    if (method === 'post' && path === '/client/transfers') {
        const { fromAccountId, toAccountId, amount } = data;
        const fromAcc = FAKE_ACCOUNTS.find(a => a.id === fromAccountId);
        const toAcc   = FAKE_ACCOUNTS.find(a => a.id === toAccountId);
        if (!fromAcc || !toAcc) return err(config, 400, 'Račun nije pronađen.');
        if (fromAcc.balance < amount) return err(config, 400, 'Nedovoljno sredstava.');

        fromAcc.balance  -= amount;
        fromAcc.stanje   -= amount;
        const kurs = fromAcc.currency === toAcc.currency ? 1
            : fromAcc.currency === 'RSD'
                ? 1 / (FAKE_RATES.find(r => r.currency === toAcc.currency)?.sell ?? 117.50)
                : (FAKE_RATES.find(r => r.currency === fromAcc.currency)?.sell ?? 117.50);
        const finalAmount = amount * kurs;
        toAcc.balance  += finalAmount;
        toAcc.stanje   += finalAmount;

        FAKE_TRANSFERS_HISTORY.unshift({
            id: nextTransferId++,
            date: new Date().toISOString(),
            fromAccountNumber: fromAcc.number,
            toAccountNumber:   toAcc.number,
            initialAmount: amount,
            finalAmount,
            fromCurrency: fromAcc.currency,
            toCurrency:   toAcc.currency,
            status: 'SUCCESS',
        });
        return ok(config, { message: 'Transfer je uspešno izvršen.' }, 201);
    }

    if (method === 'get' && path === '/client/transfers') {
        return ok(config, { data: FAKE_TRANSFERS_HISTORY });
    }

    // ── LOANS (ADMIN) ─────────────────────────────────────────────────────────

    if (method === 'get' && path === '/loans') {
        return ok(config, { data: FAKE_LOANS });
    }

    if (method === 'post' && path === '/loans/update-rate') {
        return ok(config, { message: 'Kamatna stopa je ažurirana.' });
    }

    // ── LOAN REQUESTS ─────────────────────────────────────────────────────────

    const loanReqActionMatch = path.match(/^\/loan-requests\/(\d+)\/(approve|reject)$/);
    if (loanReqActionMatch) {
        const id     = Number(loanReqActionMatch[1]);
        const action = loanReqActionMatch[2];
        const idx    = FAKE_LOAN_REQUESTS.findIndex(r => r.id === id);
        if (idx !== -1) {
            FAKE_LOAN_REQUESTS[idx].status = action === 'approve' ? 'ODOBRENA' : 'ODBIJENA';
            return ok(config, { data: FAKE_LOAN_REQUESTS[idx], message: action === 'approve' ? 'Zahtev odobren.' : 'Zahtev odbijen.' });
        }
        return err(config, 404, 'Zahtev nije pronađen.');
    }

    if (path === '/loan-requests') {
        if (method === 'get') {
            let filtered = [...FAKE_LOAN_REQUESTS];
            if (params?.status) filtered = filtered.filter(r => r.status === params.status);
            return ok(config, { data: filtered, total: filtered.length });
        }
        if (method === 'post') {
            const novo = {
                id: nextLoanReqId++,
                client_name: `${FAKE_CLIENT.first_name} ${FAKE_CLIENT.last_name}`,
                amount:         data.amount,
                currency:       data.currency ?? 'RSD',
                duration_months: data.repayment_period,
                rate_type:      'FIKSNA',
                status:         'NA ČEKANJU',
            };
            FAKE_LOAN_REQUESTS.push(novo);
            return ok(config, { data: novo, message: 'Zahtev je podnet.' }, 201);
        }
    }

    // ── PAYMENTS ──────────────────────────────────────────────────────────────

    if (method === 'get' && path === '/payments') {
        let filtered = [...FAKE_PAYMENTS];
        if (params?.type)   filtered = filtered.filter(p => p.type === params.type);
        if (params?.status) filtered = filtered.filter(p => p.status === params.status);
        const page     = Number(params?.page)      || 1;
        const pageSize = Number(params?.page_size) || 20;
        const start    = (page - 1) * pageSize;
        return ok(config, { data: filtered.slice(start, start + pageSize), total: filtered.length, page, page_size: pageSize, total_pages: Math.ceil(filtered.length / pageSize) });
    }

    // ─────────────────────────────────────────────────────────────────────────
    return config;
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function ok(config, responseData, status = 200) {
    config.adapter = () =>
        Promise.resolve({ data: responseData, status, headers: {}, config, request: {} });
    return config;
}

function err(config, status, errorMsg) {
    config.adapter = () =>
        Promise.reject({ response: { status, data: { error: errorMsg } }, config });
    return config;
}
