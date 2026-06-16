/// <reference types="cypress" />

describe('Scenario 49: Protok od klijenta do supervizora', () => {
  beforeEach(() => {
    cy.loginAsNikola();
  });

  it('Klijent kupuje, logout, pa admin proverava supervisor/orders', () => {
    cy.intercept('GET', '**/api/accounts/**').as('getAccounts');
    cy.intercept('POST', '**/api/orders/**', (req) => {
      req.reply({ statusCode: 201, body: { status: 'APPROVED' } });
    }).as('submitOrder');

    cy.visit('http://localhost:5173/dashboard');
    cy.visit('http://localhost:5173/securities');

    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.contains('button', /Kreiraj nalog/i).click({ force: true });
    });

    cy.get('[class*="modalOverlay"]').should('be.visible').within(() => {
      cy.contains('label', /Tip ordera/i).parent().find('select').select('MARKET');
      cy.contains('label', /Račun za kupovinu/i).parent().find('select').select(1);
      cy.contains('label', /Količina/i).parent().find('input').clear().type('111111');
      cy.contains('button', 'Nastavi').click();
    });

    cy.get('[class*="modalOverlay"]').within(() => {
      cy.contains('h4', 'Potvrda ordera').should('be.visible');
      cy.contains('button', 'Potvrdi').click();
    });

    cy.get('[class*="modalOverlay"]').within(() => {
      cy.contains('button', '✕').click({ force: true });
    });

    cy.visit('http://localhost:5173/dashboard');
    cy.get('nav').then(($nav) => {
      if ($nav.find('button:contains("Logout")').length > 0) {
        cy.contains('button', /Logout|Odjavi se/i).click({ force: true });
      } else {
        cy.clearLocalStorage();
        cy.clearCookies();
      }
    });

    cy.visit('http://localhost:5173/login');
    cy.loginAsAdmin();
    cy.visit('http://localhost:5173/supervisor/orders');

    cy.get('table', { timeout: 10000 }).should('be.visible');
    cy.contains('button', /Na čekanju/i, { timeout: 20000 }).click();
  });
});

export {};
