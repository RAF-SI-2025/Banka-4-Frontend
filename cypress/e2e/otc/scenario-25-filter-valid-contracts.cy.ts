describe('Scenario 25: Filtriranje sklopljenih ugovora po statusu', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/otc/contracts*', {
      statusCode: 200,
      body: [
        {
          otc_option_contract_id: 7,
          ticker: 'UFG',
          amount: 10,
          strike_price_rsd: 18000.00,
          premium_rsd: 50.00,
          settlement_date: '2099-12-31T00:00:00Z',
          seller_id: 9002,
          profit: 125.00,
          status: 'ACTIVE',
        },
        {
          otc_option_contract_id: 1,
          ticker: 'UFG',
          amount: 5,
          strike_price_rsd: 17000.00,
          premium_rsd: 30.00,
          settlement_date: '2026-05-12T00:00:00Z',
          seller_id: 9002,
          profit: -50.00,
          status: 'EXPIRED',
        },
      ],
    }).as('getContracts');

    cy.intercept('GET', '**/peer-otc/contracts*', {
      statusCode: 200,
      body: [],
    }).as('getPeerContracts');

    cy.loginAsClient();
    cy.visit('/otc');
    cy.contains('button', 'Sklopljeni ugovori').click();
  });

  it('prikazuje filtere Važeći i Istekli ugovori', () => {
    cy.contains('button', 'Važeći ugovori').should('be.visible');
    cy.contains('button', 'Istekli ugovori').should('be.visible');
  });

  it('filter Važeći ugovori prikazuje ugovor sa settlement 2099', () => {
    cy.contains('button', 'Važeći ugovori').click();
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.contains('td', 'UFG').should('be.visible');
  });

  it('za svaki važeći ugovor postoji dugme Iskoristi', () => {
    cy.contains('button', 'Važeći ugovori').click();
    cy.get('table tbody tr', { timeout: 10000 }).each(($row) => {
      cy.wrap($row).contains('button', 'Iskoristi').should('be.visible');
    });
  });

  it('filter Istekli ugovori prikazuje ugovor sa prošlim settlement datumom', () => {
    cy.contains('button', 'Istekli ugovori').click();
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.contains('td', 'UFG').should('be.visible');
  });

  it('istekli ugovori NEMAJU dugme Iskoristi', () => {
    cy.contains('button', 'Istekli ugovori').click();
    cy.get('table tbody', { timeout: 10000 }).within(() => {
      cy.contains('button', 'Iskoristi').should('not.exist');
    });
  });
});
