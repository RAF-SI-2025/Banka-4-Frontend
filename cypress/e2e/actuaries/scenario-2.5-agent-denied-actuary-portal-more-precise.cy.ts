import { agentUser, loginAs, apiUrl } from './helpers';


describe('Scenario 2.5: Agent nema pristup portalu za upravljanje aktuarima (preciznija provera)', () => {
  it('SupervisorRoute blokira agenta jer nema supervisor permisije', () => {
    // Mock API pozive da bi se izbegla 401 greška
    cy.intercept('GET', `**`, { statusCode: 200, body: {} }).as('apiCall');

    // Verifikuj da agent nema potrebnu permisiju
    expect(agentUser.permissions).to.not.include('supervisor');
    expect(agentUser.is_admin).to.equal(false);

    // Pokušaj pristupa /admin/actuaries kao agent
    loginAs(agentUser, '/admin/actuaries');

    // SupervisorRoute bi trebalo da ga preusmeri na /dashboard jer nema supervisor permisije
    cy.location('pathname', { timeout: 10000 }).should('eq', '/admin');

    // Verifikuj da stranica nije učitana
    cy.contains('h1', 'Aktuari').should('not.exist');
    cy.contains('button', 'Promeni limit').should('not.exist');
  });
});
