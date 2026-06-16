/// <reference types="cypress" />

export {};

const MOCK_OFFER = {
  otc_offer_id: 10,
  ticker: 'UFG',
  amount: 2,
  price_per_stock_rsd: 180.00,
  settlement_date: '2099-12-31T00:00:00Z',
  premium: 0.5,
  buyer_id: 2001,
  seller_id: 502,
  status: 'PENDING',
};

const MOCK_ACCOUNTS = [
  {
    account_number: '265-0000000000001-01',
    name: 'Tekući račun',
    balance: 50000,
    currency: 'RSD',
  },
];

describe('Scenario 18: Prodavac šalje protivponudu', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/otc/offers/active*', {
      statusCode: 200,
      body: [MOCK_OFFER],
    }).as('getOffers');

    cy.intercept('GET', '**/peer-otc/negotiations*', {
      statusCode: 200,
      body: [],
    }).as('getPeerOffers');

    cy.intercept('PUT', '**/otc/offers/*/counter*', {
      statusCode: 200,
      body: { ...MOCK_OFFER, price_per_stock_rsd: 0.52 },
    }).as('sendCounterOffer');

    cy.intercept('GET', '**/clients/*/accounts*', {
      statusCode: 200,
      body: MOCK_ACCOUNTS,
    }).as('getAccounts');

    cy.loginAsClientAna();
    cy.visit('/otc');
  });

  it('uspešno šalje protivponudu sa izmenjenim uslovima', () => {
    cy.contains('button', /Aktivne ponude/i).click({ force: true });
    cy.wait('@getOffers');

    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.get('table tbody tr').first().find('button').contains(/Detalji/i).click();

    cy.contains('label', /Vaš račun/i)
      .parent()
      .find('select')
      .select(1);

    cy.contains('button', /Kontraponuda/i).click({ force: true });

    cy.contains('label', /Cena po akciji/i)
      .parent()
      .find('input')
      .first()
      .clear()
      .type('0.52');

    cy.contains('button', /Pošalji kontraponudu/i).click();

    cy.wait('@sendCounterOffer').its('response.statusCode').should('eq', 200);
    cy.contains(/Kontraponuda je uspešno poslata/i).should('be.visible');
  });
});
