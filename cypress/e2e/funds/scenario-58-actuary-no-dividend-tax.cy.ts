/// <reference types="cypress" />

// Scenario 58: Aktuar (profit banke) ne plaća porez na dividende
// Na stranici /tax aktuar se prikazuje bez poreskog duga.

const ACTUARY_TAX_ENTRY = {
  id: 200,
  first_name: 'Aktuar',
  last_name: 'Bankić',
  userType: 'actuary',
  taxOwedRsd: 0,
};

const CLIENT_TAX_ENTRY = {
  id: 100,
  first_name: 'Klijent',
  last_name: 'Porezan',
  userType: 'client',
  taxOwedRsd: 4500,
};

describe('Scenario 58: Aktuar ne plaća porez na dividende', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/tax*', (req) => {
      const url = new URL(req.url);
      const userType = url.searchParams.get('userType');

      const entries = userType === 'actuary'
        ? [ACTUARY_TAX_ENTRY]
        : userType === 'client'
        ? [CLIENT_TAX_ENTRY]
        : [ACTUARY_TAX_ENTRY, CLIENT_TAX_ENTRY];

      req.reply({ statusCode: 200, body: { data: entries.map(u => ({
        ...u,
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        taxOwedRsd: u.taxOwedRsd,
      })), total: entries.length } });
    }).as('getTax');

    cy.loginAsAdmin();
    cy.visit('/tax');
    cy.wait('@getTax');
  });

  it('prikazuje aktuara bez poreskog duga (taxOwedRsd = 0)', () => {
    cy.contains('Aktuar Bankić').should('be.visible');
    cy.contains('Aktuar Bankić').closest('tr').contains(/^0|Bez duga/i).should('exist');
  });

  it('klijent ima poresku obavezu za razliku od aktuara', () => {
    cy.contains('Klijent Porezan').should('be.visible');
    cy.contains('Klijent Porezan').closest('tr').contains(/4[.,]500|4500/i).should('exist');
  });
});

export {};
