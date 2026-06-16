// Scenario 67: Filtriranje istorije po datumu
// Read-only test — mocked API, nema izmena baze, nema potrebe za cleanup-om

const allNegotiations = [
  {
    otc_offer_id: 100,
    ticker: 'UFG',
    amount: 10,
    price_per_stock_rsd: 180.50,
    status: 'ACCEPTED',
    counterparty_name: 'Ana Anic',
    completed_at: '2026-05-10T10:00:00Z', // unutar opsega
  },
  {
    otc_offer_id: 101,
    ticker: 'MSFT',
    amount: 5,
    price_per_stock_rsd: 6200.00,
    status: 'REJECTED',
    counterparty_name: 'Nikola Nikolic',
    completed_at: '2026-05-18T10:00:00Z', // unutar opsega
  },
  {
    otc_offer_id: 102,
    ticker: 'AAPL',
    amount: 3,
    price_per_stock_rsd: 19500.00,
    status: 'ACCEPTED',
    counterparty_name: 'Jovan Jovanović',
    completed_at: '2026-04-01T14:00:00Z', // van opsega (pre maja)
  },
  {
    otc_offer_id: 103,
    ticker: 'TSLA',
    amount: 2,
    price_per_stock_rsd: 25000.00,
    status: 'REJECTED',
    counterparty_name: 'Petra Petrović',
    completed_at: '2026-06-01T09:00:00Z', // van opsega (posle maja)
  },
];

describe.skip('Scenario 67: Filtriranje istorije po datumu', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/otc/offers/history*', {
      statusCode: 200,
      body: allNegotiations,
    }).as('getHistory');

    cy.intercept('GET', '**/otc/history*', {
      statusCode: 200,
      body: allNegotiations,
    }).as('getHistoryAlt');

    cy.loginAsClient();
    cy.visit('/otc');
    cy.contains('button', /istorija pregovora/i).click();
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  it('postoje polja za filtriranje po datumu od/do', () => {
    cy.get('input[type="date"]').should('have.length.at.least', 2);
  });

  it('filter od 01-05-2026 do 22-05-2026 prikazuje pregovore u tom periodu', () => {
    cy.get('input[type="date"]').eq(0).type('2026-05-01');
    cy.get('input[type="date"]').eq(1).type('2026-05-22');

    cy.get('table tbody tr', { timeout: 10000 }).should('have.length', 2);
    // Pregovori unutar opsega (May 10 i May 18) treba da budu vidljivi
    cy.contains('td', 'UFG').should('be.visible');
    cy.contains('td', 'MSFT').should('be.visible');
  });

  it('pregovori van zadatog opsega datuma nisu prikazani', () => {
    cy.get('input[type="date"]').eq(0).type('2026-05-01');
    cy.get('input[type="date"]').eq(1).type('2026-05-22');

    // AAPL (april) i TSLA (jun) ne smeju biti vidljivi
    cy.get('table tbody', { timeout: 10000 })
      .should('not.contain', 'AAPL')
      .and('not.contain', 'TSLA');
  });

  it('resetovanje datumskog filtera vraća sve pregovore', () => {
    cy.get('input[type="date"]').eq(0).type('2026-05-01');
    cy.get('input[type="date"]').eq(1).type('2026-05-22');

    cy.get('table tbody tr', { timeout: 10000 }).then(($filtered) => {
      const filteredCount = $filtered.length;

      cy.get('input[type="date"]').eq(0).clear();
      cy.get('input[type="date"]').eq(1).clear();

      cy.get('table tbody tr', { timeout: 10000 }).should(
        'have.length.at.least',
        filteredCount + 1
      );
    });
  });
});
