describe('Scenario 23: Stranica Aktivne ponude prikazuje sve aktivne pregovore', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/otc/offers/active*', {
      statusCode: 200,
      body: [
        {
          otc_offer_id: 10,
          ticker: 'UFG',
          amount: 1,
          price_per_stock_rsd: 18100.00,
          settlement_date: '2099-12-31T00:00:00Z',
          premium: 10.00,
          buyer_id: 2001,
          seller_id: 9002,
          status: 'PENDING',
        },
        {
          otc_offer_id: 11,
          ticker: 'UFG',
          amount: 1,
          price_per_stock_rsd: 18200.00,
          settlement_date: '2099-12-31T00:00:00Z',
          premium: 10.00,
          buyer_id: 2001,
          seller_id: 9002,
          status: 'PENDING',
        },
      ],
    }).as('getOffers');

    cy.intercept('GET', '**/peer-otc/negotiations*', {
      statusCode: 200,
      body: [],
    }).as('getPeerNegotiations');

    cy.loginAsClient();
    cy.visit('/otc');
    cy.contains('button', 'Aktivne ponude').click();
  });

  it('vidi listu aktivnih pregovora', () => {
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  it('vidi ticker (akciju) za svaki pregovor', () => {
    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.get('td').should('not.be.empty');
    });
    cy.contains('td', 'UFG').should('be.visible');
  });

  it('vidi količinu za svaki pregovor', () => {
    cy.contains('tr', 'UFG').within(() => {
      cy.contains('td', '1').should('be.visible');
    });
  });

  it('vidi cenu za svaki pregovor', () => {
    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.get('td').contains(/\d+[.,]\d+/).should('be.visible');
    });
  });

  it('vidi settlementDate za svaki pregovor', () => {
    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.get('td').contains(/2099|31\.12/).should('be.visible');
    });
  });

  it('vidi s kim pregovara (Prodavac ili Kupac)', () => {
    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.get('td').contains(/Prodavac|Kupac|ID:/).should('be.visible');
    });
  });

  it('svaki pregovor ima dugme Detalji', () => {
    cy.get('table tbody tr', { timeout: 10000 }).each(($row) => {
      cy.wrap($row).contains('button', 'Detalji').should('be.visible');
    });
  });
});
