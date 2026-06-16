describe('Scenario 26: Iskorišćavanje važećeg opcionog ugovora po SAGA patternu', () => {
  const MOCK_CONTRACT = {
    otc_option_contract_id: 7,
    ticker: 'UFG',
    amount: 10,
    strike_price_rsd: 18000.00,
    premium_rsd: 50.00,
    settlement_date: '2099-12-31T00:00:00Z',
    seller_id: 9002,
    profit: 125.00,
    status: 'ACTIVE',
  };

  const MOCK_ACCOUNTS = [
    {
      account_number: '265-0000000000001-01',
      name: 'Tekući račun',
      balance: 50000,
      currency: 'RSD',
    },
  ];

  beforeEach(() => {
    cy.intercept('GET', '**/otc/contracts*', {
      statusCode: 200,
      body: [MOCK_CONTRACT],
    }).as('getContracts');

    cy.intercept('GET', '**/peer-otc/contracts*', {
      statusCode: 200,
      body: [],
    }).as('getPeerContracts');

    cy.intercept('POST', '**/otc/contracts/*/exercise*', {
      statusCode: 200,
      body: { message: 'Opcija je uspešno iskorišćena.' },
    }).as('exerciseOption');

    cy.intercept('GET', '**/clients/*/accounts*', {
      statusCode: 200,
      body: MOCK_ACCOUNTS,
    }).as('getAccounts');

    cy.loginAsClient();
    cy.visit('/otc');
  });

  it('uspešno iskorišćava opciju uz vizuelnu proveru', () => {
    cy.contains('button', /Sklopljeni ugovori/i).click({ force: true });

    cy.wait('@getContracts');

    cy.get('table tbody tr').first().within(() => {
      cy.get('button').contains(/Iskoristi/i).click();
    });

    cy.contains('div', /Iskoristi opciju/i).should('be.visible');

    cy.contains('label', /Račun za plaćanje/i)
      .parent()
      .find('select')
      .select(1);

    cy.contains('button', /^Potvrdi$/i).click();

    cy.wait('@exerciseOption').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });

    cy.contains(/uspešno iskorišćena/i).should('be.visible');
  });
});
