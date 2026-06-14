/// <reference types="cypress" />
import { visitEmployeeLogin, fillLoginForm, submitLogin } from '../../support/authHelpers';

// Scenario 9: Logovanje je moguće posle isteka zaključavanja (brute-force zaštita)
// Ne možemo kontrolisati vreme zaključavanja u E2E testu, pa mockujemo uspešan odgovor
// koji simululje situaciju u kojoj je zaključavanje isteklo.

describe('Scenario 9: Uspešno logovanje posle isteka zaključavanja', () => {
  it('prijavljuje korisnika kada je period zaključavanja istekao', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        token: 'fake-token-after-unlock',
        refresh_token: 'fake-refresh',
        user: {
          id: 1,
          email: 'dimitrije@raf.rs',
          first_name: 'Dimitrije',
          last_name: 'Test',
          identity_type: 'employee',
          permissions: ['admin.all'],
        },
      },
    }).as('loginSuccess');

    visitEmployeeLogin();
    fillLoginForm('dimitrije@raf.rs', 'ispravna_lozinka123');
    submitLogin();

    cy.wait('@loginSuccess').its('response.statusCode').should('eq', 200);

    cy.url().should('not.include', '/login');
    cy.window().then(win => {
      expect(win.localStorage.getItem('token')).to.be.a('string').and.not.be.empty;
    });
  });
});

export {};
