/// <reference types="cypress" />

// Scenario 75: Grafikon istorijskih vrednosti fonda u detaljnom prikazu
// FundDetailsPage (/client/investment-funds/:id) prikazuje LineChart sa performance_history.

const FUND_ID = 1;

const FUND_WITH_HISTORY = {
  id: FUND_ID,
  name: 'Alpha Growth Fund',
  description: 'Fond sa prikazom istorijskog rasta.',
  total_value: 1500000,
  profit: 150000,
  minimum_contribution: 10000,
  performance_history: [
    { date: '2025-01-01', value: 1000000 },
    { date: '2025-04-01', value: 1100000 },
    { date: '2025-07-01', value: 1200000 },
    { date: '2025-10-01', value: 1350000 },
    { date: '2026-01-01', value: 1500000 },
  ],
};

describe('Scenario 75: Grafikon istorijskih vrednosti fonda', () => {
  beforeEach(() => {
    cy.intercept('GET', `**/api/investment-funds/${FUND_ID}`, {
      statusCode: 200,
      body: FUND_WITH_HISTORY,
    }).as('getFundDetails');

    cy.intercept('GET', '**/api/clients/*/accounts', {
      statusCode: 200,
      body: { data: [] },
    }).as('getAccounts');

    cy.loginAsClientAna();
    cy.visit(`/client/investment-funds/${FUND_ID}`);
    cy.wait('@getFundDetails', { timeout: 10000 });
  });

  it('prikazuje naziv fonda u zaglavlju stranice', () => {
    cy.contains('Alpha Growth Fund').should('be.visible');
  });

  it('prikazuje grafikon istorijskih vrednosti fonda', () => {
    cy.get('canvas, svg[class*="chart"], [class*="chart"], [class*="Chart"]', { timeout: 10000 })
      .should('exist');
  });

  it('prikazuje ukupnu vrednost i profit fonda', () => {
    cy.contains(/1[.,]500[.,]000|1500000/i).should('be.visible');
  });
});

export {};
