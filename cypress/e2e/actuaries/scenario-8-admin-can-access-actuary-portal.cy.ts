import { adminUser, apiUrl, buildActuaries, loginAs } from './helpers';

describe('Scenario 8: Svaki admin je ujedno i supervizor', () => {
  it('admin vidi listu agenata i moze menjati limite', () => {
    cy.intercept('GET', `**/actuaries*`, {
      statusCode: 200,
      body: { data: buildActuaries() },
    }).as('getActuaries');

    loginAs(adminUser, '/admin/actuaries');

    cy.wait('@getActuaries').its('response.statusCode').should('eq', 200);
    cy.get('table tbody tr').should('have.length.greaterThan', 0);

    cy.contains('tr', 'milan.markovic@raf.rs').within(() => {
      cy.contains('button', 'Promeni limit').should('exist');
      cy.contains('button', 'Resetuj').should('exist');
    });
  });
});

