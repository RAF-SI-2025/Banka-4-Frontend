import { apiUrl, buildActuaries, loginAs, supervisorUser } from './helpers';


describe('Scenario 1: Supervizor moze da otvori portal za upravljanje aktuarima', () => {
  it('prikazuje listu, filtere i akcije nad agentom', () => {
    cy.intercept('GET', `**/actuaries*`, {
      statusCode: 200,
      body: { data: buildActuaries() },
    }).as('getActuaries');

    loginAs(supervisorUser, '/admin/actuaries');

    cy.wait('@getActuaries').its('response.statusCode').should('eq', 200);
    cy.contains('h1', 'Aktuari').should('be.visible');
    cy.get('table tbody tr').should('have.length', 2);

    cy.get('input[placeholder="Email..."]').should('be.visible');
    cy.get('input[placeholder="Ime..."]').should('be.visible');
    cy.get('input[placeholder="Prezime..."]').should('be.visible');
    cy.get('input[placeholder="Pozicija..."]').should('be.visible');

    cy.contains('tr', 'milan.markovic@raf.rs').within(() => {
      cy.contains('button', 'Promeni limit').should('exist');
      cy.contains('button', 'Resetuj').should('exist');
    });
  });
});
