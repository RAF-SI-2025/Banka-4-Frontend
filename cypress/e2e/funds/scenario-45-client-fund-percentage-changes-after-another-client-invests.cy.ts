const AUTH_API = 'http://rafsi.davidovic.io:8080/api';
const BANKING_API = 'http://rafsi.davidovic.io:8081/api';
const TRADING_API = 'http://rafsi.davidovic.io:8082/api';

function pickArray(body: any) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.content)) return body.content;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

function loginOnly(email: string, password: string) {
  return cy.request('POST', `${AUTH_API}/auth/login`, { email, password });
}

function loginAndVisit(email: string, password: string, path: string) {
  return loginOnly(email, password).then((res) => {
    expect(res.status).to.eq(200);

    const { user, token, refresh_token } = res.body;

    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token);
        if (refresh_token) win.localStorage.setItem('refreshToken', refresh_token);
        else win.localStorage.removeItem('refreshToken');
        win.localStorage.setItem('user', JSON.stringify(user));
      },
    });

    return cy.wrap(res.body);
  });
}

function getClientId(user: any) {
  return user?.client_id ?? user?.identity_id ?? user?.id;
}

function getFundId(fund: any) {
  return fund?.fund_id ?? fund?.id;
}

function getFundName(fund: any) {
  return fund?.fund_name ?? fund?.name ?? '';
}

