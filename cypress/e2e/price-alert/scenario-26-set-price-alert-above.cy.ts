/// <reference types="cypress" />

import { getDirectApiUrl } from '../../support/helpers';

const USER_SERVICE_URL    = getDirectApiUrl(8080);
const TRADING_SERVICE_URL = getDirectApiUrl(8082);

const ANA_EMAIL    = 'ana.anic@example.com';
const ANA_PASSWORD = 'password123';

let authToken: string;
let testListingId: number | null = null;
let createdAlertId: number | null = null;

describe('Feature: Price Alert — Celina 3', () => {
  before(() => {
    cy.request('POST', `${USER_SERVICE_URL}/auth/login`, {
      email: ANA_EMAIL,
      password: ANA_PASSWORD,
    }).then((res) => {
      expect(res.status).to.eq(200);
      authToken = res.body.token;

      cy.request({
        method: 'GET',
        url: `${TRADING_SERVICE_URL}/listings/stocks`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((stocksRes) => {
        const list: any[] = stocksRes.body?.data ?? stocksRes.body ?? [];
        testListingId = list[0]?.listing_id ?? list[0]?.id ?? null;
        expect(testListingId, 'mora postojati bar jedna akcija u sistemu').to.exist;
      });
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

  it('Scenario 26: Kreiranje price alert-a sa uslovom ABOVE vraća 201 i aktivan alert', () => {
    cy.request({
      method: 'POST',
      url: `${TRADING_SERVICE_URL}/price-alerts`,
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        listing_id: testListingId,
        threshold: 200,
        condition: 'ABOVE',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, 'kreiranje price alert-a mora vratiti 201').to.eq(201);

      const body = res.body;
      createdAlertId = body?.price_alert_id ?? body?.id ?? null;

      expect(createdAlertId, 'price_alert_id mora postojati u odgovoru').to.exist;
      expect(body.condition ?? body.type, 'uslov mora biti ABOVE').to.eq('ABOVE');
      expect(Number(body.threshold ?? body.price), 'prag mora biti 200').to.eq(200);
      expect(body.listing_id, 'listing_id mora odgovarati poslatom').to.eq(testListingId);
      expect(body.is_active ?? body.active, 'alert mora biti aktivan posle kreiranja').to.be.true;
    });
  });
});
