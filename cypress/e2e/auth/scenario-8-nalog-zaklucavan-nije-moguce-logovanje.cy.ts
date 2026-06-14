/// <reference types="cypress" />
import { visitEmployeeLogin, fillLoginForm, submitLogin } from '../../support/authHelpers';

// Scenario 8: Logovanje nije moguće dok je nalog zaključan (brute-force zaštita)

describe('Scenario 8: Pokušaj logovanja dok je nalog privremeno zaključan', () => {
  it('odbija logovanje sa ispravnom lozinkom dok je nalog zaključan i prikazuje poruku', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 403,
      body: { message: 'Nalog je privremeno blokiran zbog previše neuspešnih pokušaja.' },
    }).as('loginLocked');

    visitEmployeeLogin();
    fillLoginForm('dimitrije@raf.rs', 'ispravna_lozinka123');
    submitLogin();

    cy.wait('@loginLocked').its('response.statusCode').should('eq', 403);

    cy.contains(/blokiran|zaključan|privremeno/i).should('be.visible');
    cy.url().should('include', '/login');
    cy.window().then(win => {
      expect(win.localStorage.getItem('token')).to.be.null;
    });
  });
});

export {};
