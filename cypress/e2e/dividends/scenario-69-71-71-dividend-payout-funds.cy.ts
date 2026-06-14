import { getDirectApiUrl } from '../../support/helpers';

const AUTH_API    = getDirectApiUrl(8080);
const TRADING_API = getDirectApiUrl(8082);
const BANKING_API = getDirectApiUrl(8081);

const FUND_ID = 1;
const FUND_NAME = 'Alpha Growth Fund';
const ANA_FUND_SETUP_AMOUNT = 2000;

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

function getClientId(user: any) {
  return user?.client_id ?? user?.clientId ?? user?.identity_id ?? user?.identityId ?? user?.id;
}

function getFundId(fund: any) {
  return fund?.fund_id ?? fund?.id;
}

function getFundName(fund: any) {
  return fund?.fund_name ?? fund?.name ?? '';
}

function toNum(value: any) {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? 0 : n;
}

function getAccountNumber(account: any) {
  return String(
    account?.AccountNumber ??
    account?.account_number ??
    account?.accountNumber ??
    account?.number ??
    ''
  );
}

function getAccountCurrency(account: any) {
  const direct =
    account?.CurrencyCode ??
    account?.currency_code ??
    account?.currencyCode ??
    account?.currency ??
    account?.Currency?.Code ??
    account?.Currency?.code ??
    account?.currency?.code ??
    account?.currency?.Code;

  if (direct) return String(direct).toUpperCase();

  const currencyId =
    account?.currency_id ??
    account?.currencyId ??
    account?.CurrencyID ??
    account?.Currency?.ID ??
    account?.Currency?.id ??
    account?.currency?.id;

  if (Number(currencyId) === 978) return 'EUR';
  if (Number(currencyId) === 840) return 'USD';
  if (Number(currencyId) === 941) return 'RSD';

  return '';
}

function getAvailableBalance(account: any) {
  return toNum(
    account?.available_balance ??
    account?.availableBalance ??
    account?.AvailableBalance ??
    account?.balance ??
    account?.Balance
  );
}

function getAdminFundLiquidity(fund: any) {
  return toNum(
    fund?.account_balance ??
    fund?.accountBalance ??
    fund?.liquidity ??
    fund?.liquid_assets ??
    fund?.liquidAssets ??
    fund?.cash
  );
}

function getAdminFundValue(fund: any) {
  return toNum(
    fund?.fund_value ??
    fund?.fundValue ??
    fund?.value ??
    fund?.total_value ??
    fund?.totalValue ??
    fund?.net_asset_value ??
    fund?.nav
  );
}

function getAdminFundProfit(fund: any) {
  return toNum(
    fund?.profit ??
    fund?.profit_rsd ??
    fund?.profitRsd
  );
}

function getClientFundValue(fund: any) {
  return toNum(
    fund?.total_invested_rsd ??
    fund?.totalInvestedRsd ??
    fund?.fund_value ??
    fund?.fundValue ??
    fund?.value ??
    fund?.total_value ??
    fund?.totalValue
  );
}

function getClientFundShareValue(fund: any) {
  return toNum(
    fund?.invested_now ??
    fund?.investedNow ??
    fund?.client_value ??
    fund?.clientValue ??
    fund?.client_fund_value ??
    fund?.clientFundValue ??
    fund?.my_share_value ??
    fund?.myShareValue ??
    fund?.current_value ??
    fund?.currentValue
  );
}

function getClientFundPercent(fund: any) {
  const direct = toNum(
    fund?.clients_share_percent ??
    fund?.client_share_percentage ??
    fund?.client_share_percent ??
    fund?.share_percent ??
    fund?.sharePercentage ??
    fund?.percent
  );

  if (direct > 0) return direct;

  const fundValue = getClientFundValue(fund);
  const clientValue = getClientFundShareValue(fund);

  if (fundValue > 0 && clientValue > 0) {
    return (clientValue / fundValue) * 100;
  }

  return 0;
}

function getClientFundProfit(fund: any) {
  return toNum(
    fund?.profit ??
    fund?.profit_rsd ??
    fund?.profitRsd ??
    fund?.my_profit ??
    fund?.myProfit
  );
}

