/// <reference types="cypress" />

import { getDirectApiUrl } from '../../support/helpers';

const USER_SERVICE_URL    = getDirectApiUrl(8080);
const TRADING_SERVICE_URL = getDirectApiUrl(8082);

const ANA_EMAIL    = 'ana.anic@example.com';
const ANA_PASSWORD = 'password123';

let authToken: string;
let createdWatchlistId: number | null = null;

describe('Scenario 36: Kreiranje nove watchliste', () => {
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
        const existing = lists.find((w: any) => w.name === 'Tech akcije');
        if (existing) {
          const existingId = existing.id ?? existing.watchlist_id;
          cy.request({
            method: 'DELETE',
            url: `${TRADING_SERVICE_URL}/watchlists/${existingId}`,
            headers: { Authorization: `Bearer ${authToken}` },
            failOnStatusCode: false,
          });
        }
      });
    });
  });

  beforeEach(() => {
    createdWatchlistId = null;
    cy.loginAsClientAna();
  });

  afterEach(() => {
    if (!createdWatchlistId) return;
    cy.request({
      method: 'DELETE',
      url: `${TRADING_SERVICE_URL}/watchlists/${createdWatchlistId}`,
      headers: { Authorization: `Bearer ${authToken}` },
      failOnStatusCode: false,
    });
  });

  it('kreiranje watchliste "Tech akcije" kroz WatchlistWidget — lista se pojavljuje u panelu', () => {
    // Spy na POST /watchlists — propušta pravi poziv, beleži ID iz odgovora za cleanup
    cy.intercept('POST', '**/watchlists').as('createWatchlist');

    cy.visit('/client/securities');

    // Otvaramo WatchlistWidget (bookmark ikonica u header-u)
    cy.get('button[title="Liste praćenja"]', { timeout: 10000 }).click();

    // Klikamo "+" za novu listu
    cy.get('button[title="Nova lista"]').click();

    // Pojavljuje se input — upisujemo naziv
    cy.get('input[placeholder="Naziv nove liste..."]').type('Tech akcije');

    // Klikamo "Sačuvaj"
    cy.contains('button', 'Sačuvaj').click();

    // Čekamo realni API poziv i hvatamo ID kreiranog watchlist-a
    cy.wait('@createWatchlist').then((interception) => {
      expect(interception.response?.statusCode, 'kreiranje watchliste mora biti 200 ili 201').to.be.oneOf([200, 201]);
      const body = interception.response?.body;
      createdWatchlistId = body?.id ?? body?.watchlist_id ?? body?.watchlistId ?? null;
      expect(createdWatchlistId, 'ID kreiranog watchlist-a mora postojati').to.exist;
    });

    // Nova watchlist se pojavljuje kao tab u panelu
    cy.contains('button', 'Tech akcije', { timeout: 8000 }).should('be.visible');
  });
});
