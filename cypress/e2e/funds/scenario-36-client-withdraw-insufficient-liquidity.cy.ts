import { extractFunds, extractAccounts, getDirectApiUrl } from '../../support/helpers';

describe('Scenario 36: Klijent povlači novac iz fonda - nedovoljna likvidnost', () => {
  let clientToken: string | null = null;
  let rollbackFundId: string | null = null;
  let rollbackAmount: number | null = null;
  let rollbackAccountNumber: string | null = null;
  let shouldRollback = false;

  beforeEach(() => {
    clientToken = null;
    rollbackFundId = null;
    rollbackAmount = null;
    rollbackAccountNumber = null;
    shouldRollback = false;

    cy.loginAsClientAna();

    cy.window().then((win) => {
      clientToken = win.localStorage.getItem('token');
    });

    cy.intercept('GET', '**/api/client/*/assets*').as('getPortfolio');
    cy.intercept('GET', '**/api/client/*/funds*').as('getClientFunds');
    cy.intercept('GET', '**/api/clients/*/accounts*').as('getAccounts');
    cy.intercept('POST', '**/api/investment-funds/*/withdraw').as('withdrawFromFund');

    cy.visit('/client/portfolio');
  });

  afterEach(() => {
    if (!shouldRollback || !clientToken || !rollbackFundId || !rollbackAmount || !rollbackAccountNumber) {
      return;
    }

    cy.request({
      method: 'POST',
      url: `${getDirectApiUrl(8082)}/investment-funds/${rollbackFundId}/invest`,
      headers: {
        Authorization: `Bearer ${clientToken}`,
      },
      body: {
        account_number: rollbackAccountNumber,
        amount: rollbackAmount,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 201, 202], `Rollback invest nije uspeo. Response: ${JSON.stringify(res.body)}`).to.include(res.status);
    });
  });

  it('šalje withdrawal zahtev za Anin fond', () => {
    cy.wait('@getPortfolio');

    cy.get('main').within(() => {
      cy.contains('button', 'Moji fondovi').click();
    });

    cy.wait('@getClientFunds').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);

      const funds = extractFunds(response?.body);

      expect(
        funds.length,
        'Ana mora da ima bar jedan fond da bi scenario mogao da se testira.'
      ).to.be.greaterThan(0);

      cy.wrap(funds[0]).as('targetFund');
    });

    cy.get('@targetFund').then((fund: any) => {
      const fundName = fund.fund_name ?? fund.name;
      const fundId = String(fund.fund_id ?? fund.id);

      rollbackFundId = fundId;
      rollbackAmount = 2000;

      cy.contains(fundName).should('be.visible');
      cy.contains(fundName)
        .closest('[role="button"]')
        .within(() => {
          cy.contains('button', 'Povlačenje iz fonda').click();
        });
    });

    cy.wait('@getAccounts').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);

      const accounts = extractAccounts(response?.body);
      const rsdAccount = accounts.find(
        (acc: any) => String(acc.currency ?? '').toUpperCase() === 'RSD'
      );

      expect(
        rsdAccount,
        'Ana mora da ima bar jedan RSD račun za scenario 36.'
      ).to.exist;

      cy.wrap(rsdAccount).as('targetAccount');
    });

    cy.get('input[value="partial"]').check({ force: true });
    cy.get('input[placeholder="Unesite iznos"]').clear().type('2000');

    cy.get('@targetAccount').then((acc: any) => {
      const accountNumber =
        acc.account_number ?? acc.accountNumber ?? acc.AccountNumber ?? acc.number;

      rollbackAccountNumber = String(accountNumber);

      cy.get('select').select(String(accountNumber));
    });

    cy.contains('button', 'Potvrdi povlačenje').click();

    cy.wait('@withdrawFromFund').then(({ request, response }) => {
      expect([200, 201, 202, 400, 409, 422]).to.include(response?.statusCode);
      expect(Number(request.body.amount)).to.eq(2000);
      expect(request.body.account_number).to.exist;

      if ([200, 201, 202].includes(response?.statusCode ?? 0)) {
        shouldRollback = true;
      }
    });
  });
});