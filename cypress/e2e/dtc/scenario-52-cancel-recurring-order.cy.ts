/// <reference types="cypress" />

// Scenario 52: Otkazivanje trajnog naloga (DCA)

const RECURRING_ORDER_ID = 43;

const ACTIVE_ORDER = {
  recurring_order_id: RECURRING_ORDER_ID,
  listing_id: 2,
  account_number: '111-000-001',
  direction: 'BUY',
  cadence: 'WEEKLY',
  mode: 'BY_QUANTITY',
  value: 10,
  active: true,
  next_run: new Date(Date.now() + 7 * 86400000).toISOString(),
};

describe('Scenario 52: Otkazivanje trajnog naloga', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/client/*/assets', { statusCode: 200, body: { data: [], assets: [] } }).as('getPortfolio');
    cy.intercept('GET', '**/api/recurring-orders', { statusCode: 200, body: [ACTIVE_ORDER] }).as('getRecurringOrders');
    cy.intercept('DELETE', `**/api/recurring-orders/${RECURRING_ORDER_ID}`, { statusCode: 204, body: {} }).as('cancelOrder');

    cy.loginAsClientAna();
    cy.visit('/client/dtc');
    cy.wait('@getPortfolio');
    cy.wait('@getRecurringOrders');
  });

  it('otkazuje trajni nalog i uklanja ga iz liste', () => {
    cy.intercept('GET', '**/api/recurring-orders', { statusCode: 200, body: [] }).as('getRecurringOrdersEmpty');

    cy.contains('button', 'Otkaži').click();

    cy.wait('@cancelOrder').its('response.statusCode').should('eq', 204);
    cy.wait('@getRecurringOrdersEmpty');

    cy.contains('Nema aktivnih trajnih naloga').should('be.visible');
  });
});

export {};
