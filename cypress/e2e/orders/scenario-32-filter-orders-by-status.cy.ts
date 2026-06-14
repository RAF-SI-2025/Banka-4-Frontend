/// <reference types="cypress" />

// Scenario 32: Filtriranje istorije ordera po statusu DONE

const MOCK_ORDERS = {
  data: [
    {
      order_id: 201,
      ticker: 'AAPL',
      listing_name: 'Apple Inc.',
      order_type: 'MARKET',
      direction: 'BUY',
      quantity: 10,
      price_per_unit: 188.5,
      status: 'DONE',
      asset_type: 'STOCK',
      last_modification: '2026-04-01T09:30:00Z',
    },
    {
      order_id: 202,
      ticker: 'TSLA',
      listing_name: 'Tesla Inc.',
      order_type: 'LIMIT',
      direction: 'SELL',
      quantity: 5,
      price_per_unit: 250.0,
      status: 'PENDING',
      asset_type: 'STOCK',
      last_modification: '2026-04-02T10:00:00Z',
    },
    {
      order_id: 203,
      ticker: 'MSFT',
      listing_name: 'Microsoft',
      order_type: 'MARKET',
      direction: 'BUY',
      quantity: 3,
      price_per_unit: 415.0,
      status: 'DONE',
      asset_type: 'STOCK',
      last_modification: '2026-04-03T11:00:00Z',
    },
  ],
  total: 3,
  page: 1,
  page_size: 100,
};

describe('Scenario 32: Filtriranje istorije ordera po statusu DONE', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/orders/my*', (req) => {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      const filtered = status && status !== 'ALL'
        ? { ...MOCK_ORDERS, data: MOCK_ORDERS.data.filter(o => o.status === status), total: MOCK_ORDERS.data.filter(o => o.status === status).length }
        : MOCK_ORDERS;
      req.reply({ statusCode: 200, body: filtered });
    }).as('getMyOrders');

    cy.loginAsClient();
    cy.visit('/orders/my');
  });

  it('prikazuje sve ordere pre filtriranja', () => {
    cy.wait('@getMyOrders');
    cy.contains('AAPL').should('be.visible');
    cy.contains('TSLA').should('be.visible');
    cy.contains('MSFT').should('be.visible');
  });

  it('prikazuje samo DONE ordere kada se odabere status DONE', () => {
    cy.wait('@getMyOrders');

    cy.contains('label', 'Status').find('select').select('DONE');

    cy.wait('@getMyOrders');

    cy.contains('AAPL').should('be.visible');
    cy.contains('MSFT').should('be.visible');
    cy.contains('TSLA').should('not.exist');
  });
});

export {};
