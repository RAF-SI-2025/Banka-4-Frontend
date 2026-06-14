/// <reference types="cypress" />
import { visitEmployeeLogin, fillLoginForm, submitLogin } from '../../support/authHelpers';

// Scenario 7: Nalog se zaključava nakon 5 neuspešnih pokušaja
// Email notifikacija o zaključavanju ne može se proveriti direktno iz Cypress-a —
// verifikujemo da UI prikazuje poruku o zaključavanju (što znači da je backend triggerovao email).

describe('Scenario 7: Nalog se zaključava nakon 5 neuspešnih pokušaja logovanja', () => {
  it('prikazuje poruku o zaključavanju i odbija 5. neuspešan pokušaj', () => {
    cy.intercept('POST', '**/api/auth/login').as('loginAttempt');

    visitEmployeeLogin();

    for (let i = 0; i < 4; i++) {
      fillLoginForm('dimitrije@raf.rs', 'pogresna_lozinka_' + i);
      submitLogin();
      cy.wait('@loginAttempt');
    }

    fillLoginForm('dimitrije@raf.rs', 'pogresna_lozinka_final');
    submitLogin();

    cy.wait('@loginAttempt').then(({ response }) => {
      expect([401, 403, 429]).to.include(response?.statusCode);
    });

    cy.contains(/zaključan|blokiran|privremeno/i).should('be.visible');
    cy.url().should('include', '/login');
    cy.window().then(win => {
      expect(win.localStorage.getItem('token')).to.be.null;
    });
  });
});

export {};
