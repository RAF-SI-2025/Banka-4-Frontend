/// <reference types="cypress" />

export {};

describe('Scenario 36: SELL order iz portfolija otvara formu za prodaju', () => {

  beforeEach(() => {
    cy.intercept('GET', '**/client/**/assets*', {
      statusCode: 200,
      body: [
        {
          ticker: 'AAPL',
          type: 'STOCK',
          amount: 10,
          averageBuyingPrice: 150.00,
          profit: 250.00,
          publiclyAvailable: 5,
        },
      ],
    }).as('getAssets');

    cy.intercept('GET', '**/client/**/accumulated-tax*', {
      statusCode: 200,
      body: { totalTax: 0 },
    }).as('getTax');

    cy.loginAsClientAna();
    cy.visit('/client/portfolio');
  });

  it('klik na PRODAJ otvara modal sa SELL formom', () => {
    cy.get('table', { timeout: 10000 }).should('be.visible');

    cy.contains('button', /PRODAJ/i).first().should('be.visible').click({ force: true });

    cy.contains(/Prodaj —|Sell —/i).should('be.visible');

    cy.get('body').type('{esc}');
  });

  it('forma sadrži polje za unos količine', () => {
    cy.contains('button', /PRODAJ/i).first().click({ force: true });

    cy.get('input[type="number"]').first().should('exist');

    cy.get('body').type('{esc}');
  });

  it('unos validne količine i izbor računa omogućava korak za potvrdu', () => {
    cy.contains('button', /PRODAJ/i).first().click({ force: true });

    cy.get('select').eq(1).should('not.contain', 'Učitavanje...');
    cy.get('select').eq(1).select(1, { force: true });

    cy.get('input[type="number"]').first().should('be.visible').clear({ force: true }).type('1');

    cy.contains('button', /Nastavi/i).should('be.visible').click({ force: true });

    cy.contains(/Potvrda/i, { timeout: 8000 }).should('be.visible');
    cy.contains('button', /Potvrdi/i).should('be.visible');

    cy.get('body').type('{esc}');
  });
});
