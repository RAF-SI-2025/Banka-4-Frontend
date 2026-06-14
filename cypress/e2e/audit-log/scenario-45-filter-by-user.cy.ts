/// <reference types="cypress" />

// Scenario 45: Audit log - filtriranje po korisniku

const ALL_LOGS = [
  {
    id: 1,
    action_type: 'AGENT_LIMIT_CHANGED',
    actor: { first_name: 'Marko', last_name: 'Marković' },
    target: null,
    created_at: '2026-04-01T10:00:00Z',
    details: {},
  },
  {
    id: 2,
    action_type: 'ORDER_APPROVED',
    actor: { first_name: 'Jana', last_name: 'Janić' },
    target: null,
    created_at: '2026-04-02T11:00:00Z',
    details: { order_id: 100 },
  },
  {
    id: 3,
    action_type: 'ORDER_REJECTED',
    actor: { first_name: 'Jana', last_name: 'Janić' },
    target: null,
    created_at: '2026-04-03T12:00:00Z',
    details: { order_id: 101 },
  },
];

describe('Scenario 45: Audit log - filtriranje po korisniku', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/audit-log*', (req) => {
      const url = new URL(req.url);
      const user = url.searchParams.get('user');

      const filtered = user
        ? ALL_LOGS.filter(l => {
            const actor = l.actor;
            const fullName = `${actor.first_name} ${actor.last_name}`.toLowerCase();
            return fullName.includes(user.toLowerCase());
          })
        : ALL_LOGS;

      req.reply({ statusCode: 200, body: { data: filtered, total: filtered.length, total_pages: 1 } });
    }).as('getAuditLog');

    cy.loginAsAdmin();
    cy.visit('/admin/audit-log');
  });

  it('prikazuje sve logove bez korisničkog filtera', () => {
    cy.wait('@getAuditLog');
    cy.contains('Marko Marković').should('be.visible');
    cy.contains('Jana Janić').should('be.visible');
  });

  it('filtrira logove po korisniku Jana Janić', () => {
    cy.wait('@getAuditLog');

    cy.contains('label', 'Korisnik').find('input').clear().type('Jana');
    cy.contains('button', 'Primeni').click();

    cy.wait('@getAuditLog').then(({ request }) => {
      expect(new URL(request.url).searchParams.get('user')).to.eq('Jana');
    });

    cy.contains('Jana Janić').should('be.visible');
    cy.contains('Marko Marković').should('not.exist');
  });
});

export {};
