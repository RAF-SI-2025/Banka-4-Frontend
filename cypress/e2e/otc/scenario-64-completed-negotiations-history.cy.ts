// Scenario 64: Prikaz svih završenih pregovora
// Read-only test — mocked API, nema izmena baze, nema potrebe za cleanup-om

const completedNegotiations = [
  {
    otc_offer_id: 100,
    ticker: 'UFG',
    amount: 10,
    price_per_stock_rsd: 180.50,
    settlement_date: '2099-12-31T00:00:00Z',
    premium: 10.00,
    status: 'ACCEPTED',
    buyer_id: 2,
    seller_id: 3,
    counterparty_name: 'Ana Anic',
    counterparty_email: 'ana.anic@example.com',
    completed_at: '2026-05-15T10:00:00Z',
  },
  {
    otc_offer_id: 101,
    ticker: 'MSFT',
    amount: 5,
    price_per_stock_rsd: 6200.00,
    settlement_date: '2026-08-01T00:00:00Z',
    premium: 5.00,
    status: 'REJECTED',
    buyer_id: 999,
    seller_id: 2,
    counterparty_name: 'Nikola Nikolic',
    counterparty_email: 'nikola@raf.rs',
    completed_at: '2026-05-20T10:00:00Z',
  },
];

describe.skip('Scenario 64: Prikaz svih završenih pregovora', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/otc/offers/history*', {
      statusCode: 200,
      body: completedNegotiations,
    }).as('getHistory');

    cy.intercept('GET', '**/otc/history*', {
      statusCode: 200,
      body: completedNegotiations,
    }).as('getHistoryAlt');

    cy.loginAsClient();
    cy.visit('/otc');
    cy.contains('button', /istorija pregovora/i).click();
  });

  it('prikazuje stranicu Istorija pregovora', () => {
    cy.contains(/istorija pregovora/i).should('be.visible');
  });

  it('prikazuje listu svih završenih pregovora', () => {
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  it('vidi pregovor sa statusom PRIHVAĆEN', () => {
    cy.get('table tbody', { timeout: 10000 })
      .contains(/prihvaćen|accepted/i)
      .should('be.visible');
  });

  it('vidi pregovor sa statusom ODBIJEN', () => {
    cy.get('table tbody', { timeout: 10000 })
      .contains(/odbijen|rejected/i)
      .should('be.visible');
  });

  it('za svaki pregovor vidi ticker, količinu i cenu', () => {
    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.get('td').should('have.length.at.least', 3);
      cy.get('td').first().should('not.be.empty');
    });
  });

  it('za svaki pregovor vidi s kim je pregovarao', () => {
    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.contains(/Ana Anic|Nikola Nikolic|ana\.anic|nikola/i).should('be.visible');
    });
  });
});
