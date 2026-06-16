import { apiUrl } from './helpers';
import { loginAs, supervisorUser } from './helpers';

describe('Scenario 7: Automatski reset usedLimit-a na kraju radnog dana', () => {
  it('API nivo: svi agenti se resetuju preko postojeceg reset endpointa', () => {
    const base = apiUrl();
    let rows = [
      {
        id: 101,
        first_name: 'Milan',
        last_name: 'Markovic',
        email: 'milan.markovic@raf.rs',
        position: 'Agent',
        limit: 100000,
        used_limit: 44000,
        need_approval: true,
        is_agent: true,
        is_supervisor: false,
      },
      {
        id: 103,
        first_name: 'Nina',
        last_name: 'Nikolic',
        email: 'nina.nikolic@raf.rs',
        position: 'Agent',
        limit: 120000,
        used_limit: 5000,
        need_approval: false,
        is_agent: true,
        is_supervisor: false,
      },
    ];

    cy.intercept('GET', `**/actuaries*`, (req) => {
      req.reply({ statusCode: 200, body: { data: rows } });
    }).as('getActuaries');

    cy.intercept('POST', `**/actuaries/*/reset-used-limit`, (req) => {
      const id = Number(req.url.split('/actuaries/')[1]?.split('/')[0]);
      rows = rows.map((row) => (row.id === id ? { ...row, used_limit: 0 } : row));
      req.reply({ statusCode: 200, body: { ok: true } });
    }).as('resetOne');

    loginAs(supervisorUser, '/admin/actuaries');
    cy.wait('@getActuaries');

    const startAt = new Date(2026, 3, 8, 23, 58, 50).getTime();
    cy.clock(startAt, ['Date', 'setTimeout', 'clearTimeout']);
    cy.tick(10_000);

    cy.window().then(async (win) => {
      const now = new Date(win.Date.now());
      expect(now.getHours()).to.eq(23);
      expect(now.getMinutes()).to.eq(59);

      for (const row of rows) {
        await win.fetch(`${base}/actuaries/${row.id}/reset-used-limit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
      }
    });

    cy.wait('@resetOne');
    cy.wait('@resetOne');

    cy.reload();
    cy.wait('@getActuaries');

    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).should('contain.text', '0 RSD');
    });
  });
});

