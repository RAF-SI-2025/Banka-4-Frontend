import { getDirectApiUrl } from '../../support/helpers';

const AUTH_API    = getDirectApiUrl(8080);
const BANKING_API = getDirectApiUrl(8081);
const TRADING_API = getDirectApiUrl(8082);

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
  return String(
    account?.CurrencyCode ??
    account?.currency_code ??
    account?.currencyCode ??
    account?.currency ??
    account?.Currency?.Code ??
    account?.Currency?.code ??
    ''
  ).toUpperCase();
}

function getAvailableBalance(account: any) {
  const raw =
    account?.available_balance ??
    account?.availableBalance ??
    account?.AvailableBalance ??
    account?.balance ??
    account?.Balance ??
    0;

  return Number(raw ?? 0);
}

function getDividendYield(stock: any) {
  const raw = Number(stock?.dividend_yield ?? stock?.dividendYield ?? 0);
  if (!raw || Number.isNaN(raw)) return 0;

  // Ako backend vrati 0.052 = 5.2%, ostavi.
  // Ako vrati 5.2 = 5.2%, prebaci u decimalu.
  return raw > 1 ? raw / 100 : raw;
}

function getListingId(stock: any) {
  return stock?.listing_id ?? stock?.listingId ?? stock?.id;
}

function getTicker(item: any) {
  return String(item?.ticker ?? item?.Ticker ?? '').toUpperCase();
}

function getOwnershipId(asset: any) {
  return (
    asset?.ownership_id ??
    asset?.asset_ownership_id ??
    asset?.ownershipId ??
    asset?.assetOwnershipId ??
    asset?.id
  );
}

