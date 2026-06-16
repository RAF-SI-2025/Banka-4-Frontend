import { apiUrl, buildActuaries, loginAs, supervisorUser } from './helpers';

describe('Scenario 6: Postavljanje limita jednakog trenutnom usedLimit-u', () => {
  it('dozvoljava izmenu i uspesno cuva limit', () => {
    cy.intercept('GET', `**/actuaries*`, {
      statusCode: 200,
      body: { data: buildActuaries({ limit: 90000, used_limit: 50000 }) },
    }).as('getActuaries');

    cy.intercept('PATCH', `**/actuaries/101`, (req) => {
      expect(req.body).to.deep.equal({ limit: 50000 });
      req.reply({ statusCode: 200, body: { ok: true } });
    }).as('changeLimit');

    loginAs(supervisorUser, '/admin/actuaries');
    cy.wait('@getActuaries');

    cy.contains('tr', 'milan.markovic@raf.rs').within(() => {
      cy.contains('button', 'Promeni limit').click();
    });

    cy.get('input[type="number"]').clear().type('50000');
    cy.contains('button', 'Potvrdi').click();

    cy.wait('@changeLimit').its('response.statusCode').should('eq', 200);
    cy.contains(/limit je uspesno promenjen\.|limit je uspešno promenjen\./i).should('be.visible');
    cy.contains('tr', 'milan.markovic@raf.rs').should('contain.text', '50.000 RSD');
  });
});

