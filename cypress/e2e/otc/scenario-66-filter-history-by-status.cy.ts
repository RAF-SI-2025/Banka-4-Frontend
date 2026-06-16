// Scenario 66: Filtriranje istorije po statusu
// Read-only test — mocked API, nema izmena baze, nema potrebe za cleanup-om

const allNegotiations = [
  {
    otc_offer_id: 100,
    ticker: 'UFG',
    amount: 10,
    price_per_stock_rsd: 180.50,
    status: 'ACCEPTED',
    counterparty_name: 'Ana Anic',
    completed_at: '2026-05-15T10:00:00Z',
  },
  {
    otc_offer_id: 101,
    ticker: 'MSFT',
    amount: 5,
    price_per_stock_rsd: 6200.00,
    status: 'REJECTED',
    counterparty_name: 'Nikola Nikolic',
    completed_at: '2026-05-20T10:00:00Z',
  },
  {
    otc_offer_id: 102,
    ticker: 'AAPL',
    amount: 3,
    price_per_stock_rsd: 19500.00,
    status: 'ACCEPTED',
    counterparty_name: 'Jovan Jovanović',
    completed_at: '2026-05-18T14:00:00Z',
  },
];

describe.skip('Scenario 66: Filtriranje istorije po statusu', () => {
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

  it('filter po statusu Prihvaćen prikazuje samo prihvaćene pregovore', () => {
    cy.contains(/status|filter/i)
      .closest('div, form')
      .find('select, input')
      .first()
      .select(/prihvaćen|accepted/i);

    cy.get('table tbody tr', { timeout: 10000 }).each(($row) => {
      cy.wrap($row).contains(/prihvaćen|accepted/i).should('be.visible');
    });
  });

  it('filter po statusu Odbijen prikazuje samo odbijene pregovore', () => {
    cy.contains(/status|filter/i)
      .closest('div, form')
      .find('select, input')
      .first()
      .select(/odbijen|rejected/i);

    cy.get('table tbody tr', { timeout: 10000 }).each(($row) => {
      cy.wrap($row).contains(/odbijen|rejected/i).should('be.visible');
    });
  });

  it('nakon filtriranja po Prihvaćen ne postoje odbijeni pregovori u tabeli', () => {
    cy.contains(/status|filter/i)
      .closest('div, form')
      .find('select, input')
      .first()
      .select(/prihvaćen|accepted/i);

    cy.get('table tbody', { timeout: 10000 })
      .should('not.contain.text', /odbijen|rejected/i);
  });

  it('resetovanje filtera vraća sve pregovore', () => {
    cy.contains(/status|filter/i)
      .closest('div, form')
      .find('select, input')
      .first()
      .select(/prihvaćen|accepted/i);

    cy.get('table tbody tr', { timeout: 10000 }).then(($filtered) => {
      const filteredCount = $filtered.length;

      cy.contains(/status|filter/i)
        .closest('div, form')
        .find('select, input')
        .first()
        .select(/svi|all|bez filtera/i);

      cy.get('table tbody tr', { timeout: 10000 }).should(
        'have.length.at.least',
        filteredCount
      );
    });
  });
});
