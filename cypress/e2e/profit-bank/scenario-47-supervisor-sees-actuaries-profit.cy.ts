import { loginAs, mockActuaries, supervisorUser, tradingApiUrl, bankingApiUrl } from './helpers';

describe('Scenario 47: Supervizor vidi spisak aktuara sa profitom', () => {
  beforeEach(() => {
    cy.intercept('GET', `**/profit/actuaries`, {
      statusCode: 200,
      body: mockActuaries,
    }).as('getActuaryPerformances');

    cy.intercept('GET', `**/profit/funds`, {
      statusCode: 200,
      body: [],
    }).as('getFundPositions');

    cy.intercept('GET', `**/accounts**`, {
      statusCode: 200,
      body: { data: [] },
    }).as('getAccounts');

    cy.intercept('GET', '**/actuary/**/assets**', {
      statusCode: 200,
      body: [],
    }).as('getActuaryPortfolio');

    cy.intercept('GET', `**/investment-funds**`, {
      statusCode: 200,
      body: { data: [], total: 0 },
    }).as('getFunds');

    cy.intercept('POST', '**/auth/refresh**', {
      statusCode: 200,
      body: { token: 'test-token', refresh_token: 'test-refresh-token' },
    }).as('tokenRefresh');

    loginAs(supervisorUser, '/profit-bank');
  });

  it('vidi listu svih aktuara sa imenom, prezimenom i profitom u RSD', () => {
    cy.wait('@getActuaryPerformances');

    cy.contains('button', 'Profit aktuara').should('be.visible');

    cy.get('table thead th').should('contain', 'Ime');
    cy.get('table thead th').should('contain', 'Prezime');
    cy.get('table thead th').should('contain', 'Profit u RSD');

    cy.get('table tbody tr').should('have.length.greaterThan', 0);

    cy.contains('td', 'Milan').should('be.visible');
    cy.contains('td', 'Marković').should('be.visible');

    cy.contains('td', 'Sara').should('be.visible');
    cy.contains('td', 'Supervizor').should('be.visible');

    cy.contains('td', /RSD/).should('be.visible');
  });
});
