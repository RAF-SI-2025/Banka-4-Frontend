/// <reference types="cypress" />

// Scenario 44: Audit log - filtriranje po tipu akcije

const ALL_LOGS = [
  {
    id: 1,
    action_type: 'AGENT_LIMIT_CHANGED',
    actor: { first_name: 'Marko', last_name: 'Marković' },
    target: { first_name: 'Petar', last_name: 'Petrović' },
    created_at: '2026-04-01T10:00:00Z',
    details: { new_limit: 100000, old_limit: 50000 },
  },
  {
    id: 2,
    action_type: 'ORDER_APPROVED',
    actor: { first_name: 'Ana', last_name: 'Anić' },
    target: null,
    created_at: '2026-04-02T11:00:00Z',
    details: { order_id: 999 },
  },
  {
    id: 3,
    action_type: 'ORDER_REJECTED',
    actor: { first_name: 'Marko', last_name: 'Marković' },
    target: null,
    created_at: '2026-04-03T12:00:00Z',
    details: { order_id: 998, reason: 'Nedovoljno sredstava' },
  },
];

describe('Scenario 44: Audit log - filtriranje po tipu akcije', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/audit-log*', (req) => {
      const url = new URL(req.url);
      const actionType = url.searchParams.get('action_type');

      const filtered = actionType
        ? ALL_LOGS.filter(l => l.action_type === actionType)
        : ALL_LOGS;

      req.reply({ statusCode: 200, body: { data: filtered, total: filtered.length, total_pages: 1 } });
    }).as('getAuditLog');

    cy.loginAsAdmin();
    cy.visit('/admin/audit-log');
  });

  it('prikazuje sve logove bez filtera', () => {
    cy.wait('@getAuditLog');
    cy.contains(/promena limita agentu/i).should('be.visible');
    cy.contains(/order odobren/i).should('be.visible');
    cy.contains(/order odbijen/i).should('be.visible');
  });

  it('filtrira logove po tipu akcije ORDER_APPROVED', () => {
    cy.wait('@getAuditLog');

    cy.contains('label', 'Tip akcije').find('select').select('ORDER_APPROVED');
    cy.contains('button', 'Primeni').click();

    cy.wait('@getAuditLog').then(({ request }) => {
      expect(new URL(request.url).searchParams.get('action_type')).to.eq('ORDER_APPROVED');
    });

    cy.contains(/order odobren/i).should('be.visible');
    cy.contains(/promena limita agentu/i).should('not.exist');
    cy.contains(/order odbijen/i).should('not.exist');
  });

  it('resetuje filter i prikazuje sve logove', () => {
    cy.wait('@getAuditLog');

    cy.contains('label', 'Tip akcije').find('select').select('ORDER_APPROVED');
    cy.contains('button', 'Primeni').click();
    cy.wait('@getAuditLog');

    cy.contains('button', 'Reset').click();
    cy.wait('@getAuditLog');

    cy.contains(/promena limita agentu/i).should('be.visible');
    cy.contains(/order odobren/i).should('be.visible');
    cy.contains(/order odbijen/i).should('be.visible');
  });
});

export {};
