/// <reference types="cypress" />

// Scenario 77: Sortiranje fondova po maksimalnom drawdownu (Max Drawdown)
// Veći drawdown znači veći rizik gubitka. Sortiranje je client-side.

const HIGH_DRAWDOWN_FUND = {
  id: 3,
  name: 'Volatile Risk Fund',
  description: 'Fond sa visokim drawdownom',
  total_value: 800000,
  profit: -50000,
  minimum_contribution: 10000,
  performance_history: [
    { date: '2025-01-01', value: 100000 },
    { date: '2025-04-01', value: 140000 },
    { date: '2025-07-01', value: 70000 },
    { date: '2026-01-01', value: 80000 },
  ],
};

const LOW_DRAWDOWN_FUND = {
  id: 4,
  name: 'Stable Conservative Fund',
  description: 'Fond sa niskim drawdownom',
  total_value: 1200000,
  profit: 80000,
  minimum_contribution: 5000,
  performance_history: [
    { date: '2025-01-01', value: 100000 },
    { date: '2025-07-01', value: 105000 },
    { date: '2026-01-01', value: 110000 },
  ],
};

describe('Scenario 77: Sortiranje fondova po maksimalnom drawdownu', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/investment-funds*', {
      statusCode: 200,
      body: { data: [LOW_DRAWDOWN_FUND, HIGH_DRAWDOWN_FUND], total: 2 },
    }).as('getFunds');

    cy.loginAsClient();
    cy.visit('/investment-funds');
    cy.wait('@getFunds', { timeout: 10000 });
    cy.get('table', { timeout: 10000 }).should('be.visible');
  });

  it('prikazuje kolonu Max Drawdown u tabeli', () => {
    cy.get('table thead').contains(/max.?drawdown/i).should('be.visible');
  });

  it('sortira fondove od najvišeg prema najnižem drawdownu klikom na header', () => {
    cy.get('table thead').contains(/max.?drawdown/i).click();

    cy.get('table tbody tr').first().contains('Volatile Risk Fund').should('exist');
    cy.get('table tbody tr').last().contains('Stable Conservative Fund').should('exist');
  });

  it('invertuje sortiranje klikom drugi put — najniži drawdown prvi', () => {
    cy.get('table thead').contains(/max.?drawdown/i).click();
    cy.get('table thead').contains(/max.?drawdown/i).click();

    cy.get('table tbody tr').first().contains('Stable Conservative Fund').should('exist');
    cy.get('table tbody tr').last().contains('Volatile Risk Fund').should('exist');
  });
});

export {};
