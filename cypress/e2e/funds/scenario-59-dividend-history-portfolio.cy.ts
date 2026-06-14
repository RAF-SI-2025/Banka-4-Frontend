/// <reference types="cypress" />

// Scenario 59: Istorija dividendi vidljiva u portfoliju klijenta
// Klijent otvara DividendHistoryModal klikom na "Dividende" za STOCK hartiju.

const OWNERSHIP_ID = 66;

const DIVIDENDS = [
  {
    dividendPayoutId: 10,
    stock: 'MSFT',
    quantity: 5,
    grossAmount: 50.00,
    taxAmount: 7.50,
    netAmount: 42.50,
    paymentDate: '2026-01-15T00:00:00Z',
    accountNumber: '111-000-001',
    currencyCode: 'RSD',
  },
  {
    dividendPayoutId: 11,
    stock: 'MSFT',
    quantity: 5,
    grossAmount: 50.00,
    taxAmount: 7.50,
    netAmount: 42.50,
    paymentDate: '2026-02-15T00:00:00Z',
    accountNumber: '111-000-001',
    currencyCode: 'RSD',
  },
];

describe('Scenario 59: Istorija dividendi vidljiva u portfoliju klijenta', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/client/*/assets', {
      statusCode: 200,
      body: {
        assets: [
          {
            ownership_id: OWNERSHIP_ID,
            ticker: 'MSFT',
            type: 'STOCK',
            amount: 5,
            public_amount: 0,
            reserved_amount: 0,
            price: 415.0,
            profit: 200,
            dividend_yield: 0.75,
            lastModified: '2026-04-01T00:00:00Z',
          },
        ],
      },
    }).as('getPortfolio');

    cy.intercept('GET', `**/api/client/*/assets/${OWNERSHIP_ID}/dividends`, {
      statusCode: 200,
      body: DIVIDENDS,
    }).as('getDividends');

    cy.loginAsClientAna();
    cy.visit('/client/portfolio');
    cy.wait('@getPortfolio', { timeout: 10000 });
  });

  it('prikazuje dugme Dividende za STOCK hartije', () => {
    cy.contains('tr', 'MSFT').contains('button', 'Dividende').should('be.visible');
  });

  it('otvara modal sa istorijom dividendi klikom na Dividende', () => {
    cy.contains('button', 'Dividende').click();
    cy.wait('@getDividends');

    cy.contains(/Primljene dividende.*MSFT/i).should('be.visible');
  });

  it('prikazuje obe stavke dividendi u modalnom prozoru', () => {
    cy.contains('button', 'Dividende').click();
    cy.wait('@getDividends');

    cy.get('table tbody tr').should('have.length', 2);
  });

  it('prikazuje ukupan neto iznos dividendi', () => {
    cy.contains('button', 'Dividende').click();
    cy.wait('@getDividends');

    cy.contains(/Ukupno neto/i).should('be.visible');
    cy.contains(/85,00|85.00/i).should('be.visible');
  });
});

export {};
