// Scenario 68: Filtriranje istorije po drugoj strani
// Read-only test — mocked API, nema izmena baze, nema potrebe za cleanup-om

const allNegotiations = [
  {
    otc_offer_id: 100,
    ticker: 'UFG',
    amount: 10,
    price_per_stock_rsd: 180.50,
    status: 'ACCEPTED',
    counterparty_name: 'Ana Anic',
    counterparty_email: 'ana.anic@example.com',
    completed_at: '2026-05-15T10:00:00Z',
  },
  {
    otc_offer_id: 101,
    ticker: 'MSFT',
    amount: 5,
    price_per_stock_rsd: 6200.00,
    status: 'REJECTED',
    counterparty_name: 'Nikola Nikolic',
    counterparty_email: 'nikola@raf.rs',
    completed_at: '2026-05-20T10:00:00Z',
  },
  {
    otc_offer_id: 102,
    ticker: 'AAPL',
    amount: 3,
    price_per_stock_rsd: 19500.00,
    status: 'ACCEPTED',
    counterparty_name: 'Ana Anic',
    counterparty_email: 'ana.anic@example.com',
    completed_at: '2026-05-18T14:00:00Z',
  },
];

describe.skip('Scenario 68: Filtriranje istorije po drugoj strani', () => {
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

  it('postoji polje za pretragu po imenu ili emailu druge strane', () => {
    cy.get('input[placeholder*="ime"], input[placeholder*="email"], input[placeholder*="pretraga"], input[placeholder*="korisnik"]')
      .should('have.length.at.least', 1);
  });

  it('filter po imenu "Ana" prikazuje samo pregovore sa Anom', () => {
    cy.get('input[placeholder*="ime"], input[placeholder*="email"], input[placeholder*="pretraga"], input[placeholder*="korisnik"]')
      .first()
      .type('Ana');

    cy.get('table tbody tr', { timeout: 10000 }).each(($row) => {
      cy.wrap($row).contains(/Ana Anic/i).should('be.visible');
    });
  });

  it('filter po imenu "Ana" ne prikazuje pregovore sa Nikolom', () => {
    cy.get('input[placeholder*="ime"], input[placeholder*="email"], input[placeholder*="pretraga"], input[placeholder*="korisnik"]')
      .first()
      .type('Ana');

    cy.get('table tbody', { timeout: 10000 })
      .should('not.contain', 'Nikola Nikolic');
  });

  it('filter po emailu "nikola@raf.rs" prikazuje samo pregovore sa Nikolom', () => {
    cy.get('input[placeholder*="ime"], input[placeholder*="email"], input[placeholder*="pretraga"], input[placeholder*="korisnik"]')
      .first()
      .type('nikola@raf.rs');

    cy.get('table tbody tr', { timeout: 10000 }).each(($row) => {
      cy.wrap($row).contains(/Nikola Nikolic|nikola@raf\.rs/i).should('be.visible');
    });
  });

  it('brisanje filtera vraća sve pregovore', () => {
    cy.get('input[placeholder*="ime"], input[placeholder*="email"], input[placeholder*="pretraga"], input[placeholder*="korisnik"]')
      .first()
      .type('Ana');

    cy.get('table tbody tr', { timeout: 10000 }).then(($filtered) => {
      const filteredCount = $filtered.length;

      cy.get('input[placeholder*="ime"], input[placeholder*="email"], input[placeholder*="pretraga"], input[placeholder*="korisnik"]')
        .first()
        .clear();

      cy.get('table tbody tr', { timeout: 10000 }).should(
        'have.length.at.least',
        filteredCount + 1
      );
    });
  });
});
