/// <reference types="cypress" />

// Scenario 57: Dividenda klijenta podleže porezu na kapitalnu dobit (15%)

const CLIENT_ID = 100;
const OWNERSHIP_ID = 55;

const MOCK_DIVIDEND = {
  dividendPayoutId: 1,
  stock: 'AAPL',
  quantity: 10,
  grossAmount: 100.00,
  taxAmount: 15.00,
  netAmount: 85.00,
  paymentDate: '2026-03-01T00:00:00Z',
  accountNumber: '111-000-001',
  currencyCode: 'RSD',
};

describe('Scenario 57: Dividenda podleže porezu na kapitalnu dobit', () => {
  beforeEach(() => {
    cy.intercept('GET', `**/api/client/${CLIENT_ID}/assets`, {
      statusCode: 200,
      body: {
        assets: [
          {
            ownership_id: OWNERSHIP_ID,
            ticker: 'AAPL',
            type: 'STOCK',
            amount: 10,
            public_amount: 0,
            reserved_amount: 0,
            price: 188.5,
            profit: 500,
            dividend_yield: 0.55,
            lastModified: '2026-04-01T00:00:00Z',
          },
        ],
      },
    }).as('getPortfolio');

    cy.intercept('GET', `**/api/client/${CLIENT_ID}/assets/${OWNERSHIP_ID}/dividends`, {
      statusCode: 200,
      body: [MOCK_DIVIDEND],
    }).as('getDividends');

    cy.window().then(win => {
      const user = {
        id: CLIENT_ID,
        client_id: CLIENT_ID,
        identity_type: 'client',
        first_name: 'Test',
        last_name: 'Klijent',
      };
      win.localStorage.setItem('user', JSON.stringify(user));
      win.localStorage.setItem('token', 'fake-client-token');
    });

    cy.loginAsClientAna();
    cy.visit('/client/portfolio');
    cy.wait('@getPortfolio', { timeout: 10000 });
  });

  it('prikazuje porez od 15% u istoriji dividendi klijenta', () => {
    cy.contains('button', 'Dividende').click();

    cy.wait('@getDividends');

    cy.contains(/Primljene dividende/i).should('be.visible');
    cy.contains('AAPL').should('be.visible');

    cy.contains(/15,00|15.00/i).should('be.visible');

    cy.contains(/85,00|85.00/i).should('be.visible');
  });

  it('porez iznosi 15% bruto iznosa', () => {
    cy.contains('button', 'Dividende').click();
    cy.wait('@getDividends');

    cy.get('table').within(() => {
      cy.contains('tr', 'AAPL').within(() => {
        cy.contains(/100/).should('exist');
        cy.contains(/15/).should('exist');
        cy.contains(/85/).should('exist');
      });
    });
  });
});

export {};
