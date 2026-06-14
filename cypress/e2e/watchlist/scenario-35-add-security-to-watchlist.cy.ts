/// <reference types="cypress" />

import { getDirectApiUrl } from '../../support/helpers';

const USER_SERVICE_URL    = getDirectApiUrl(8080);
const TRADING_SERVICE_URL = getDirectApiUrl(8082);

const ANA_EMAIL    = 'ana.anic@example.com';
const ANA_PASSWORD = 'password123';

let authToken: string;
let watchlistId: number | null = null;
let addedListingId: number | null = null;

describe('Scenario 35: Dodavanje hartije na watchlist', () => {
  before(() => {
    cy.request('POST', `${USER_SERVICE_URL}/auth/login`, {
      email: ANA_EMAIL,
      password: ANA_PASSWORD,
    }).then((res) => {
      expect(res.status).to.eq(200);
      authToken = res.body.token;

      // Čistimo eventualni ostatak iz prethodnog run-a
      cy.request({
        method: 'GET',
        url: `${TRADING_SERVICE_URL}/watchlists`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((wRes) => {
        const lists: any[] = wRes.body?.data ?? wRes.body ?? [];
        const existing = lists.find((w: any) => w.name === 'Test praćenje');
        if (existing) {
          cy.request({
            method: 'DELETE',
            url: `${TRADING_SERVICE_URL}/watchlists/${existing.id ?? existing.watchlist_id}`,
            headers: { Authorization: `Bearer ${authToken}` },
            failOnStatusCode: false,
          });
        }
      });

      cy.request({
        method: 'POST',
        url: `${TRADING_SERVICE_URL}/watchlists`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: { name: 'Test praćenje' },
      }).then((createRes) => {
        expect(createRes.status).to.be.oneOf([200, 201]);
        watchlistId = createRes.body?.id ?? createRes.body?.watchlist_id ?? null;
        expect(watchlistId, 'watchlist ID mora biti kreiran').to.exist;
      });
    });
  });

  beforeEach(() => {
    addedListingId = null;
    cy.loginAsClientAna();
  });

  afterEach(() => {
    if (!watchlistId || !addedListingId) return;
    cy.request({
      method: 'DELETE',
      url: `${TRADING_SERVICE_URL}/watchlists/${watchlistId}/items/${addedListingId}`,
      headers: { Authorization: `Bearer ${authToken}` },
      failOnStatusCode: false,
    });
  });

  after(() => {
    if (!watchlistId) return;
    // Brisanje hartije pre liste u slučaju da backend ne dozvoljava brisanje neprazne liste
    if (addedListingId) {
      cy.request({
        method: 'DELETE',
        url: `${TRADING_SERVICE_URL}/watchlists/${watchlistId}/items/${addedListingId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      });
    }
    cy.request({
      method: 'DELETE',
      url: `${TRADING_SERVICE_URL}/watchlists/${watchlistId}`,
      headers: { Authorization: `Bearer ${authToken}` },
      failOnStatusCode: false,
    });
  });

  it('dodaje DTCX na watchlist kroz zvezdicu u SecurityDetails', () => {
    cy.intercept('POST', '**/watchlists/*/items').as('addItem');

    cy.visit('/client/securities');

    cy.contains('tbody tr', 'DTCX', { timeout: 15000 }).click();

    cy.get('button[aria-label="Watchlist"]', { timeout: 10000 }).first().click({ force: true });

    cy.get('body').contains('Test praćenje', { timeout: 8000 });

    cy.get('body').find('input[type="checkbox"]').first().check({ force: true });

    cy.wait('@addItem').then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 201, 204]);
      addedListingId = interception.request.body?.listing_id ?? null;
    });

    // Otvaramo WatchlistWidget u headeru i proveravamo da se DTCX vidi
    cy.get('button[title="Liste praćenja"]').click();
    cy.contains('button', 'Test praćenje', { timeout: 8000 }).click();
    cy.get('table').contains('td', 'DTCX').should('be.visible');
  });
});
