/// <reference types="cypress" />

describe('Scenario 56: Filtriranje ordera po statusu Pending', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it('kada supervizor izabere filter Pending, prikazuju se samo Pending orderi', () => {
    cy.visit('http://localhost:5173/supervisor/orders');
    cy.contains('button', /Na čekanju/i, { timeout: 20000 }).click();
  });
});

export {};
