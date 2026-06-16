/**
 * Scenario 68 – Portfolio prikazuje ukupan profit
 *
 * Given  korisnik ima otvorene pozicije u portfoliju
 * When   otvori portal "Moj portfolio"
 * Then   vidi ukupan profit/gubitak za sve pozicije koje trenutno drži
 */
describe('Scenario 68: Portfolio prikazuje ukupan profit', () => {

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
        {
          ticker: 'MSFT',
          type: 'STOCK',
          amount: 5,
          averageBuyingPrice: 300.00,
          profit: -100.00,
          publiclyAvailable: 0,
        },
      ],
    }).as('getAssets');

    cy.intercept('GET', '**/client/**/accumulated-tax*', {
      statusCode: 200,
      body: { totalTax: 0 },
    }).as('getTax');

    cy.loginAsClient();
    cy.visit('/client/portfolio');
    cy.contains('h1', /Moj Portfolio/i).should('be.visible');
  });

  it('prikazuje sekciju sa ukupnim profitom i broj stavki', () => {
    cy.contains(/Ukupan Profit \/ Gubitak/i).should('be.visible');
    cy.contains(/Aktivne hartije/i).should('be.visible');
    cy.contains(/\d+ stavki/).should('be.visible');
  });

  it('validira logiku simbola (▲/▼) u odnosu na realni profit', () => {
    cy.contains(/Ukupan Profit \/ Gubitak/i)
      .parent()
      .then(($parent) => {
        const text = $parent.text();
        const profitValue = parseFloat(text.replace(/[^0-9.-]+/g, ''));

        if (profitValue > 0) {
          cy.wrap($parent).should('contain', '▲');
        } else if (profitValue < 0) {
          cy.wrap($parent).should('contain', '▼');
        } else {
          cy.log('Profit je 0, proveravam samo vidljivost');
          cy.wrap($parent).should('be.visible');
        }
      });
  });

  it('proverava da se ukupan profit prikazuje pored labele', () => {
    cy.contains(/Ukupan Profit \/ Gubitak/i)
      .parent()
      .invoke('text')
      .should('match', /[0-9]/);
  });
});
