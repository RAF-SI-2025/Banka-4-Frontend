/// <reference types="cypress" />

export {};

const MOCK_LISTING = {
  asset_ownership_id: 1,
  ticker: 'UFG',
  name: 'UFG Fond',
  owner_name: 'Ana Anic',
  available_amount: 50,
  price: 182.00,
  client_id: 502,
};

const MOCK_ACCOUNTS = [
  {
    account_number: '265-0000000000001-01',
    name: 'Tekući račun',
    balance: 50000,
    currency: 'RSD',
  },
];

describe('Scenario 17: Kupac inicira pregovor sa prodavcem', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/otc/public*', {
      statusCode: 200,
      body: [MOCK_LISTING],
    }).as('getListings');

    cy.intercept('GET', '**/peer-otc/public-stocks*', {
      statusCode: 200,
      body: [],
    }).as('getPeerListings');

    cy.intercept('POST', '**/otc/offers*', {
      statusCode: 201,
      body: { otc_offer_id: 201, ticker: 'UFG', status: 'PENDING' },
    }).as('createOffer');

    cy.intercept('GET', '**/otc/offers/active*', {
      statusCode: 200,
      body: [
        {
          otc_offer_id: 201,
          ticker: 'UFG',
          amount: 2,
          price_per_stock_rsd: 180.00,
          settlement_date: '2099-12-31T00:00:00Z',
          premium: 0.5,
          status: 'PENDING',
        },
      ],
    }).as('getOffers');

    cy.intercept('GET', '**/clients/*/accounts*', {
      statusCode: 200,
      body: MOCK_ACCOUNTS,
    }).as('getAccounts');

    cy.loginAsClient();
    cy.visit('/otc');
  });

  it('uspešno inicira pregovor popunjavanjem forme i prikazuje je u aktivnim ponudama', () => {
    cy.wait('@getListings');
    cy.get('table', { timeout: 15000 }).should('be.visible');

    cy.contains('tr', 'Ana Anic').find('button').contains(/Pošalji ponudu/i).click({ force: true });

    cy.get('[class*="modalBackdrop"], [class*="modal"]').should('be.visible');

    cy.contains('label', /Količina/i).parent().find('input').clear().type('2');
    cy.contains('label', /Cena po akciji/i).parent().find('input').first().clear().type('180.00');
    cy.contains('label', /Premija/i).parent().find('input').first().clear().type('0.5');

    cy.contains('label', /Datum poravnanja/i).parent().find('input').clear().type('2099-12-31');

    cy.contains('label', /Vaš račun/i).parent().find('select').select(1);

    cy.contains('button', /Pošalji ponudu/i).click();

    cy.wait('@createOffer').then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
    });

    cy.contains(/uspešno/i).should('be.visible');

    cy.contains('button', /Aktivne ponude/i).click({ force: true });
    cy.wait('@getOffers');
    cy.get('table').should('be.visible');
  });
});
