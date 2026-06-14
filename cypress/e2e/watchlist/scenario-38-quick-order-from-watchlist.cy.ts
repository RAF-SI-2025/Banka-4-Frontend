/// <reference types="cypress" />

// Scenario 38: Brzo kreiranje ordera iz watchliste
// Klik na hartiju u watchlist widgetu navigira na /client/securities sa selectId state-om.

const WATCHLIST_ID = 10;
const LISTING_ID   = 5;

const WATCHLIST_SUMMARY = [{ id: WATCHLIST_ID, name: 'Tech' }];

const WATCHLIST_WITH_ITEMS = {
  id: WATCHLIST_ID,
  name: 'Tech',
  securities: [
    { id: LISTING_ID, ticker: 'NVDA', type: 'STOCK', price: 800.0, change: 10.0, changePercent: 1.27, volume: 30000000, currency: 'USD' },
  ],
};

describe('Scenario 38: Brzo kreiranje ordera klikom na hartiju u watchlisti', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/watchlists', { statusCode: 200, body: WATCHLIST_SUMMARY }).as('getWatchlists');
    cy.intercept('GET', `**/api/watchlists/${WATCHLIST_ID}`, { statusCode: 200, body: WATCHLIST_WITH_ITEMS }).as('getWatchlistById');
    cy.intercept('GET', '**/api/listings/stocks*', { statusCode: 200, body: { data: [] } }).as('getStocks');

    cy.loginAsClient();
    cy.visit('/client/securities');
    cy.wait('@getWatchlists');
    cy.wait('@getWatchlistById');
  });

  it('navigira na stranicu hartija kada korisnik klikne na hartiju u watchlisti', () => {
    cy.get('button[title="Liste praćenja"]').click();

    cy.contains('NVDA').should('be.visible');

    cy.contains('tr', 'NVDA').click();

    cy.url().should('include', '/client/securities');
  });
});

export {};
