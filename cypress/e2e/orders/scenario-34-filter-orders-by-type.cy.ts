/// <reference types="cypress" />

// Scenario 34: Filtriranje istorije ordera po tipu LIMIT

const ALL_ORDERS = [
  {
    order_id: 401,
    ticker: 'NVDA',
    listing_name: 'NVIDIA Corp.',
    order_type: 'MARKET',
    direction: 'BUY',
    quantity: 5,
    price_per_unit: 800.0,
    status: 'DONE',
    asset_type: 'STOCK',
    last_modification: '2026-04-01T09:00:00Z',
  },
  {
    order_id: 402,
    ticker: 'META',
    listing_name: 'Meta Platforms',
    order_type: 'LIMIT',
    direction: 'BUY',
    quantity: 3,
    price_per_unit: 500.0,
    status: 'DONE',
    asset_type: 'STOCK',
    last_modification: '2026-04-02T10:00:00Z',
  },
  {
    order_id: 403,
    ticker: 'NFLX',
    listing_name: 'Netflix Inc.',
    order_type: 'LIMIT',
    direction: 'SELL',
    quantity: 2,
    price_per_unit: 650.0,
    status: 'PENDING',
    asset_type: 'STOCK',
    last_modification: '2026-04-03T11:00:00Z',
  },
  {
    order_id: 404,
    ticker: 'DIS',
    listing_name: 'The Walt Disney Company',
    order_type: 'STOP',
    direction: 'SELL',
    quantity: 10,
    price_per_unit: 100.0,
    status: 'DECLINED',
    asset_type: 'STOCK',
    last_modification: '2026-04-04T12:00:00Z',
  },
];

describe('Scenario 34: Filtriranje istorije ordera po tipu LIMIT', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/orders/my*', (req) => {
      const url = new URL(req.url);
      const orderType = url.searchParams.get('order_type');

      const filtered = orderType && orderType !== 'ALL'
        ? ALL_ORDERS.filter(o => o.order_type === orderType)
        : ALL_ORDERS;

      req.reply({ statusCode: 200, body: { data: filtered, total: filtered.length } });
    }).as('getMyOrders');

    cy.loginAsClient();
    cy.visit('/orders/my');
  });

  it('prikazuje sve ordere pre filtriranja', () => {
    cy.wait('@getMyOrders');
    cy.contains('NVDA').should('be.visible');
    cy.contains('META').should('be.visible');
    cy.contains('NFLX').should('be.visible');
    cy.contains('DIS').should('be.visible');
  });

  it('prikazuje samo LIMIT ordere kada se odabere tip LIMIT', () => {
    cy.wait('@getMyOrders');

    cy.contains('label', 'Tip ordera').find('select').select('LIMIT');

    cy.wait('@getMyOrders');

    cy.contains('META').should('be.visible');
    cy.contains('NFLX').should('be.visible');
    cy.contains('NVDA').should('not.exist');
    cy.contains('DIS').should('not.exist');
  });
});

export {};
