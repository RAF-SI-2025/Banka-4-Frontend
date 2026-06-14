/// <reference types="cypress" />

// Scenario 39: Prikaz tipa hartije u watchlisti
// Watchlist widget prikazuje type tag pored svakog tickera.
// Verifikujemo da su hartije različitih tipova (STOCK, FUTURES) vidljive s ispravnim tagovima.

const WATCHLIST_ID = 10;

const WATCHLIST_SUMMARY = [{ id: WATCHLIST_ID, name: 'Mješovita lista' }];

const WATCHLIST_WITH_ITEMS = {
  id: WATCHLIST_ID,
  name: 'Mješovita lista',
  securities: [
    { id: 1, ticker: 'AAPL',  type: 'STOCK',   price: 188.5, change: 0.5,  changePercent: 0.27, volume: 50000000, currency: 'USD' },
    { id: 2, ticker: 'ES',    type: 'FUTURES',  price: 5300.0, change: 5.0, changePercent: 0.09, volume: 1000000,  currency: 'USD' },
    { id: 3, ticker: 'EURUSD', type: 'FOREX',   price: 1.085, change: 0.001, changePercent: 0.09, volume: 500000, currency: 'EUR' },
  ],
};

describe('Scenario 39: Prikaz tipa hartije u watchlisti', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/watchlists', { statusCode: 200, body: WATCHLIST_SUMMARY }).as('getWatchlists');
    cy.intercept('GET', `**/api/watchlists/${WATCHLIST_ID}`, { statusCode: 200, body: WATCHLIST_WITH_ITEMS }).as('getWatchlistById');

    cy.loginAsClient();
    cy.visit('/client/securities');
    cy.wait('@getWatchlists');
    cy.wait('@getWatchlistById');
  });

  it('prikazuje tip hartije (STOCK, FUTURES, FOREX) pored svakog tickera u watchlisti', () => {
    cy.get('button[title="Liste praćenja"]').click();

    cy.contains('tr', 'AAPL').contains('STOCK').should('be.visible');
    cy.contains('tr', 'ES').contains('FUTURES').should('be.visible');
    cy.contains('tr', 'EURUSD').contains('FOREX').should('be.visible');
  });

  it('prikazuje ispravne ticker vrednosti za sve hartije u listi', () => {
    cy.get('button[title="Liste praćenja"]').click();

    cy.contains('AAPL').should('be.visible');
    cy.contains('ES').should('be.visible');
    cy.contains('EURUSD').should('be.visible');
  });
});

export {};
