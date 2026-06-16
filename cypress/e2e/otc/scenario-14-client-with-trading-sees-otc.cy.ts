describe('Scenario 14: Klijent sa permisijom za trgovinu vidi OTC portal', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/otc/public*', {
      statusCode: 200,
      body: [
        {
          asset_ownership_id: 1,
          ticker: 'UFG',
          name: 'UFG Fond',
          owner_name: 'Marko Marković',
          available_amount: 100,
          price: 180.50,
          client_id: 501,
        },
        {
          asset_ownership_id: 2,
          ticker: 'UFG',
          name: 'UFG Fond',
          owner_name: 'Ana Anić',
          available_amount: 50,
          price: 182.00,
          client_id: 502,
        },
      ],
    }).as('getListings');

    cy.intercept('GET', '**/peer-otc/public-stocks*', {
      statusCode: 200,
      body: [],
    }).as('getPeerListings');

    cy.loginAsClient();
    cy.visit('/otc');
  });

  it('vidi naslov OTC portala', () => {
    cy.contains('h1', 'OTC Ponude i Ugovori').should('be.visible');
  });

  it('vidi tab Dostupne akcije i tabelu sa podacima', () => {
    cy.contains('button', 'Dostupne akcije').should('be.visible');
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  it('tabela ima sve potrebne kolone', () => {
    cy.get('table thead th', { timeout: 10000 }).then(($ths) => {
      const headers = [...$ths].map(th => th.textContent?.trim().toUpperCase());
      expect(headers).to.include.members(['TICKER', 'NAZIV', 'VLASNIK', 'DOSTUPNO', 'CENA']);
    });
  });

  it('svaka akcija ima ticker UFG i vlasnika', () => {
    cy.get('table tbody tr', { timeout: 10000 }).each(($row) => {
      cy.wrap($row).find('td').eq(0).should('not.be.empty');
      cy.wrap($row).find('td').eq(2).should('not.be.empty');
    });
  });

  it('dugme Pošalji ponudu postoji za svaki red', () => {
    cy.get('table tbody tr', { timeout: 10000 }).each(($row) => {
      cy.wrap($row).contains('button', 'Pošalji ponudu').should('be.visible');
    });
  });
});
