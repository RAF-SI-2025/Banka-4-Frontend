/// <reference types="cypress" />

import { ANA_ACCOUNT, daysBetweenNow, getFieldSelect } from './helpers';

const TARGET_TICKER = 'SLDP';
const TARGET_LISTING_ID = 1003;
const ANA_ACCOUNT_NUMBER = ANA_ACCOUNT || '111-000-001';

const MOCK_STOCKS = [
  { listing_id: TARGET_LISTING_ID, ticker: TARGET_TICKER, name: 'SLDP Corp', exchange: 'NASDAQ', price: 5.00, currency: 'USD' },
  { listing_id: 1001, ticker: 'CERS', name: 'CERS Corp', exchange: 'NASDAQ', price: 25.00, currency: 'USD' },
];

const MOCK_ACCOUNTS = [
  {
    account_number: ANA_ACCOUNT_NUMBER,
    name: 'Ana RSD Račun',
    balance: 50000,
    currency: 'RSD',
    status: 'ACTIVE',
  },
];

describe('Scenario 48: Kreiranje trajnog naloga BYQUANTITY', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/listings/stocks*', {
      statusCode: 200,
      body: { data: MOCK_STOCKS, total: MOCK_STOCKS.length },
    }).as('getStocks');

    cy.intercept('GET', '**/clients/*/accounts*', {
      statusCode: 200,
      body: { data: MOCK_ACCOUNTS },
    }).as('getAccounts');

    cy.intercept('GET', '**/api/recurring-orders*', {
      statusCode: 200,
      body: [],
    }).as('getRecurringOrders');

    cy.intercept('POST', '**/api/recurring-orders*', (req) => {
      const nextRun = new Date(Date.now() + 7 * 86400000).toISOString();
      req.reply({
        statusCode: 201,
        body: {
          recurring_order_id: 9002,
          active: true,
          mode: req.body.mode,
          direction: req.body.direction,
          cadence: req.body.cadence,
          value: req.body.value,
          account_number: req.body.account_number,
          listing_id: req.body.listing_id,
          next_run: nextRun,
        },
      });
    }).as('createRecurringOrder');

    cy.loginAsClientAna();
    cy.visit('/client/dtc');
  });

  it('kreira RecurringOrder sa active=true za nedeljni BY_QUANTITY nalog', () => {
    cy.wait('@getStocks').its('response.statusCode').should('eq', 200);
    cy.wait('@getAccounts').its('response.statusCode').should('eq', 200);
    cy.wait('@getRecurringOrders').its('response.statusCode').should('eq', 200);

    cy.contains('button', /kreiraj trajni nalog/i)
      .should('be.visible')
      .and('not.be.disabled')
      .click();

    cy.contains('h3', /kreiraj trajni nalog/i).should('be.visible');

    getFieldSelect('Smer').select('BUY');
    getFieldSelect('Hartija').select(String(TARGET_LISTING_ID));
    cy.contains('button', /po količini/i).click();
    getFieldSelect('Učestalost').select('WEEKLY');

    cy.get('input[placeholder="Unesite količinu"]')
      .should('be.visible')
      .clear()
      .type('5');

    getFieldSelect('Račun').select(ANA_ACCOUNT_NUMBER);

    cy.contains('button', /^Kreiraj nalog$/i).click();

    cy.wait('@createRecurringOrder').then(({ request, response }) => {
      expect(response?.statusCode).to.eq(201);

      expect(request.body).to.deep.include({
        account_number: ANA_ACCOUNT_NUMBER,
        cadence: 'WEEKLY',
        direction: 'BUY',
        listing_id: TARGET_LISTING_ID,
        mode: 'BY_QUANTITY',
        value: 5,
      });

      const body = response?.body ?? {};
      const createdRecurringOrderId = body.recurring_order_id;

      expect(createdRecurringOrderId, 'recurring_order_id mora postojati').to.exist;
      expect(body.active).to.eq(true);
      expect(body.mode).to.eq('BY_QUANTITY');
      expect(body.direction).to.eq('BUY');
      expect(body.cadence).to.eq('WEEKLY');
      expect(Number(body.value)).to.eq(5);
      expect(body.account_number).to.eq(ANA_ACCOUNT_NUMBER);
      expect(Number(body.listing_id), 'response listing_id mora odgovarati izabranoj hartiji').to.eq(TARGET_LISTING_ID);
      expect(body.next_run, 'next_run mora postojati').to.be.a('string').and.not.empty;

      const diffDays = daysBetweenNow(body.next_run);
      expect(diffDays, 'next_run za WEEKLY treba da bude približno za sledeću nedelju')
        .to.be.greaterThan(5)
        .and.to.be.lessThan(9);
    });

    cy.contains('td', 'WEEKLY').should('be.visible');
    cy.contains('td', ANA_ACCOUNT_NUMBER).should('be.visible');
    cy.contains('td', /5 kom/i).should('be.visible');
    cy.contains('span', /^Da$/i).should('be.visible');
  });
});

export {};
