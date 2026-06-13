/// <reference types="cypress" />

import { getDirectApiUrl } from '../../support/helpers';

const USER_SERVICE_URL    = getDirectApiUrl(8080);
const TRADING_SERVICE_URL = getDirectApiUrl(8082);

const ANA_EMAIL    = 'ana.anic@example.com';
const ANA_PASSWORD = 'password123';

let authToken: string;
let createdAlertId: number | null = null;

describe('Feature: Price Alert — Celina 3', () => {
  before(() => {
    cy.request('POST', `${USER_SERVICE_URL}/auth/login`, {
      email: ANA_EMAIL,
      password: ANA_PASSWORD,
    }).then((res) => {
      expect(res.status).to.eq(200);
      authToken = res.body.token;
    });
  });

  beforeEach(() => {
    createdAlertId = null;
    cy.loginAsClientAna();
  });

  afterEach(() => {
    if (!createdAlertId) return;
    cy.request({
      method: 'DELETE',
      url: `${TRADING_SERVICE_URL}/price-alerts/${createdAlertId}`,
      headers: { Authorization: `Bearer ${authToken}` },
      failOnStatusCode: false,
    });
  });

  it('Scenario 29: Alert ABOVE 999999 ostaje aktivan — alert vidljiv u listi, hint poruka prikazana', () => {
    cy.intercept('POST', '**/price-alerts').as('createAlert');

    cy.visit('/client/securities');

    cy.contains('tbody tr', 'DTCX', { timeout: 15000 }).click();

    cy.contains('button', 'Osveži', { timeout: 10000 }).should('be.visible');

    cy.get('button[aria-label="Price alert"]').first().scrollIntoView().click({ force: true });

    cy.get('input[placeholder="Unesite cenu..."]', { timeout: 8000 }).clear().type('999999');

    cy.contains('button', 'Postavi upozorenje').click();

    cy.wait('@createAlert').then((interception) => {
      expect(interception.response?.statusCode, 'kreiranje price alert-a mora biti uspešno').to.eq(201);
      const body = interception.response?.body;
      createdAlertId = body?.price_alert_id ?? body?.id ?? null;
      expect(createdAlertId, 'price_alert_id mora postojati u odgovoru').to.exist;
    });

    // Alert se pojavljuje u sekciji Aktivna upozorenja unutar modala
    cy.contains('p', 'Aktivna upozorenja').should('be.visible');
    cy.get('[class*="alertRow"]', { timeout: 8000 }).should('have.length.at.least', 1);

    // Cena nikad neće biti iznad 999999 — prikazuje se hint poruka (ne banner)
    cy.get('[data-testid="success-hint"]').should('be.visible');
    cy.get('[data-testid="success-hint"]').should('contain.text', 'Upozorenje postavljeno');
  });
});
