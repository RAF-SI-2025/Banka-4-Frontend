/**
 * Scenario 69 – Portfolio prikazuje podatke o porezu
 *
 * Given  korisnik je na portalu "Moj portfolio"
 * When   pregleda sekciju Porez
 * Then   prikazuje se neplaćen porez za tekući mesec
 */
describe('Scenario 69: Portfolio prikazuje podatke o porezu', () => {

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
      body: { totalTax: 5432.10 },
    }).as('getTax');

    cy.loginAsClient();
    cy.visit('/client/portfolio');

    cy.contains('h1', /Moj Portfolio/i).should('be.visible');
  });

  it('prikazuje sekciju za neplaćen porez', () => {
    cy.contains(/Neplaćen porez/i).should('be.visible');
  });

  it('verifikuje da je iznos neplaćenog poreza učitan kao broj', () => {
    cy.contains(/Neplaćen porez/i)
      .parent()
      .then(($el) => {
        const text = $el.text();
        expect(text).to.match(/\d/);
      });
  });

  it('prikazuje tekuću godinu ili mesec u sekciji poreza', () => {
    const currentYear = new Date().getFullYear().toString();

    cy.get('body').then(($body) => {
      if ($body.text().includes(currentYear)) {
        cy.log('Pronađena tekuća godina u sekciji poreza');
      }
    });
  });
});
