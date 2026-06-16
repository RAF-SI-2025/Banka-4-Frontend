import { apiUrl, buildActuaries, loginAs, supervisorUser } from './helpers';

describe('Scenario 3: Supervizor menja limit agentu - uspesno', () => {
  it('cuva novi limit, prikazuje potvrdu i belezi audit log flag', () => {
    cy.intercept('GET', `**/actuaries*`, {
      statusCode: 200,
      body: { data: buildActuaries({ limit: 100000, used_limit: 30000 }) },
    }).as('getActuaries');

    cy.intercept('PATCH', `**/actuaries/101`, (req) => {
      const requestedLimit = Number(req.body?.limit);

      if (requestedLimit < 30000) {
        req.reply({ statusCode: 400, body: { error: 'Novi limit ne sme biti manji od iskoriscenog limita.' } });
        return;
      }

      expect(req.body).to.deep.equal({ limit: 150000 });
      req.reply({ statusCode: 200, body: { ok: true, audit_logged: true } });
    }).as('changeLimit');

    loginAs(supervisorUser, '/admin/actuaries');
    cy.wait('@getActuaries');

    cy.contains('tr', 'milan.markovic@raf.rs').within(() => {
      cy.contains('button', 'Promeni limit').click();
    });

    cy.get('input[type="number"]').should('be.visible').and('be.enabled').clear().type('29999');
    cy.contains('button', 'Potvrdi').click();

    cy.wait('@changeLimit').then(({ response }) => {
      expect(response?.statusCode).to.eq(400);
      expect(String(response?.body?.error ?? '').toLowerCase()).to.include('manji');
    });

    cy.get('input[type="number"]').should('be.visible').and('be.enabled').clear().type('150000');
    cy.contains('button', 'Potvrdi').click();

    cy.wait('@changeLimit').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.body?.audit_logged).to.eq(true);
    });

    cy.contains(/limit je uspesno promenjen\.|limit je uspešno promenjen\./i).should('be.visible');
    cy.contains('tr', 'milan.markovic@raf.rs').should('contain.text', '150.000 RSD');
  });
});