function fetchClientAccounts(token: string, clientId: string | number) {
  return cy.request({
    method: 'GET',
    url: `${BANKING_API}/clients/${clientId}/accounts`,
    headers: { Authorization: `Bearer ${token}` },
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

function fetchStocks(token: string) {
  return cy.request({
    method: 'GET',
    url: `${TRADING_API}/listings/stocks?page=1&page_size=200&sort_by=price&sort_dir=asc`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

function fetchClientAssets(token: string, clientId: string | number) {
  return cy.request({
    method: 'GET',
    url: `${TRADING_API}/client/${clientId}/assets`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

function fetchClientDividends(token: string, clientId: string | number, assetOwnershipId: string | number) {
  return cy.request({
    method: 'GET',
    url: `${TRADING_API}/client/${clientId}/assets/${assetOwnershipId}/dividends`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

function createOrder(token: string, payload: any) {
  return cy.request({
    method: 'POST',
    url: `${TRADING_API}/orders`,
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
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

function computeExpectedQuarterlyDividend(price: number, dividendYieldDecimal: number, quantity: number) {
  return price * quantity * (dividendYieldDecimal / 4);
}

describe('Scenario 54: Kvartalna isplata dividendi vlasnicima akcije', () => {
  const anaEmail = 'ana.anic@example.com';
  const anaPassword = 'password123';

  const adminEmail = 'admin@raf.rs';
  const adminPassword = 'admin123';

  let shouldRollback = false;
  let anaTokenForRollback = '';
  let anaClientIdForRollback: string | number = '';
  let boughtListingIdForRollback: string | number | null = null;
  let usedAccountNumberForRollback = '';

  beforeEach(() => {
    shouldRollback = false;
    anaTokenForRollback = '';
    anaClientIdForRollback = '';
    boughtListingIdForRollback = null;
    usedAccountNumberForRollback = '';
  });

  afterEach(() => {
    if (!shouldRollback || !anaTokenForRollback || !anaClientIdForRollback || !boughtListingIdForRollback || !usedAccountNumberForRollback) {
      return;
    }

    createOrder(anaTokenForRollback, {
      account_number: usedAccountNumberForRollback,
      direction: 'SELL',
      listing_id: boughtListingIdForRollback,
      order_type: 'MARKET',
      quantity: 1,
    }).then((res) => {
      // rollback best effort – ne rušimo test ako cleanup ne uspe
      Cypress.log({
        name: 'rollback-sell',
        message: `status=${res.status} body=${JSON.stringify(res.body)}`,
      });
    });
  });

  it('obračunava i isplaćuje kvartalnu dividendu na račun sa kog je akcija kupljena', () => {
    let anaToken = '';
    let adminToken = '';
    let anaClientId: string | number = '';

    let selectedStock: any = null;
    let selectedAccount: any = null;
    let selectedAccountNumber = '';
    let accountBalanceBefore = 0;
    let accountBalanceAfterBuy = 0;

    let assetAmountBefore = 0;
    let boughtAssetOwnershipId: string | number | null = null;
    let dividendsCountBefore = 0;

    return loginOnly(anaEmail, anaPassword)
      .then((res) => {
        expect(res.status).to.eq(200);

        anaToken = res.body.token;
        anaClientId = getClientId(res.body.user);

        anaTokenForRollback = anaToken;
        anaClientIdForRollback = anaClientId;

        expect(anaClientId, 'Ana mora imati client id').to.exist;

        return fetchClientAccounts(anaToken, anaClientId);
      })
      .then((accountsRes) => {
        expect(accountsRes.status).to.eq(200);

        const accounts = pickArray(accountsRes.body);
        expect(accounts.length, 'Ana mora imati bar jedan račun').to.be.greaterThan(0);

        return fetchStocks(anaToken).then((stocksRes) => {
          expect(stocksRes.status).to.eq(200);

          const stocks = pickArray(stocksRes.body);
          expect(stocks.length, 'Mora postojati bar jedna akcija').to.be.greaterThan(0);

          const candidate = stocks.find((stock: any) => {
            const yieldValue = getDividendYield(stock);
            if (yieldValue <= 0) return false;

            const stockCurrency = String(stock?.currency ?? stock?.Currency ?? '').toUpperCase();

            const matchingAccount = accounts.find((acc: any) => {
              const accCurrency = getAccountCurrency(acc);
              return accCurrency && accCurrency === stockCurrency;
            });

            if (!matchingAccount) return false;

            return true;
          });

          expect(candidate, 'Mora postojati akcija sa dividend_yield > 0 i odgovarajući račun iste valute').to.exist;

          selectedStock = candidate;

          const stockCurrency = String(candidate.currency ?? '').toUpperCase();
          selectedAccount = accounts.find((acc: any) => getAccountCurrency(acc) === stockCurrency);

          expect(selectedAccount, 'Mora postojati račun iste valute kao akcija').to.exist;

          selectedAccountNumber = getAccountNumber(selectedAccount);
          usedAccountNumberForRollback = selectedAccountNumber;

          expect(selectedAccountNumber, 'Račun za kupovinu mora imati broj').to.not.equal('');

          return fetchAccountDetails(anaToken, anaClientId, selectedAccountNumber);
        });
      })
      .then((accountDetailsRes) => {
        expect(accountDetailsRes.status).to.eq(200);

        accountBalanceBefore = getAvailableBalance(accountDetailsRes.body);
        expect(accountBalanceBefore, 'Račun mora imati pozitivno raspoloživo stanje').to.be.greaterThan(0);

        const stockPrice = Number(selectedStock?.price ?? 0);
        expect(stockPrice, 'Akcija mora imati cenu > 0').to.be.greaterThan(0);

        expect(
          accountBalanceBefore,
          'Račun mora imati dovoljno sredstava za kupovinu 1 akcije'
        ).to.be.greaterThan(stockPrice);

        return fetchClientAssets(anaToken, anaClientId);
      })
      .then((assetsBeforeRes) => {
        expect(assetsBeforeRes.status).to.eq(200);

        const assetsBefore = pickArray(assetsBeforeRes.body);
        const maybeExisting = assetsBefore.find((asset: any) => {
          return getTicker(asset) === getTicker(selectedStock);
        });

        assetAmountBefore = Number(maybeExisting?.amount ?? 0);

        return createOrder(anaToken, {
          account_number: selectedAccountNumber,
          direction: 'BUY',
          listing_id: getListingId(selectedStock),
          order_type: 'MARKET',
          quantity: 1,
        });
      })
      .then((buyRes) => {
        expect(
          [200, 201],
          `BUY order nije uspeo: ${JSON.stringify(buyRes.body)}`
        ).to.include(buyRes.status);

        shouldRollback = true;
        boughtListingIdForRollback = getListingId(selectedStock);

        function pollBoughtAsset(attempt = 0): Cypress.Chainable<any> {
          return fetchClientAssets(anaToken, anaClientId).then((assetsRes) => {
            expect(assetsRes.status).to.eq(200);

            const assets = pickArray(assetsRes.body);
            const boughtAsset = assets.find((asset: any) => getTicker(asset) === getTicker(selectedStock));

            if (boughtAsset && Number(boughtAsset.amount ?? 0) >= assetAmountBefore + 1) {
              return cy.wrap(boughtAsset);
            }

            if (attempt >= 10) {
              throw new Error(`Kupljena akcija se nije pojavila u portfoliju za ticker ${getTicker(selectedStock)}.`);
            }

            return cy.wait(1500).then(() => pollBoughtAsset(attempt + 1));
          });
        }

        return pollBoughtAsset();
      })
      .then((boughtAsset) => {
        boughtAssetOwnershipId = getOwnershipId(boughtAsset);
        expect(boughtAssetOwnershipId, 'Kupljena pozicija mora imati ownership id').to.exist;

        return fetchAccountDetails(anaToken, anaClientId, selectedAccountNumber);
      })
      .then((accountAfterBuyRes) => {
        expect(accountAfterBuyRes.status).to.eq(200);

        accountBalanceAfterBuy = getAvailableBalance(accountAfterBuyRes.body);

        return fetchClientDividends(anaToken, anaClientId, boughtAssetOwnershipId as string | number);
      })
      .then((dividendsBeforeRes) => {
        expect(dividendsBeforeRes.status).to.eq(200);
        dividendsCountBefore = pickArray(dividendsBeforeRes.body).length;

        return loginOnly(adminEmail, adminPassword);
      })
      .then((adminLoginRes) => {
        expect(adminLoginRes.status).to.eq(200);
        adminToken = adminLoginRes.body.token;

        return processDividends(adminToken);
      })
      .then((processRes) => {
        expect(
          [200, 201],
          `Dividend process nije uspeo: ${JSON.stringify(processRes.body)}`
        ).to.include(processRes.status);

        function pollDividends(attempt = 0): Cypress.Chainable<any> {
          return fetchClientDividends(anaToken, anaClientId, boughtAssetOwnershipId as string | number).then((divRes) => {
            expect(divRes.status).to.eq(200);

            const payouts = pickArray(divRes.body);

            if (payouts.length > dividendsCountBefore) {
              return cy.wrap(payouts);
            }

            if (attempt >= 10) {
              throw new Error('Dividend payout se nije pojavio nakon process endpointa.');
            }

            return cy.wait(1500).then(() => pollDividends(attempt + 1));
          });
        }

        return pollDividends();
      })
      .then((payouts: any[]) => {
        const latest = payouts[payouts.length - 1];
        expect(latest, 'Mora postojati novi dividend payout').to.exist;

        const payoutAccountNumber =
          latest?.accountNumber ??
          latest?.account_number ??
          latest?.account_number_to ??
          '';

        expect(
          String(payoutAccountNumber),
          'Dividenda mora biti uplaćena na isti račun sa kog je akcija kupljena'
        ).to.eq(String(selectedAccountNumber));

        const grossAmount = Number(latest?.grossAmount ?? latest?.gross_amount ?? 0);
        const netAmount = Number(latest?.netAmount ?? latest?.net_amount ?? 0);

        expect(grossAmount, 'Bruto dividenda mora biti > 0').to.be.greaterThan(0);
        expect(netAmount, 'Neto dividenda mora biti > 0').to.be.greaterThan(0);

        const expectedGross = computeExpectedQuarterlyDividend(
          Number(selectedStock?.price ?? 0),
          getDividendYield(selectedStock),
          1
        );

        expect(
          grossAmount,
          `Bruto dividenda treba približno da prati formulu quantity × price × (yield / 4). Očekivano ≈ ${expectedGross}, dobijeno ${grossAmount}`
        ).to.be.closeTo(expectedGross, Math.max(0.5, expectedGross * 0.25));

        function pollBalanceIncrease(attempt = 0): Cypress.Chainable<any> {
          return fetchAccountDetails(anaToken, anaClientId, selectedAccountNumber).then((accountRes) => {
            expect(accountRes.status).to.eq(200);

            const balanceAfter = getAvailableBalance(accountRes.body);

            if (balanceAfter > accountBalanceAfterBuy) {
              return cy.wrap(balanceAfter);
            }

            if (attempt >= 10) {
              throw new Error(
                `Stanje računa se nije povećalo nakon isplate dividende. Posle BUY: ${accountBalanceAfterBuy}, posle dividende: ${balanceAfter}`
              );
            }

            return cy.wait(1500).then(() => pollBalanceIncrease(attempt + 1));
          });
        }

        return pollBalanceIncrease();
      })
      .then((balanceAfter) => {
        expect(
          Number(balanceAfter),
          'Stanje računa posle isplate dividende mora biti veće nego odmah nakon BUY ordera'
        ).to.be.greaterThan(accountBalanceAfterBuy);
      });
  });
});

export {};