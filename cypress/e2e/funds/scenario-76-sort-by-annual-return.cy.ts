/// <reference types="cypress" />

// Scenario 76: Sortiranje fondova po godišnjem prinosu (annualReturn)
// Sortiranje je client-side — FundDiscoveryPage sortira podatke iz performance_history.

const HIGH_RETURN_FUND = {
  id: 1,
  name: 'Alpha High Return',
  description: 'Fond sa visokim prinosom',
  total_value: 2000000,
  profit: 400000,
  minimum_contribution: 10000,
  performance_history: [
    { date: '2025-01-01', value: 100000 },
    { date: '2025-07-01', value: 150000 },
    { date: '2026-01-01', value: 200000 },
  ],
};

const LOW_RETURN_FUND = {
  id: 2,
  name: 'Beta Low Return',
  description: 'Fond sa niskim prinosom',
  total_value: 1100000,
  profit: 50000,
  minimum_contribution: 5000,
  performance_history: [
    { date: '2025-01-01', value: 100000 },
    { date: '2025-07-01', value: 102000 },
    { date: '2026-01-01', value: 110000 },
  ],
};

describe('Scenario 76: Sortiranje fondova po godišnjem prinosu', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/investment-funds*', {
      statusCode: 200,
      body: { data: [LOW_RETURN_FUND, HIGH_RETURN_FUND], total: 2 },
    }).as('getFunds');

    cy.loginAsClient();
    cy.visit('/investment-funds');
    cy.wait('@getFunds', { timeout: 10000 });
    cy.get('table', { timeout: 10000 }).should('be.visible');
  });

  it('prikazuje kolonu Godišnji prinos u tabeli', () => {
    cy.get('table thead').contains(/godišnji prinos/i).should('be.visible');
  });

  it('sortira fondove od najvišeg prema najnižem godišnjem prinosu klikom na header', () => {
    cy.get('table thead').contains(/godišnji prinos/i).click();

    cy.get('table tbody tr').first().contains('Alpha High Return').should('exist');
    cy.get('table tbody tr').last().contains('Beta Low Return').should('exist');
  });

  it('invertuje sortiranje klikom drugi put — najniži prinos prvi', () => {
    cy.get('table thead').contains(/godišnji prinos/i).click();
    cy.get('table thead').contains(/godišnji prinos/i).click();

    cy.get('table tbody tr').first().contains('Beta Low Return').should('exist');
    cy.get('table tbody tr').last().contains('Alpha High Return').should('exist');
  });
});

export {};
