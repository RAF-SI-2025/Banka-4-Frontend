/// <reference types="cypress" />

export {};

const MOCK_OFFER = {
  otc_offer_id: 11,
  ticker: 'UFG',
  amount: 2,
  price_per_stock_rsd: 182.00,
  settlement_date: '2099-12-31T00:00:00Z',
  premium: 0.5,
  buyer_id: 2001,
  seller_id: 502,
  status: 'COUNTER',
};

const MOCK_ACCOUNTS = [
  {
    account_number: '265-0000000000002-01',
    name: 'Tekući račun',
    balance: 50000,
    currency: 'RSD',
  },
];

describe('Scenario 19: Kupac prihvata ponudu', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/otc/offers/active*', {
      statusCode: 200,
      body: [MOCK_OFFER],
    }).as('getOffers');

    cy.intercept('GET', '**/peer-otc/negotiations*', {
      statusCode: 200,
      body: [],
    }).as('getPeerOffers');

    cy.intercept('PATCH', '**/otc/offers/*/accept*', {
      statusCode: 200,
      body: { ...MOCK_OFFER, status: 'ACCEPTED' },
    }).as('acceptOffer');

    cy.intercept('GET', '**/clients/*/accounts*', {
      statusCode: 200,
      body: MOCK_ACCOUNTS,
    }).as('getAccounts');

    cy.loginAsClient();
    cy.visit('/otc');
  });

  it('kupac uspešno prihvata ponudu', () => {
    cy.contains('button', /Aktivne ponude/i).click();
    cy.wait('@getOffers');

    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.get('table tbody tr').first().find('button').contains(/Detalji/i).click();

    cy.contains('label', /Vaš račun/i)
      .parent()
      .find('select')
      .select(1);

    cy.contains('button', /^Prihvati$/i).should('be.visible').click();

    cy.wait('@acceptOffer').then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
    });

    cy.contains(/Ponuda je uspešno prihvaćena/i).should('be.visible');
  });
});
