/// <reference types="cypress" />

// Scenario 37: Uklanjanje hartije sa watchliste
// Watchlist widget je u headeru - dostupan agentima i klijentima.

const WATCHLIST_ID = 10;
const LISTING_ID   = 1;

const WATCHLIST_SUMMARY = [{ id: WATCHLIST_ID, name: 'Moja lista' }];

const WATCHLIST_WITH_ITEMS = {
  id: WATCHLIST_ID,
  name: 'Moja lista',
  securities: [
    { id: LISTING_ID, ticker: 'AAPL', type: 'STOCK', price: 188.5, change: 0.5, changePercent: 0.27, volume: 50000000, currency: 'USD' },
    { id: 2, ticker: 'MSFT', type: 'STOCK', price: 415.0, change: -1.2, changePercent: -0.29, volume: 20000000, currency: 'USD' },
  ],
};

const WATCHLIST_AFTER_REMOVE = {
  ...WATCHLIST_WITH_ITEMS,
  securities: [WATCHLIST_WITH_ITEMS.securities[1]],
};

describe('Scenario 37: Uklanjanje hartije sa watchliste', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/watchlists', { statusCode: 200, body: WATCHLIST_SUMMARY }).as('getWatchlists');
    cy.intercept('GET', `**/api/watchlists/${WATCHLIST_ID}`, { statusCode: 200, body: WATCHLIST_WITH_ITEMS }).as('getWatchlistById');
    cy.intercept('DELETE', `**/api/watchlists/${WATCHLIST_ID}/items/${LISTING_ID}`, { statusCode: 204, body: {} }).as('removeItem');

    cy.loginAsClient();
    cy.visit('/client/securities');
    cy.wait('@getWatchlists');
    cy.wait('@getWatchlistById');
  });

  it('briše hartiju sa watchliste i uklanja je iz prikaza', () => {
    cy.get('button[title="Liste praćenja"]').click();

    cy.contains('AAPL').should('be.visible');
    cy.contains('MSFT').should('be.visible');

    cy.intercept('GET', `**/api/watchlists/${WATCHLIST_ID}`, { statusCode: 200, body: WATCHLIST_AFTER_REMOVE }).as('getWatchlistAfterRemove');

    cy.contains('tr', 'AAPL').find('button[title="Ukloni sa liste"]').click();

    cy.wait('@removeItem').its('response.statusCode').should('eq', 204);
    cy.wait('@getWatchlistAfterRemove');

    cy.contains('AAPL').should('not.exist');
    cy.contains('MSFT').should('be.visible');
  });
});

export {};
