import { loginAs, mockBankAccounts, mockFunds, supervisorUser, tradingApiUrl, bankingApiUrl } from './helpers';

describe('Scenario 50: Supervizor povlači novac iz fonda za banku - bez provizije', () => {
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

    cy.intercept('POST', `**/investment-funds/*/withdraw`, (req) => {
      expect(req.body).to.not.have.property('commission');
      req.reply({ statusCode: 200, body: { message: 'Povlačenje uspešno.' } });
    }).as('withdrawFromFund');

    loginAs(supervisorUser, '/profit-bank');
  });

  it('prebacuje novac na bankovni račun bez provizije', () => {
    cy.contains('button', 'Pozicije u fondovima').click();

    cy.wait('@getFundPositions');

    cy.contains('td', 'Alpha Fond').should('be.visible');

    cy.contains('tr', 'Alpha Fond').within(() => {
      cy.contains('button', 'Povlačenje iz fonda').click();
    });

    cy.contains('Dostupna likvidnost fonda').should('be.visible');

    cy.get('select').select('340-111-222-33');

    cy.get('input[type="number"]').clear().type('10000');

    cy.contains('button', 'Potvrdi').click();

    cy.wait('@withdrawFromFund').then(({ request }) => {
      expect(request.body).to.not.have.property('commission');
      expect(request.body.amount).to.eq(10000);
    });

    cy.contains('Povlačenje iz fonda je uspešno evidentirano').should('be.visible');
  });
});