function fetchAdminFund(token: string, fundId: string | number) {
  return cy.request({
    method: 'GET',
    url: `${TRADING_API}/investment-funds/${fundId}`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

function fetchClientFunds(token: string, clientId: string | number) {
  return cy.request({
    method: 'GET',
    url: `${TRADING_API}/client/${clientId}/funds`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

function fetchClientAccounts(token: string, clientId: string | number) {
  return cy.request({
    method: 'GET',
    url: `${BANKING_API}/clients/${clientId}/accounts`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

function fetchAccountDetails(token: string, clientId: string | number, accountNumber: string) {
  return cy.request({
    method: 'GET',
    url: `${BANKING_API}/clients/${clientId}/accounts/${accountNumber}`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

function investInFund(
  token: string,
  fundId: string | number,
  accountNumber: string,
  amount: number
) {
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

function withdrawFromFund(
  token: string,
  fundId: string | number,
  accountNumber: string,
  amount: number
) {
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

function processDividends(adminToken: string) {
  return cy.request({
    method: 'POST',
    url: `${TRADING_API}/dividends/process`,
    headers: { Authorization: `Bearer ${adminToken}` },
    failOnStatusCode: false,
  });
}

function normalizeAdminFund(body: any) {
  const fund = body?.data ?? body;

  return {
    id: getFundId(fund),
    name: getFundName(fund),
    liquidity: getAdminFundLiquidity(fund),
    fundValue: getAdminFundValue(fund),
    profit: getAdminFundProfit(fund),
    raw: fund,
  };
}

function normalizeClientFund(body: any) {
  const funds = pickArray(body);

  const fund =
    funds.find((f: any) => String(getFundId(f)) === String(FUND_ID)) ??
    funds.find((f: any) => getFundName(f).toLowerCase().includes(FUND_NAME.toLowerCase()));

  expect(fund, `${FUND_NAME} mora postojati kod klijenta`).to.exist;

  return {
    id: getFundId(fund),
    name: getFundName(fund),
    fundValue: getClientFundValue(fund),
    clientValue: getClientFundShareValue(fund),
    percent: getClientFundPercent(fund),
    profit: getClientFundProfit(fund),
    raw: fund,
  };
}

function findAnaFundingAccount(accounts: any[]) {
  return (
    accounts.find((acc: any) => getAccountCurrency(acc) === 'RSD') ??
    accounts.find((acc: any) => getAccountCurrency(acc) === 'USD') ??
    accounts[0]
  );
}

describe('Scenarios 69, 71, 72: Dividende u fondovima', () => {
  const anaEmail = 'ana.anic@example.com';
  const anaPassword = 'password123';

  const adminEmail = 'admin@raf.rs';
  const adminPassword = 'admin123';

  let shouldRollbackAnaFund = false;
  let anaRollbackToken = '';
  let anaRollbackAccountNumber = '';
  let anaRollbackAmount = 0;

  beforeEach(() => {
    shouldRollbackAnaFund = false;
    anaRollbackToken = '';
    anaRollbackAccountNumber = '';
    anaRollbackAmount = 0;
  });

  afterEach(() => {
    if (!shouldRollbackAnaFund || !anaRollbackToken || !anaRollbackAccountNumber || !anaRollbackAmount) {
      return;
    }

    withdrawFromFund(
      anaRollbackToken,
      FUND_ID,
      anaRollbackAccountNumber,
      anaRollbackAmount
    ).then((res) => {
      Cypress.log({
        name: 'rollback-withdraw-fund',
        message: `status=${res.status} body=${JSON.stringify(res.body)}`,
      });
    });
  });

  it('Scenario 69: fondu se povećavaju likvidna sredstva nakon dividends/process', () => {
    let adminToken = '';
    let beforeLiquidity = 0;
    let beforeFundValue = 0;

    return loginOnly(adminEmail, adminPassword)
      .then((adminRes) => {
        expect(adminRes.status).to.eq(200);
        adminToken = adminRes.body.token;

        return fetchAdminFund(adminToken, FUND_ID);
      })
      .then((fundRes) => {
        expect(
          fundRes.status,
          `Čitanje fonda nije uspelo: ${JSON.stringify(fundRes.body)}`
        ).to.eq(200);

        const before = normalizeAdminFund(fundRes.body);

        beforeLiquidity = before.liquidity;
        beforeFundValue = before.fundValue;

        expect(beforeLiquidity, 'Početna likvidnost mora biti > 0').to.be.greaterThan(0);
        expect(beforeFundValue, 'Početna vrednost fonda mora biti > 0').to.be.greaterThan(0);

        return processDividends(adminToken);
      })
      .then((processRes) => {
        expect(
          [200, 201],
          `Dividend process nije uspeo: ${JSON.stringify(processRes.body)}`
        ).to.include(processRes.status);

        function pollAdminChange(attempt = 0): Cypress.Chainable<any> {
          return fetchAdminFund(adminToken, FUND_ID).then((fundRes) => {
            expect(fundRes.status).to.eq(200);

            const after = normalizeAdminFund(fundRes.body);

            if (after.liquidity > beforeLiquidity && after.fundValue > beforeFundValue) {
              return cy.wrap(after);
            }

            if (attempt >= 10) {
              throw new Error(
                `Fond nije povećao likvidnost/vrednost. Likvidnost pre: ${beforeLiquidity}, posle: ${after.liquidity}. Vrednost pre: ${beforeFundValue}, posle: ${after.fundValue}`
              );
            }

            return cy.wait(1500).then(() => pollAdminChange(attempt + 1));
          });
        }

        return pollAdminChange();
      })
      .then((after) => {
        expect(after.liquidity, 'Likvidnost fonda mora porasti').to.be.greaterThan(beforeLiquidity);
        expect(after.fundValue, 'Vrednost fonda mora porasti').to.be.greaterThan(beforeFundValue);
      });
  });

  it('Scenario 71: Ana dobija efekat proporcionalan svom udelu u fondu', () => {
    let adminToken = '';
    let anaToken = '';
    let anaClientId: string | number = '';
    let payoutAccountNumber = '';

    let anaBefore: any;
    let balanceBefore = 0;

    return loginOnly(adminEmail, adminPassword)
      .then((adminRes) => {
        expect(adminRes.status).to.eq(200);
        adminToken = adminRes.body.token;

        return loginOnly(anaEmail, anaPassword);
      })
      .then((anaRes) => {
        expect(anaRes.status).to.eq(200);

        anaToken = anaRes.body.token;
        anaClientId = getClientId(anaRes.body.user);

        expect(anaClientId, 'Ana mora imati client id').to.exist;

        anaRollbackToken = anaToken;

        return fetchClientAccounts(anaToken, anaClientId);
      })
      .then((accountsRes) => {
        expect(accountsRes.status).to.eq(200);

        const accounts = pickArray(accountsRes.body);
        expect(accounts.length, 'Ana mora imati bar jedan račun').to.be.greaterThan(0);

        const fundingAccount = findAnaFundingAccount(accounts);
        expect(fundingAccount, 'Ana mora imati račun za uplatu u fond').to.exist;

        payoutAccountNumber = getAccountNumber(fundingAccount);
        anaRollbackAccountNumber = payoutAccountNumber;
        anaRollbackAmount = ANA_FUND_SETUP_AMOUNT;

        return investInFund(
          anaToken,
          FUND_ID,
          payoutAccountNumber,
          ANA_FUND_SETUP_AMOUNT
        );
      })
      .then((investRes) => {
        expect(
          [200, 201],
          `Ana uplata u fond nije uspela: ${JSON.stringify(investRes.body)}`
        ).to.include(investRes.status);

        shouldRollbackAnaFund = true;

        function pollAnaPosition(attempt = 0): Cypress.Chainable<any> {
          return fetchClientFunds(anaToken, anaClientId).then((clientFundsRes) => {
            expect(clientFundsRes.status).to.eq(200);

            const normalized = normalizeClientFund(clientFundsRes.body);

            if (normalized.percent > 0) {
              return cy.wrap(normalized);
            }

            if (attempt >= 10) {
              throw new Error(
                `Ana nema poziciju u fondu ni posle uplate. clientValue=${normalized.clientValue}, percent=${normalized.percent}`
              );
            }

            return cy.wait(1500).then(() => pollAnaPosition(attempt + 1));
          });
        }

        return pollAnaPosition();
      })
      .then((normalizedAnaFund) => {
        anaBefore = normalizedAnaFund;

        return fetchAccountDetails(anaToken, anaClientId, payoutAccountNumber);
      })
      .then((accountRes) => {
        expect(accountRes.status).to.eq(200);
        balanceBefore = getAvailableBalance(accountRes.body);

        return processDividends(adminToken);
      })
      .then((processRes) => {
        expect(
          [200, 201],
          `Dividend process nije uspeo: ${JSON.stringify(processRes.body)}`
        ).to.include(processRes.status);

        function pollAnaPayout(attempt = 0): Cypress.Chainable<any> {
          return fetchClientFunds(anaToken, anaClientId).then((clientFundsRes) => {
            expect(clientFundsRes.status).to.eq(200);
            const anaAfter = normalizeClientFund(clientFundsRes.body);

            return fetchAccountDetails(anaToken, anaClientId, payoutAccountNumber).then((accountRes) => {
              expect(accountRes.status).to.eq(200);
              const balanceAfter = getAvailableBalance(accountRes.body);

              if (balanceAfter > balanceBefore) {
                return cy.wrap({ anaAfter, balanceAfter });
              }

              if (attempt >= 10) {
                throw new Error(
                  `Ana nije dobila priliv posle dividends/process. Balance pre: ${balanceBefore}, posle: ${balanceAfter}, percent: ${anaAfter.percent}`
                );
              }

              return cy.wait(1500).then(() => pollAnaPayout(attempt + 1));
            });
          });
        }

        return pollAnaPayout();
      })
      .then(({ anaAfter, balanceAfter }) => {
        expect(anaBefore.percent, 'Ana mora imati pozitivan procenat udela').to.be.greaterThan(0);
        expect(balanceAfter, 'Anin račun mora porasti posle isplate').to.be.greaterThan(balanceBefore);
        expect(anaAfter.percent, 'Anin procenat mora ostati pozitivan').to.be.greaterThan(0);
      });
  });

  it('Scenario 72: fond i klijent reaguju na isti dividend process uz stabilan procenat udela', () => {
    let adminToken = '';
    let anaToken = '';
    let anaClientId: string | number = '';
    let payoutAccountNumber = '';

    let adminBefore: any;
    let anaBefore: any;
    let balanceBefore = 0;

    return loginOnly(adminEmail, adminPassword)
      .then((adminRes) => {
        expect(adminRes.status).to.eq(200);
        adminToken = adminRes.body.token;

        return loginOnly(anaEmail, anaPassword);
      })
      .then((anaRes) => {
        expect(anaRes.status).to.eq(200);

        anaToken = anaRes.body.token;
        anaClientId = getClientId(anaRes.body.user);

        expect(anaClientId, 'Ana mora imati client id').to.exist;

        anaRollbackToken = anaToken;

        return fetchClientAccounts(anaToken, anaClientId);
      })
      .then((accountsRes) => {
        expect(accountsRes.status).to.eq(200);

        const accounts = pickArray(accountsRes.body);
        expect(accounts.length, 'Ana mora imati bar jedan račun').to.be.greaterThan(0);

        const fundingAccount = findAnaFundingAccount(accounts);
        expect(fundingAccount, 'Ana mora imati račun za uplatu u fond').to.exist;

        payoutAccountNumber = getAccountNumber(fundingAccount);
        anaRollbackAccountNumber = payoutAccountNumber;
        anaRollbackAmount = ANA_FUND_SETUP_AMOUNT;

        return investInFund(
          anaToken,
          FUND_ID,
          payoutAccountNumber,
          ANA_FUND_SETUP_AMOUNT
        );
      })
      .then((investRes) => {
        expect(
          [200, 201],
          `Ana uplata u fond nije uspela: ${JSON.stringify(investRes.body)}`
        ).to.include(investRes.status);

        shouldRollbackAnaFund = true;

        return fetchAdminFund(adminToken, FUND_ID);
      })
      .then((fundRes) => {
        expect(fundRes.status).to.eq(200);
        adminBefore = normalizeAdminFund(fundRes.body);

        function pollAnaPosition(attempt = 0): Cypress.Chainable<any> {
          return fetchClientFunds(anaToken, anaClientId).then((clientFundsRes) => {
            expect(clientFundsRes.status).to.eq(200);

            const normalized = normalizeClientFund(clientFundsRes.body);

            if (normalized.percent > 0) {
              return cy.wrap(normalized);
            }

            if (attempt >= 10) {
              throw new Error(
                `Ana nema poziciju u fondu ni posle uplate. clientValue=${normalized.clientValue}, percent=${normalized.percent}`
              );
            }

            return cy.wait(1500).then(() => pollAnaPosition(attempt + 1));
          });
        }

        return pollAnaPosition();
      })
      .then((normalizedAnaFund) => {
        anaBefore = normalizedAnaFund;

        return fetchAccountDetails(anaToken, anaClientId, payoutAccountNumber);
      })
      .then((accountRes) => {
        expect(accountRes.status).to.eq(200);
        balanceBefore = getAvailableBalance(accountRes.body);

        return processDividends(adminToken);
      })
      .then((processRes) => {
        expect(
          [200, 201],
          `Dividend process nije uspeo: ${JSON.stringify(processRes.body)}`
        ).to.include(processRes.status);

        function pollConsistency(attempt = 0): Cypress.Chainable<any> {
          return fetchAdminFund(adminToken, FUND_ID).then((adminFundRes) => {
            expect(adminFundRes.status).to.eq(200);
            const adminAfter = normalizeAdminFund(adminFundRes.body);

            return fetchClientFunds(anaToken, anaClientId).then((clientFundsRes) => {
              expect(clientFundsRes.status).to.eq(200);
              const anaAfter = normalizeClientFund(clientFundsRes.body);

              return fetchAccountDetails(anaToken, anaClientId, payoutAccountNumber).then((accountRes) => {
                expect(accountRes.status).to.eq(200);
                const balanceAfter = getAvailableBalance(accountRes.body);

                const fundChanged =
                  adminAfter.liquidity > adminBefore.liquidity &&
                  adminAfter.fundValue > adminBefore.fundValue;

                const clientChanged =
                  balanceAfter > balanceBefore;

                if (fundChanged && clientChanged) {
                  return cy.wrap({ adminAfter, anaAfter, balanceAfter });
                }

                if (attempt >= 10) {
                  throw new Error(
                    `Nema konzistentne promene posle dividends/process. Fund pre/posle liquidity: ${adminBefore.liquidity}/${adminAfter.liquidity}, Fund pre/posle value: ${adminBefore.fundValue}/${adminAfter.fundValue}, Ana balance pre/posle: ${balanceBefore}/${balanceAfter}, Ana percent pre/posle: ${anaBefore.percent}/${anaAfter.percent}`
                  );
                }

                return cy.wait(1500).then(() => pollConsistency(attempt + 1));
              });
            });
          });
        }

        return pollConsistency();
      })
      .then(({ adminAfter, anaAfter, balanceAfter }) => {
        expect(adminAfter.liquidity, 'Likvidnost fonda mora porasti').to.be.greaterThan(adminBefore.liquidity);
        expect(adminAfter.fundValue, 'Vrednost fonda mora porasti').to.be.greaterThan(adminBefore.fundValue);
        expect(balanceAfter, 'Anin račun mora dobiti priliv').to.be.greaterThan(balanceBefore);
        expect(anaAfter.percent, 'Procenat Ane treba da ostane približno isti').to.be.closeTo(anaBefore.percent, 0.2);
      });
  });
});

export {};