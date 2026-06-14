/// <reference types="cypress" />

// Scenario 33: Filtriranje istorije ordera po opsegu datuma

const ALL_ORDERS = [
  {
    order_id: 301,
    ticker: 'AAPL',
    listing_name: 'Apple Inc.',
    order_type: 'MARKET',
    direction: 'BUY',
    quantity: 10,
    price_per_unit: 188.5,
    status: 'DONE',
    asset_type: 'STOCK',
    last_modification: '2026-01-15T09:00:00Z',
  },
  {
    order_id: 302,
    ticker: 'GOOG',
    listing_name: 'Alphabet Inc.',
    order_type: 'LIMIT',
    direction: 'BUY',
    quantity: 2,
    price_per_unit: 170.0,
    status: 'DONE',
    asset_type: 'STOCK',
    last_modification: '2026-03-20T10:00:00Z',
  },
  {
    order_id: 303,
    ticker: 'AMZN',
    listing_name: 'Amazon.com',
    order_type: 'MARKET',
    direction: 'SELL',
    quantity: 1,
    price_per_unit: 200.0,
    status: 'DONE',
    asset_type: 'STOCK',
    last_modification: '2026-05-10T11:00:00Z',
  },
];

describe('Scenario 33: Filtriranje istorije ordera po opsegu datuma', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/orders/my*', (req) => {
      const url = new URL(req.url);
      const fromDate = url.searchParams.get('from_date');
      const toDate = url.searchParams.get('to_date');

      let filtered = ALL_ORDERS;
      if (fromDate) {
        const from = new Date(fromDate).getTime();
        filtered = filtered.filter(o => new Date(o.last_modification).getTime() >= from);
      }
      if (toDate) {
        const to = new Date(toDate).getTime() + 86400000;
        filtered = filtered.filter(o => new Date(o.last_modification).getTime() <= to);
      }

      req.reply({ statusCode: 200, body: { data: filtered, total: filtered.length } });
    }).as('getMyOrders');

    cy.loginAsClient();
    cy.visit('/orders/my');
  });

  it('prikazuje sve ordere bez filtera datuma', () => {
    cy.wait('@getMyOrders');
    cy.contains('AAPL').should('be.visible');
    cy.contains('GOOG').should('be.visible');
    cy.contains('AMZN').should('be.visible');
  });

  it('filtrira ordere po opsegu od 2026-03-01 do 2026-04-30', () => {
    cy.wait('@getMyOrders');

    cy.contains('label', 'Datum od').find('input[type="date"]').type('2026-03-01');
    cy.contains('label', 'Datum do').find('input[type="date"]').type('2026-04-30');

    cy.wait('@getMyOrders');

    cy.contains('GOOG').should('be.visible');
    cy.contains('AAPL').should('not.exist');
    cy.contains('AMZN').should('not.exist');
  });
});

export {};
