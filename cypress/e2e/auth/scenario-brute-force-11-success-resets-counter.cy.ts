/// <reference types="cypress" />

import {
  visitEmployeeLogin,
  fillLoginForm,
  submitLogin,
  assertTokenStored,
} from '../../support/authHelpers';

const API_URL = Cypress.env('API_URL') as string;

// Koristimo jelenu umesto nikole — izolovano od scenarija 10 koji koristi nikolu
const JELENA_EMAIL    = 'jelena@raf.rs';
const JELENA_PASSWORD = 'pass123';

describe('Feature 1 - Autentifikacija korisnika', () => {
  it('Scenario 11: Uspešan login resetuje failedLoginAttempts na 0', () => {
    // 3 neuspešna pokušaja — counter = 3, nalog NIJE zaključan
    Cypress._.times(3, () => {
      cy.request({
        method:           'POST',
        url:              `${API_URL}/auth/login`,
        body:             { email: JELENA_EMAIL, password: 'wrong_before_success' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    // Uspešan login — counter se resetuje na 0
    visitEmployeeLogin();
    fillLoginForm(JELENA_EMAIL, JELENA_PASSWORD);
    submitLogin();
    cy.url().should('include', '/admin');
    assertTokenStored();

    // Dokaz reseta: 2 faila posle uspeha → counter = 2 (ne 5).
    // Bez reseta bi bilo 3 + 2 = 5 → nalog bi odmah bio zaključan.
    Cypress._.times(2, () => {
      cy.request({
        method:           'POST',
        url:              `${API_URL}/auth/login`,
        body:             { email: JELENA_EMAIL, password: 'wrong_after_success' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401); // 401, ne 403 — counter je 2, ispod praga od 5
      });
    });

    // UI verifikacija: još jedan pogrešan pokušaj NE prikazuje "blokiran" poruku (counter = 3 < 5)
    visitEmployeeLogin();
    fillLoginForm(JELENA_EMAIL, 'wrong_ui_check');
    submitLogin();
    cy.contains(/blokiran/i).should('not.exist');
    cy.url().should('include', '/login');
  });
});
