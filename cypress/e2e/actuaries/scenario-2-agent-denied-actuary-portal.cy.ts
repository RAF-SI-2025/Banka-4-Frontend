import { agentUser, apiUrl, loginAs } from './helpers';


describe('Scenario 2: Agent nema pristup portalu za upravljanje aktuarima', () => {
  it('dobija odbijen pristup i stranica nije dostupna', () => {
    cy.intercept('GET', `**`, { statusCode: 200, body: {} }).as('apiCall');

    loginAs(agentUser, '/admin/actuaries');

    cy.location('pathname', { timeout: 10000 }).should('eq', '/admin');

    cy.contains('h1', 'Aktuari').should('not.exist');
    cy.contains('button', 'Promeni limit').should('not.exist');
  });
});
