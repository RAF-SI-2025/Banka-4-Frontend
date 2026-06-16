import { apiUrl, buildActuaries, loginAs, supervisorUser } from './helpers';

describe('Scenario 5: Supervizor resetuje usedLimit agentu', () => {
    it('postavlja usedLimit na 0 i prikazuje uspesnu poruku', () => {
        cy.intercept('GET', `**/actuaries*`, {
            statusCode: 200,
            body: { data: buildActuaries({ used_limit: 45000 }) },
        }).as('getActuaries');

        cy.intercept('POST', `**/actuaries/*/reset-used-limit`, {
            statusCode: 200,
            body: { ok: true },
        }).as('resetUsedLimit');

        loginAs(supervisorUser, '/admin/actuaries');
        cy.wait('@getActuaries');

        cy.contains('tr', 'milan.markovic@raf.rs').within(() => {
            cy.contains('button', 'Resetuj').click();
        });

        cy.contains(/reset usedlimit|potvrdi operaciju|resetuj/i).should('be.visible');
        cy.contains('button', 'Potvrdi').click();

        cy.wait('@resetUsedLimit').its('response.statusCode').should('eq', 200);
        cy.contains(/resetovan|uspesnoj operaciji|uspešnoj operaciji/i).should('be.visible');
        cy.contains('tr', 'milan.markovic@raf.rs').should('contain.text', '0 RSD');
    });
});