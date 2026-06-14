/// <reference types="cypress" />

// Scenario 46: Klijent nema pristup audit logu
// Ruta /admin/audit-log je zaštićena SupervisorRoute-om.
// Klijent koji pokuša da pristupi mora biti preusmeren.

describe('Scenario 46: Klijent nema pristup audit logu', () => {
  it('preusmerava klijenta sa /admin/audit-log na početnu stranicu', () => {
    cy.loginAsClient();
    cy.visit('/admin/audit-log');

    cy.url().should('not.include', '/admin/audit-log');
  });

  it('ne prikazuje sadržaj audit loga klijentu', () => {
    cy.loginAsClient();
    cy.visit('/admin/audit-log');

    cy.contains('Audit log').should('not.exist');
    cy.get('table').should('not.exist');
  });
});

export {};
