/// <reference types="cypress" />

export {};

describe('Scenario 37: Korisnik ne može prodati više hartija nego što poseduje', () => {

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
      body: { totalTax: 0 },
    }).as('getTax');

    cy.loginAsClientAna();
    cy.visit('/client/portfolio');
  });

  it('validacija količine: onemogućava nastavak kada se unese prevelik iznos', () => {
    cy.get('table', { timeout: 10000 }).should('be.visible');

    cy.get('table tbody tr').first().then(($row) => {
      const ownedAmountText = $row.find('td').eq(2).text().trim();
      const ownedAmount = parseFloat(ownedAmountText) || 1;
      const tooMuch = ownedAmount + 5;

      cy.wrap($row).find('button').contains(/PRODAJ/i).click({ force: true });

      cy.get('select').eq(1).should('not.contain', 'Učitavanje...');
      cy.get('select').eq(1).select(1, { force: true });

      cy.get('input[type="number"]').first()
        .should('be.visible')
        .clear({ force: true })
        .type(tooMuch.toString(), { force: true });

      cy.contains('button', /Nastavi/i).then(($btn) => {
        if ($btn.is(':disabled')) {
          cy.wrap($btn).should('be.disabled');
        } else {
          cy.wrap($btn).click({ force: true });
          cy.contains('Potvrda ordera').should('not.exist');
        }
      });
    });

    cy.get('body').type('{esc}');
  });

  it('forma ne prelazi na potvrdu čak i uz forsirani klik sa ekstremnom količinom', () => {
    cy.get('table', { timeout: 10000 }).should('be.visible');
    cy.contains('button', /PRODAJ/i).first().click({ force: true });

    cy.get('select').eq(1).should('not.contain', 'Učitavanje...');
    cy.get('select').eq(1).select(1, { force: true });

    cy.get('input[type="number"]').first().clear({ force: true }).type('9999999', { force: true });

    cy.contains('button', /Nastavi/i).click({ force: true });

    cy.contains('Potvrda ordera').should('not.exist');

    cy.get('body').type('{esc}');
  });
});