function fetchClientFunds(token: string, clientId: string | number) {
  return cy.request({
    method: 'GET',
    url: `${TRADING_API}/client/${clientId}/funds`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

function fetchAllBankAccounts(token: string) {
  return cy.request({
    method: 'GET',
    url: `${BANKING_API}/accounts?page=1&page_size=200`,
    headers: { Authorization: `Bearer ${token}` },
  });
}

function findInternalBankAccount(accounts: any[]) {
  return accounts.find((a) => {
    const type = String(a.AccountType ?? a.account_type ?? '').toLowerCase();
    const companyId = Number(a.CompanyID ?? a.company_id ?? 0);
    return type === 'bank' && companyId === 1;
  });
}

function getAccountNumber(account: any) {
  return String(
    account?.AccountNumber ??
    account?.account_number ??
    account?.accountNumber ??
    ''
  );
}

function investInFund(token: string, fundId: string | number, accountNumber: string, amount: number) {
  return cy.request({
    method: 'POST',
    url: `${TRADING_API}/investment-funds/${fundId}/invest`,
    headers: { Authorization: `Bearer ${token}` },
    body: {
      account_number: accountNumber,
      amount,
    },
    failOnStatusCode: false,
  });
}

function withdrawFromFund(token: string, fundId: string | number, accountNumber: string, amount: number) {
  return cy.request({
    method: 'POST',
    url: `${TRADING_API}/investment-funds/${fundId}/withdraw`,
    headers: { Authorization: `Bearer ${token}` },
    body: {
      account_number: accountNumber,
      amount,
    },
    failOnStatusCode: false,
  });
}

function parsePercentFromCardText(cardText: string) {
  const compact = cardText.replace(/\s+/g, ' ');
  const match = compact.match(/Procenat:\s*([0-9.,]+)%/i);
  if (!match) return null;

  const normalized = match[1].replace(',', '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

describe('Scenario 45: Procenat fonda klijenta se menja kada admin uplati u isti fond', () => {
  const anaEmail = 'ana.anic@example.com';
  const anaPassword = 'password123';

  const adminEmail = 'admin@raf.rs';
  const adminPassword = 'admin123';

  let rollbackFundId: string | number | null = null;
  let rollbackAccountNumber = '';
  let rollbackAmount = 0;
  let shouldRollback = false;
  let adminTokenForRollback = '';

  beforeEach(() => {
    rollbackFundId = null;
    rollbackAccountNumber = '';
    rollbackAmount = 0;
    shouldRollback = false;
    adminTokenForRollback = '';
  });

  afterEach(() => {
    if (!shouldRollback || !rollbackFundId || !rollbackAccountNumber || !rollbackAmount || !adminTokenForRollback) {
      return;
    }

    withdrawFromFund(
      adminTokenForRollback,
      rollbackFundId,
      rollbackAccountNumber,
      rollbackAmount
    );
  });

  it('procenat klijenta A se smanjuje nakon admin uplate u isti fond', () => {
    let anaToken = '';
    let anaClientId: string | number = '';
    let adminToken = '';

    function pollAnaPortfolio(targetFundName: string, percentBefore: number, attempt = 0): Cypress.Chainable<any> {
      return loginAndVisit(anaEmail, anaPassword, '/client/portfolio')
        .then(() => {
          cy.contains(/^Moji fondovi$/i).click();

          return cy.contains(String(targetFundName))
            .closest('[role="button"]')
            .invoke('text');
        })
        .then((cardText) => {
          const percentAfter = parsePercentFromCardText(cardText);

          expect(
            percentAfter,
            `Procenat mora biti prikazan i nakon admin uplate. Tekst kartice: ${cardText}`
          ).to.not.equal(null);

          if (Number(percentAfter) < Number(percentBefore)) {
            return cy.wrap(Number(percentAfter));
          }

          if (attempt >= 8) {
            throw new Error(`Procenat se nije smanjio. Pre: ${percentBefore}, posle: ${percentAfter}`);
          }

          return cy.wait(1000).then(() => pollAnaPortfolio(targetFundName, percentBefore, attempt + 1));
        });
    }

    return loginOnly(anaEmail, anaPassword)
      .then((res) => {
        expect(res.status).to.eq(200);

        anaToken = res.body.token;
        anaClientId = getClientId(res.body.user);

        expect(anaClientId, 'Ana mora imati client id').to.exist;

        return fetchClientFunds(anaToken, anaClientId);
      })
      .then((res) => {
        expect(res.status).to.eq(200);

        const funds = pickArray(res.body);
        expect(funds.length, 'Ana mora imati bar jedan fond').to.be.greaterThan(0);

        const alphaFund = funds.find((f: any) => {
          const name = getFundName(f).toLowerCase();
          return name.includes('alpha growth fund');
        });

        expect(alphaFund, 'Ana mora imati Alpha Growth Fund').to.exist;

        const targetFundId = getFundId(alphaFund);
        const targetFundName = getFundName(alphaFund);

        expect(targetFundId, 'Alpha Growth Fund mora imati id').to.exist;
        expect(targetFundName, 'Alpha Growth Fund mora imati naziv').to.not.equal('');

        cy.wrap(targetFundId).as('targetFundId');
        cy.wrap(targetFundName).as('targetFundName');

        return loginAndVisit(anaEmail, anaPassword, '/client/portfolio');
      })
      .then(() => {
        cy.contains(/^Moji fondovi$/i).click();

        return cy.get('@targetFundName').then((targetFundName) => {
          return cy.contains(String(targetFundName))
            .closest('[role="button"]')
            .invoke('text');
        });
      })
      .then((cardText) => {
        const parsed = parsePercentFromCardText(cardText);

        expect(
          parsed,
          `Procenat mora biti prikazan na UI kartici fonda. Tekst kartice: ${cardText}`
        ).to.not.equal(null);

        const percentBefore = Number(parsed);
        expect(percentBefore, 'Početni procenat mora biti > 0').to.be.greaterThan(0);

        cy.wrap(percentBefore).as('percentBefore');

        return loginOnly(adminEmail, adminPassword);
      })
      .then((res) => {
        expect(res.status).to.eq(200);

        adminToken = res.body.token;
        adminTokenForRollback = res.body.token;

        return fetchAllBankAccounts(adminToken);
      })
      .then((accountsRes) => {
        expect(accountsRes.status).to.eq(200);

        const bankAccounts = pickArray(accountsRes.body);
        expect(bankAccounts.length, 'Moraju postojati bankovni računi').to.be.greaterThan(0);

        const bankAccount = findInternalBankAccount(bankAccounts);
        expect(
          bankAccount,
          'Mora postojati interni bankovni račun (AccountType=bank, CompanyID=1)'
        ).to.exist;

        const accountNumber = getAccountNumber(bankAccount);
        expect(accountNumber, 'Interni bankovni račun mora imati broj').to.not.equal('');

        rollbackAccountNumber = accountNumber;
        rollbackAmount = 20000;

        return cy.get('@targetFundId').then((targetFundId: any) => {
          const fundId = String(targetFundId);

          rollbackFundId = fundId;
          return investInFund(adminToken, fundId, accountNumber, 20000);
        });
      })
      .then((investRes: any) => {
        expect(
          [200, 201],
          `Admin uplata nije uspela: ${JSON.stringify(investRes.body)}`
        ).to.include(investRes.status);

        shouldRollback = true;

        return cy.get('@targetFundName').then((targetFundName) => {
          return cy.get('@percentBefore').then((percentBefore) => {
            return pollAnaPortfolio(String(targetFundName), Number(percentBefore));
          });
        });
      })
      .then((updatedPercent) => {
        expect(Number(updatedPercent)).to.be.greaterThan(0);

        return cy.get('@targetFundName').then((targetFundName) => {
          return loginAndVisit(anaEmail, anaPassword, '/client/portfolio').then(() => {
            cy.contains(/^Moji fondovi$/i).click();
            cy.contains(String(targetFundName)).should('be.visible');
          });
        });
      });
  });
});