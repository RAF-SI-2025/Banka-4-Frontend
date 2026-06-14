/// <reference types="cypress" />

// Scenario 51: Pauziranje trajnog naloga (DCA)

const RECURRING_ORDER_ID = 42;

const ACTIVE_ORDER = {
  recurring_order_id: RECURRING_ORDER_ID,
  listing_id: 1,
  account_number: '111-000-001',
  direction: 'BUY',
  cadence: 'MONTHLY',
  mode: 'BY_AMOUNT',
  value: 5000,
  active: true,
  next_run: new Date(Date.now() + 30 * 86400000).toISOString(),
};

describe('Scenario 51: Pauziranje trajnog naloga', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/client/*/assets', { statusCode: 200, body: { data: [], assets: [] } }).as('getPortfolio');
    cy.intercept('GET', '**/api/recurring-orders', { statusCode: 200, body: [ACTIVE_ORDER] }).as('getRecurringOrders');
    cy.intercept('PATCH', `**/api/recurring-orders/${RECURRING_ORDER_ID}/pause`, {
      statusCode: 200,
      body: { ...ACTIVE_ORDER, active: false },
    }).as('pauseOrder');

    cy.loginAsClientAna();
    cy.visit('/client/dtc');
    cy.wait('@getPortfolio');
    cy.wait('@getRecurringOrders');
  });

  it('pauzira aktivan trajni nalog i menja prikaz statusa', () => {
    cy.contains('Da').should('be.visible');

    cy.intercept('GET', '**/api/recurring-orders', {
      statusCode: 200,
      body: [{ ...ACTIVE_ORDER, active: false }],
    }).as('getRecurringOrdersAfterPause');

    cy.contains('button', 'Pauziraj').click();

    cy.wait('@pauseOrder').its('response.statusCode').should('eq', 200);
    cy.wait('@getRecurringOrdersAfterPause');

    cy.contains('Ne').should('be.visible');
    cy.contains('button', 'Aktiviraj').should('be.visible');
    cy.contains('button', 'Pauziraj').should('not.exist');
  });
});

export {};
