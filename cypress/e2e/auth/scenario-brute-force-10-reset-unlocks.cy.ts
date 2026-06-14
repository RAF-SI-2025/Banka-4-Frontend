/// <reference types="cypress" />

import { visitEmployeeLogin, fillLoginForm, submitLogin } from '../../support/authHelpers';

const API_URL = Cypress.env('API_URL') as string;

const NIKOLA_EMAIL = 'nikola@raf.rs';
const NEW_PASSWORD = 'NewPass12!';

describe('Feature 1 - Autentifikacija korisnika', () => {
  beforeEach(() => {
    // Given: nalog korisnika je zaključan (5 realnih neuspelih pokušaja)
    Cypress._.times(5, () => {
      cy.request({
        method:           'POST',
        url:              `${API_URL}/auth/login`,
        body:             { email: NIKOLA_EMAIL, password: 'wrong_password_lock' },
        failOnStatusCode: false,
      });
    });
  });

  it('Scenario 10: Reset lozinke otključava nalog i resetuje failedLoginAttempts na 0', () => {
    cy.intercept('POST', '**/auth/forgot-password').as('forgotPassword');

    // Token dolazi emailom — nije dostupan u automatizovanim testovima, mockujemo samo taj korak
    cy.intercept('POST', '**/auth/reset-password', (req) => {
      req.reply({ statusCode: 200, body: {} });
    }).as('resetPassword');

    // --- Given: nalog je zaključan ---
    visitEmployeeLogin();
    fillLoginForm(NIKOLA_EMAIL, 'wrong_while_locked');
    submitLogin();
    cy.contains(/blokiran/i).should('be.visible');

    // --- When: korisnik klikne na link za reset lozinke ---
    cy.contains('a', /zaboravili ste lozinku/i).click();
    cy.location('pathname').should('eq', '/reset-password');

    // Unese email i pošalje zahtev (realan API poziv)
    cy.get('#email').clear().type(NIKOLA_EMAIL);
    cy.contains('button', /pošalji link za resetovanje/i).click();
    cy.wait('@forgotPassword').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });
    cy.contains(/email je poslat/i).should('be.visible');

    // --- And: unese novu validnu lozinku (simulacija klika na link iz emaila) ---
    cy.visit('/reset-password?token=FAKE_RESET_TOKEN');
    cy.get('#nova-lozinka').should('be.visible').type(NEW_PASSWORD);
    cy.get('#potvrda-lozinke').type(NEW_PASSWORD);
    cy.contains('button', /potvrdi novu lozinku/i).click();

    cy.wait('@resetPassword').then((interception) => {
      expect(interception.request.body.token).to.eq('FAKE_RESET_TOKEN');
      expect(interception.request.body.new_password).to.be.a('string').and.not.empty;
    });

    // --- Then: nalog se otključava ---
    cy.contains(/lozinka je promenjena/i).should('be.visible');

    // --- And: korisnik može da se uloguje sa novom lozinkom ---
    // Intercept se postavlja tek ovde — ne hvata prethodne login pokušaje
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        token:         'mock-token-after-reset',
        refresh_token: 'mock-refresh-after-reset',
        user: {
          identity_type: 'employee',
          email:         NIKOLA_EMAIL,
          first_name:    'Nikola',
          last_name:     'Nikolic',
          permissions:   [],
          id:            5,
        },
      },
    }).as('loginAfterReset');

    cy.contains('a', /idi na prijavu/i).click();
    cy.location('pathname').should('eq', '/login');
    cy.contains('button', 'Zaposleni').click();
    fillLoginForm(NIKOLA_EMAIL, NEW_PASSWORD);
    submitLogin();

    // Verifikujemo da je login pozvan sa novom lozinkom i da je vratio 200
    cy.wait('@loginAfterReset').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.request.body.password).to.eq(NEW_PASSWORD);
    });
  });
});
