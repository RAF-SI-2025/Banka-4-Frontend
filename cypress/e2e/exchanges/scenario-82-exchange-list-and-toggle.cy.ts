import { loginAs, supervisorUser } from '../../support/helpers';

const exchanges = [
  {
    mic_code:        'XNAS',
    name:            'NASDAQ Stock Exchange',
    acronym:         'NASDAQ',
    polity:          'US',
    currency:        'USD',
    time_zone:       -5,
    open_time:       '09:30',
    close_time:      '16:00',
    trading_enabled: true,
  },
  {
    mic_code:        'XLON',
    name:            'London Stock Exchange',
    acronym:         'LSE',
    polity:          'GB',
    currency:        'GBP',
    time_zone:       0,
    open_time:       '08:00',
    close_time:      '16:30',
    trading_enabled: false,
  },
];

describe('Scenario 82: Prikaz liste berzi i toggle za radno vreme', () => {
  beforeEach(() => {
    // Use exact pathname to avoid matching the page visit /admin/exchanges
    cy.intercept('GET', '**/exchanges*', {
      statusCode: 200,
      body: { data: exchanges, total: exchanges.length },
    }).as('getExchanges');

    loginAs(supervisorUser, '/admin/exchanges');
    cy.wait('@getExchanges');
  });

  it('prikazuje sve berze sa osnovnim podacima', () => {
    // NASDAQ kartica
    cy.contains('NASDAQ Stock Exchange').should('be.visible');
    cy.contains('XNAS').should('be.visible');
    cy.contains('NASDAQ').should('be.visible');
    cy.contains('USD').should('be.visible');
    cy.contains('UTC-5').should('be.visible');

    // LSE kartica
    cy.contains('London Stock Exchange').should('be.visible');
    cy.contains('XLON').should('be.visible');
    cy.contains('LSE').should('be.visible');
    cy.contains('GBP').should('be.visible');
    cy.contains('UTC+0').should('be.visible');
  });

  it('svaka berza ima dugme za uključivanje/isključivanje trgovanja', () => {
    // .exc-anim is the static (non-module) class on every card div
    cy.contains('.exc-anim', 'XNAS')
      .find('button')
      .should('contain.text', 'Obustavi trgovanje');

    cy.contains('.exc-anim', 'XLON')
      .find('button')
      .should('contain.text', 'Omogući trgovanje');
  });

  it('klik na toggle šalje PATCH i ažurira status berze', () => {
    cy.intercept('PATCH', '**/exchanges/XNAS/toggle', {
      statusCode: 200,
      body: { mic_code: 'XNAS', trading_enabled: false },
    }).as('toggleNasdaq');

    cy.contains('.exc-anim', 'XNAS')
      .find('button')
      .click();

    cy.wait('@toggleNasdaq').its('response.statusCode').should('eq', 200);

    cy.contains('.exc-anim', 'XNAS')
      .find('button')
      .should('contain.text', 'Omogući trgovanje');
  });

  it('klik na toggle za neaktivnu berzu je omogućava', () => {
    cy.intercept('PATCH', '**/exchanges/XLON/toggle', {
      statusCode: 200,
      body: { mic_code: 'XLON', trading_enabled: true },
    }).as('toggleLse');

    cy.contains('.exc-anim', 'XLON')
      .find('button')
      .click();

    cy.wait('@toggleLse').its('response.statusCode').should('eq', 200);

    cy.contains('.exc-anim', 'XLON')
      .find('button')
      .should('contain.text', 'Obustavi trgovanje');
  });
});
