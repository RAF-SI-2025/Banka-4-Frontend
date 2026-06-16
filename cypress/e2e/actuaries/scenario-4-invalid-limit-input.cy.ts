import { apiUrl, buildActuaries, loginAs, supervisorUser } from './helpers';

describe('Scenario 4: Unos nevalidnog limita', () => {
  it('odbija 0 i negativnu vrednost i ne salje PATCH', () => {
    cy.intercept('GET', `**/actuaries*`, {
      statusCode: 200,
      body: { data: buildActuaries({ limit: 100000, used_limit: 30000 }) },
    }).as('getActuaries');

    cy.intercept('PATCH', `**/actuaries/101`, {
      statusCode: 200,
      body: { ok: true },
    }).as('changeLimit');

    loginAs(supervisorUser, '/admin/actuaries');
    cy.wait('@getActuaries');

    cy.contains('tr', 'milan.markovic@raf.rs').within(() => {
      cy.contains('button', 'Promeni limit').click();
    });

    // Test sa 0 - trebalo bi da bude odbijeno na klijentskoj strani bez zahteva
    cy.get('input[type="number"]').clear().type('0');
    cy.contains('button', 'Potvrdi').click();
    cy.contains(/unesite validan limit|pozitivan broj|veci od nule|veći od nule/i).should('be.visible');

    // Test sa -1 - trebalo bi da bude odbijeno na klijentskoj strani bez zahteva
    cy.get('input[type="number"]').clear().type('-1');
    cy.contains('button', 'Potvrdi').click();
    cy.contains(/unesite validan limit|pozitivan broj/i).should('be.visible');

    // Provera da nijedan PATCH nije poslat
    cy.get('@changeLimit.all').should('have.length', 0);
  });
});

