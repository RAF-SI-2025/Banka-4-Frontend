/// <reference types="cypress" />

export {};

describe('Scenario 67: Portfolio prikazuje listu posedovanih hartija', () => {

  beforeEach(() => {
    cy.intercept('GET', '**/client/**/assets*', {
      statusCode: 200,
      body: [
        {
          ticker: 'AAPL',
          type: 'STOCK',
          amount: 10,
          averageBuyingPrice: 150.00,
          profit: 250.00,
          publiclyAvailable: 5,
        },
      ],
    }).as('getAssets');

    cy.intercept('GET', '**/client/**/accumulated-tax*', {
      statusCode: 200,
      body: { totalTax: 1200.50 },
    }).as('getTax');

    cy.loginAsClientAna();
    cy.visit('/client/portfolio');
  });

  it('prikazuje naslov i strukturu tabele', () => {
    cy.get('body').should('contain', 'Portfolio');

    cy.get('table', { timeout: 15000 }).should('be.visible');
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  it('verifikuje postojanje ključnih podataka u zaglavlju tabele', () => {
    const expectedHeaders = ['TICKER', 'TYPE', 'AMOUNT', 'PRICE', 'PROFIT'];

    expectedHeaders.forEach(header => {
      cy.get('table').contains('th', new RegExp(header, 'i')).should('be.visible');
    });
  });

  it('proverava ispravnost podataka unutar redova tabele', () => {
    cy.get('table tbody tr').first().within(() => {
      cy.get('td').eq(0).invoke('text').should('not.be.empty');
      cy.get('td').eq(1).should('not.be.empty');
      cy.get('td').eq(2).invoke('text').should('not.be.empty');
      cy.get('td').should('not.be.empty');
      cy.contains('button', /PRODAJ/i).should('be.visible');
    });
  });

  it('omogućava interakciju sa hartijom i otvaranje prodajne forme', () => {
    cy.get('table tbody tr').first().contains('button', /PRODAJ/i).click({ force: true });

    cy.get('body', { timeout: 8000 }).should('contain', 'Prodaj');

    cy.get('body').type('{esc}');
  });
});
