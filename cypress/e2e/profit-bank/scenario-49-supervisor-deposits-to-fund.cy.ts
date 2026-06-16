import { loginAs, mockBankAccounts, mockFunds, supervisorUser, tradingApiUrl, bankingApiUrl } from './helpers';

describe('Scenario 49: Supervizor uplaćuje novac u fond u ime banke', () => {
  beforeEach(() => {
    cy.intercept('GET', `**/profit/actuaries`, {
      statusCode: 200,
      body: [],
    }).as('getActuaryPerformances');

    cy.intercept('GET', `**/profit/funds`, {
      statusCode: 200,
      body: mockFunds,
    }).as('getFundPositions');

    cy.intercept('GET', `**/accounts**`, {
      statusCode: 200,
      body: mockBankAccounts,
    }).as('getAccounts');

    cy.intercept('GET', '**/actuary/**/assets**', {
      statusCode: 200,
      body: [],
    }).as('getActuaryPortfolio');

    cy.intercept('GET', `**/investment-funds**`, {
      statusCode: 200,
      body: { data: [], total: 0 },
    }).as('getFunds');

    cy.intercept('POST', '**/auth/refresh**', {
      statusCode: 200,
      body: { token: 'test-token', refresh_token: 'test-refresh-token' },
    }).as('tokenRefresh');

    cy.intercept('POST', `**/investment-funds/*/invest`, (req) => {
      expect(req.body).to.not.have.property('commission');
      req.reply({ statusCode: 200, body: { message: 'Uplata uspešna.' } });
    }).as('depositToFund');

    loginAs(supervisorUser, '/profit-bank');
  });

  it('prebacuje novac sa bankovnog računa na račun fonda bez provizije', () => {
    cy.contains('button', 'Pozicije u fondovima').click();

    cy.wait('@getFundPositions');

    cy.contains('td', 'Alpha Fond').should('be.visible');

    cy.contains('tr', 'Alpha Fond').within(() => {
      cy.contains('button', 'Uplata u fond').click();
    });

    cy.get('select').select('340-111-222-33');

    cy.get('input[type="number"]').clear().type('50000');

    cy.contains('button', 'Potvrdi').click();

    cy.wait('@depositToFund').then(({ request }) => {
      expect(request.body).to.not.have.property('commission');
      expect(request.body.amount).to.eq(50000);
    });

    cy.contains('Uplata u fond je uspešno evidentirana').should('be.visible');
  });
});
