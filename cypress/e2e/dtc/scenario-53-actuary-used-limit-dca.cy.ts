/// <reference types="cypress" />

// Scenario 53: Iskorišćen limit aktuara odražava izvršene DCA naloge
// Aktuar ima limit; svaki izvršeni trajni nalog umanjuje preostali limit.
// Supervisor proverava used_limit na stranici /admin/actuaries.

const ACTUARY_ID = 7;

const ACTUARY_WITH_LIMIT = {
  id: ACTUARY_ID,
  first_name: 'Jovana',
  last_name: 'Jovičić',
  email: 'jovana@bank.rs',
  limit: 200000,
  used_limit: 75000,
};

describe('Scenario 53: Iskorišćen limit aktuara - DCA provera', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/actuaries*', {
      statusCode: 200,
      body: { data: [ACTUARY_WITH_LIMIT], total: 1 },
    }).as('getActuaries');

    cy.loginAsAdmin();
    cy.visit('/admin/actuaries');
    cy.wait('@getActuaries');
  });

  it('prikazuje iskorišćen limit aktuara na stranici pregleda', () => {
    cy.contains('Jovana Jovičić').should('be.visible');
    cy.contains(/75\.000|75000/i).should('be.visible');
  });

  it('prikazuje i ukupan limit i iskorišćen limit za aktuara', () => {
    cy.contains('Jovana Jovičić').closest('tr').within(() => {
      cy.contains(/200\.000|200000/i).should('be.visible');
      cy.contains(/75\.000|75000/i).should('be.visible');
    });
  });

  it('supervisor može da resetuje iskorišćen limit aktuara', () => {
    cy.intercept('PATCH', `**/api/actuaries/${ACTUARY_ID}/reset-used-limit`, {
      statusCode: 200,
      body: { ...ACTUARY_WITH_LIMIT, used_limit: 0 },
    }).as('resetUsedLimit');

    cy.intercept('GET', '**/api/actuaries*', {
      statusCode: 200,
      body: { data: [{ ...ACTUARY_WITH_LIMIT, used_limit: 0 }], total: 1 },
    }).as('getActuariesAfterReset');

    cy.contains('Jovana Jovičić').closest('tr').find('button').contains(/reset/i).click();

    cy.contains(/resetujete iskorišćen limit/i).should('be.visible');
    cy.contains('button', /potvrdi|da/i).click();

    cy.wait('@resetUsedLimit');
  });
});

export {};
