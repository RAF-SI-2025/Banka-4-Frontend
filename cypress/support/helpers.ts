export type TestUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  identity_type: 'employee' | 'client';
  is_admin?: boolean;
  permissions: string[];
};

export const agentUser: TestUser = {
  id: 9002,
  first_name: 'Aca',
  last_name: 'Agent',
  email: 'agent@raf.rs',
  identity_type: 'employee',
  is_admin: false,
  permissions: ['orders.create'],
};

export const supervisorUser: TestUser = {
  id: 9001,
  first_name: 'Sanja',
  last_name: 'Supervizor',
  email: 'supervisor@raf.rs',
  identity_type: 'employee',
  is_admin: false,
  permissions: ['supervisor'],
};

export const clientUser: TestUser = {
  id: 2,
  first_name: 'Marko',
  last_name: 'Marković',
  email: 'marko.markovic@example.com',
  identity_type: 'client',
  is_admin: false,
  permissions: [],
};

export const marginClientUser: TestUser = {
  id: 2,
  first_name: 'Marko',
  last_name: 'Marković',
  email: 'marko.markovic@example.com',
  identity_type: 'client',
  is_admin: false,
  permissions: ['margin.trade'],
};

export function tradingApiUrl(): string {
  const url = Cypress.env('TRADING_API_URL') as string | undefined;
  return url && !url.includes('localhost') ? url : 'http://rafsi.davidovic.io:8082/api';
}

export function loginAs(user: TestUser, targetPath = '/'): void {
  cy.visit(targetPath, {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', 'test-token');
      win.localStorage.setItem('refreshToken', 'test-refresh-token');
      win.localStorage.setItem('user', JSON.stringify(user));
    },
  });
}

export function buildStocks() {
  return [
    {
      listing_id: 1,
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      exchange: 'NASDAQ',
      price: 415.2,
      change: 3.5,
      change_percent: 0.85,
      volume: 22000000,
      bid: 415.0,
      ask: 415.4,
      maintenance_margin: 0,
      initial_margin_cost: 500,
      currency: 'USD',
    },
    {
      listing_id: 2,
      ticker: 'AAPL',
      name: 'Apple Inc.',
      exchange: 'NASDAQ',
      price: 188.5,
      change: -1.2,
      change_percent: -0.63,
      volume: 55000000,
      bid: 188.3,
      ask: 188.7,
      maintenance_margin: 0,
      initial_margin_cost: 500,
      currency: 'USD',
    },
    {
      listing_id: 3,
      ticker: 'JPM',
      name: 'JPMorgan Chase',
      exchange: 'NYSE',
      price: 195.0,
      change: 0.8,
      change_percent: 0.41,
      volume: 9000000,
      bid: 194.9,
      ask: 195.1,
      maintenance_margin: 0,
      initial_margin_cost: 500,
      currency: 'USD',
    },
  ];
}

export function buildClientAccounts(balance = 10000) {
  return [
    {
      account_number: '340-111-222',
      name: 'Tekući račun',
      balance,
      currency: 'USD',
    },
  ];
}

export function buildLoans(loans: any[] = []) {
  return loans;
}

export function openBuyModal() {
  cy.contains('MSFT').click();
  cy.wait('@getStockDetails');
  cy.contains('Kupi').click();
}

export function extractFunds(body: any) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.data)) return body.data.data;
  return [];
}

export function extractAccounts(body: any) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export function pickArray(body: any) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.content)) return body.content;
  return [];
}

export function getDirectApiUrl(targetPort: 8080 | 8081 | 8082): string {
  const apiUrl = Cypress.env('API_URL') as string | undefined;
  if (!apiUrl) throw new Error('Missing Cypress env API_URL');

  return apiUrl
    .replace(':8080/api', `:${targetPort}/api`)
    .replace(':8081/api', `:${targetPort}/api`)
    .replace(':8082/api', `:${targetPort}/api`);
}

export function extractOrderId(body: any): string | null {
  return (
    body?.order_id ??
    body?.id ??
    body?.data?.order_id ??
    body?.data?.id ??
    null
  );
}
