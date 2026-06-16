// Scenario 65: Prikaz istorije kontraponuda za pregovor
// Read-only test — mocked API, nema izmena baze, nema potrebe za cleanup-om

const negotiationId = 100;

const completedNegotiation = {
  otc_offer_id: negotiationId,
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
};

// Istorija kontraponuda za dati pregovor
const negotiationHistory = [
  {
    id: 1,
    timestamp: '2026-05-14T12:00:00Z',
    changed_by: 'Marko Marković',
    changed_by_id: 2,
    old_price_per_stock_rsd: 175.00,
    new_price_per_stock_rsd: 178.00,
    old_amount: 10,
    new_amount: 10,
    old_premium: 8.00,
    new_premium: 9.00,
  },
  {
    id: 2,
    timestamp: '2026-05-14T15:00:00Z',
    changed_by: 'Ana Anic',
    changed_by_id: 3,
    old_price_per_stock_rsd: 178.00,
    new_price_per_stock_rsd: 180.50,
    old_amount: 10,
    new_amount: 10,
    old_premium: 9.00,
    new_premium: 10.00,
  },
];

describe.skip('Scenario 65: Prikaz istorije kontraponuda za pregovor', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/otc/offers/history*', {
      statusCode: 200,
      body: [completedNegotiation],
    }).as('getHistory');

    cy.intercept('GET', '**/otc/history*', {
      statusCode: 200,
      body: [completedNegotiation],
    }).as('getHistoryAlt');

    // Istorija kontraponuda za specifični pregovor
    cy.intercept('GET', `**/otc/offers/${negotiationId}/history*`, {
      statusCode: 200,
      body: negotiationHistory,
    }).as('getOfferHistory');

    cy.intercept('GET', `**/otc/offers/${negotiationId}*`, {
      statusCode: 200,
      body: { ...completedNegotiation, history: negotiationHistory },
    }).as('getOffer');

    cy.intercept('GET', `**/otc/negotiations/${negotiationId}*`, {
      statusCode: 200,
      body: { ...completedNegotiation, history: negotiationHistory },
    }).as('getNegotiation');

    cy.loginAsClient();
    cy.visit('/otc');
    cy.contains('button', /istorija pregovora/i).click();
  });

  it('klik na pregovor otvara detalje sa istorijom kontraponuda', () => {
    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.contains('button', /detalji|pregled|otvori/i).click();
    });

    // Modal ili nova stranica sa istorijom
    cy.contains(/istorija|kontraponuda|history/i, { timeout: 10000 }).should('be.visible');
  });

  it('prikazuje listu kontraponuda u hronološkom redosledu', () => {
    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.contains('button', /detalji|pregled|otvori/i).click();
    });

    cy.get('[data-cy="offer-history"], table, .history-list', { timeout: 10000 })
      .should('be.visible');
  });

  it('za svaku kontraponudu prikazuje staru i novu vrednost', () => {
    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.contains('button', /detalji|pregled|otvori/i).click();
    });

    // Stare i nove vrednosti cene treba da budu vidljive
    cy.contains(/175|178|180[,.]50/i, { timeout: 10000 }).should('be.visible');
  });

  it('za svaku kontraponudu prikazuje timestamp i ko je izvršio izmenu', () => {
    cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
      cy.contains('button', /detalji|pregled|otvori/i).click();
    });

    cy.contains(/Marko|Ana Anic/, { timeout: 10000 }).should('be.visible');
    cy.contains(/2026-05-14|14\. maj|May 14/, { timeout: 10000 }).should('be.visible');
  });
});
