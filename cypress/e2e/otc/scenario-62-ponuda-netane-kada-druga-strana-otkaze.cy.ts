// nema nacin da se testira email preko UI-ja, ali mozemo da testiramo da li se ugovor ponovo pojavljuje u listi ponuda nakon sto druga strana otkaze ugovor

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

function getTicker(item: any) {
  return String(item?.ticker ?? item?.Ticker ?? '').toUpperCase();
}

function getListingId(stock: any) {
  return stock?.listing_id ?? stock?.listingId ?? stock?.id;
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

function getOfferId(offer: any) {
  return (
    offer?.otc_offer_id ??
    offer?.offer_id ??
    offer?.id ??
    offer?.data?.otc_offer_id ??
    offer?.data?.offer_id ??
    offer?.data?.id ??
    null
  );
}

function getPublishableAmount(asset: any) {
  const explicitAvailable =
    asset?.available_amount ??
    asset?.availableAmount ??
    asset?.available_for_otc ??
    asset?.availableForOtc;

  if (explicitAvailable != null) {
    return Number(explicitAvailable ?? 0);
  }

  const owned = Number(asset?.amount ?? 0);
  const reserved = Number(
    asset?.reserved_amount ??
    asset?.reservedAmount ??
    asset?.public_amount ??
    asset?.publicAmount ??
    0
  );

  return Math.max(0, owned - reserved);
}

function fetchClientAccounts(token: string, clientId: string | number) {
  return cy.request({
    method: 'GET',
    url: `${BANKING_API}/clients/${clientId}/accounts`,
    headers: { Authorization: `Bearer ${token}` },
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

function createOrder(token: string, payload: any) {
  return cy.request({
    method: 'POST',
    url: `${TRADING_API}/orders`,
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
    failOnStatusCode: false,
  });
}

function publishClientAsset(
  token: string,
  clientId: string | number,
  ownershipId: string | number,
  amount: number
) {
  return cy.request({
    method: 'PATCH',
    url: `${TRADING_API}/client/${clientId}/assets/${ownershipId}/publish`,
    headers: { Authorization: `Bearer ${token}` },
    body: { amount },
    failOnStatusCode: false,
  });
}

function createOtcOffer(token: string, payload: any) {
  return cy.request({
    method: 'POST',
    url: `${TRADING_API}/otc/offers`,
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
    failOnStatusCode: false,
  });
}

function getAssetId(asset: any) {
  return (
    asset?.asset_id ??
    asset?.assetId ??
    asset?.id
  );
}

function fetchActiveOffers(token: string) {
  return cy.request({
    method: 'GET',
    url: `${TRADING_API}/otc/offers/active`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

function rejectOtcOffer(token: string, offerId: string | number, comment = 'Cypress cleanup/cancel') {
  return cy.request({
    method: 'PATCH',
    url: `${TRADING_API}/otc/offers/${offerId}/reject`,
    headers: { Authorization: `Bearer ${token}` },
    body: { comment },
    failOnStatusCode: false,
  });
}

function getNewOwnershipAfterBuy(beforeAssets: any[], afterAssets: any[]) {
  const beforeIds = new Set(
    beforeAssets
      .map((a: any) => String(getOwnershipId(a)))
      .filter((id: string) => id && id !== 'undefined' && id !== 'null')
  );

  return afterAssets.find((asset: any) => {
    const id = String(getOwnershipId(asset));
    return id && id !== 'undefined' && id !== 'null' && !beforeIds.has(id);
  });
}

describe('Scenario 62: Kada jedna strana odustane, ponuda nestaje iz aktivnih pregovora za obe strane', () => {
  const anaEmail = 'ana.anic@example.com';
  const anaPassword = 'password123';

  const markoEmail = 'marko@raf.rs';
  const markoPassword = 'pass123';

  let shouldRollbackSell = false;
  let anaTokenForRollback = '';
  let boughtListingIdForRollback: string | number | null = null;
  let anaAccountNumberForRollback = '';

  let shouldRollbackOffer = false;
  let rejectTokenForRollback = '';
  let offerIdForRollback: string | number | null = null;

  beforeEach(() => {
    shouldRollbackSell = false;
    anaTokenForRollback = '';
    boughtListingIdForRollback = null;
    anaAccountNumberForRollback = '';

    shouldRollbackOffer = false;
    rejectTokenForRollback = '';
    offerIdForRollback = null;
  });

  afterEach(() => {
    if (shouldRollbackOffer && rejectTokenForRollback && offerIdForRollback) {
      rejectOtcOffer(rejectTokenForRollback, offerIdForRollback).then((res) => {
        Cypress.log({
          name: 'rollback-reject-offer',
          message: `status=${res.status} body=${JSON.stringify(res.body)}`,
        });
      });
    }

    if (shouldRollbackSell && anaTokenForRollback && boughtListingIdForRollback && anaAccountNumberForRollback) {
      createOrder(anaTokenForRollback, {
        account_number: anaAccountNumberForRollback,
        direction: 'SELL',
        listing_id: boughtListingIdForRollback,
        order_type: 'MARKET',
        quantity: 3,
      }).then((res) => {
        Cypress.log({
          name: 'rollback-sell',
          message: `status=${res.status} body=${JSON.stringify(res.body)}`,
        });
      });
    }
  });

  it('ponuda se vidi kod oba korisnika i nestaje kada jedna strana odustane', () => {
    let anaToken = '';
    let anaClientId: string | number = '';
    let markoToken = '';
    let markoClientId: string | number = '';

    let selectedStock: any = null;
    let anaBuyAccount: any = null;
    let markoBuyerAccount: any = null;

    let boughtOwnershipId: string | number | null = null;
    let createdOfferId: string | number | null = null;
    let assetsBeforeMap: Map<string, number> = new Map();
    let assetsBeforeSnapshot: any[] = [];
    let boughtAssetId: string | number | null = null;

    const settlementDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    return loginOnly(anaEmail, anaPassword)
      .then((anaLoginRes) => {
        expect(anaLoginRes.status).to.eq(200);

        anaToken = anaLoginRes.body.token;
        anaClientId = getClientId(anaLoginRes.body.user);

        anaTokenForRollback = anaToken;

        expect(anaClientId, 'Ana mora imati client id').to.exist;

        return loginOnly(markoEmail, markoPassword);
      })
      .then((markoLoginRes) => {
        expect(markoLoginRes.status).to.eq(200);

        markoToken = markoLoginRes.body.token;
        markoClientId = getClientId(markoLoginRes.body.user);

        expect(markoClientId, 'Marko mora imati client id').to.exist;

        return fetchClientAccounts(anaToken, anaClientId).then((anaAccountsRes) => {
          return fetchClientAccounts(markoToken, markoClientId).then((markoAccountsRes) => {
            return fetchClientAssets(anaToken, anaClientId).then((anaAssetsRes) => {
              return fetchStocks(anaToken).then((stocksRes) => {
                return {
                  anaAccountsRes,
                  markoAccountsRes,
                  anaAssetsRes,
                  stocksRes,
                };
              });
            });
          });
        });
      })
      .then(({ anaAccountsRes, markoAccountsRes, anaAssetsRes, stocksRes }: any) => {
        expect(anaAccountsRes.status).to.eq(200);
        expect(markoAccountsRes.status).to.eq(200);
        expect(anaAssetsRes.status).to.eq(200);
        expect(stocksRes.status).to.eq(200);

        const anaAccounts = pickArray(anaAccountsRes.body);
        const markoAccounts = pickArray(markoAccountsRes.body);
        const anaAssets = pickArray(anaAssetsRes.body);
        const stocks = pickArray(stocksRes.body);

        const anaOwnedTickers = new Set(
          anaAssets.map((asset: any) => getTicker(asset)).filter(Boolean)
        );

        const candidate = stocks.find((stock: any) => {
          const stockCurrency = String(stock?.currency ?? '').toUpperCase();
          if (!stockCurrency) return false;
          if (Number(stock?.price ?? 0) <= 0) return false;

          const anaAcc = anaAccounts.find((acc: any) => getAccountCurrency(acc) === stockCurrency);
          const markoAcc = markoAccounts.find((acc: any) => getAccountCurrency(acc) === stockCurrency);

          if (!anaAcc || !markoAcc) return false;

          // BITNO: Ana ne sme već da poseduje ovu hartiju
          if (anaOwnedTickers.has(getTicker(stock))) return false;

          return true;
        });

        expect(candidate, 'Mora postojati akcija i račun iste valute kod oba korisnika').to.exist;

        selectedStock = candidate;

        const stockCurrency = String(candidate.currency ?? '').toUpperCase();
        anaBuyAccount = anaAccounts.find((acc: any) => getAccountCurrency(acc) === stockCurrency);
        markoBuyerAccount = markoAccounts.find((acc: any) => getAccountCurrency(acc) === stockCurrency);

        expect(anaBuyAccount, 'Ana mora imati račun za kupovinu').to.exist;
        expect(markoBuyerAccount, 'Marko mora imati račun za OTC ponudu').to.exist;

        anaAccountNumberForRollback = getAccountNumber(anaBuyAccount);
        expect(anaAccountNumberForRollback, 'Anin račun mora imati broj').to.not.equal('');

        return fetchClientAssets(anaToken, anaClientId);
      })
      .then((assetsBeforeRes) => {
        expect(assetsBeforeRes.status).to.eq(200);

        assetsBeforeSnapshot = pickArray(assetsBeforeRes.body);
        assetsBeforeMap = new Map<string, number>(
          assetsBeforeSnapshot
            .map((asset): [string, number] => [
              String(getOwnershipId(asset)),
              Number(asset?.amount ?? 0),
            ])
            .filter(([id]) => id && id !== 'undefined' && id !== 'null')
        );

        return createOrder(anaToken, {
          account_number: getAccountNumber(anaBuyAccount),
          direction: 'BUY',
          listing_id: getListingId(selectedStock),
          order_type: 'MARKET',
          quantity: 3,
        });
      })
      .then((buyRes) => {
        expect(
          [200, 201],
          `BUY order nije uspeo: ${JSON.stringify(buyRes.body)}`
        ).to.include(buyRes.status);

        shouldRollbackSell = true;
        boughtListingIdForRollback = getListingId(selectedStock);

        function pollBoughtAsset(attempt = 0): Cypress.Chainable<any> {
          return fetchClientAssets(anaToken, anaClientId).then((assetsRes) => {
            expect(assetsRes.status).to.eq(200);

            const assetsAfter = pickArray(assetsRes.body);

            const newOwnershipAsset = getNewOwnershipAfterBuy(assetsBeforeSnapshot, assetsAfter);

            if (newOwnershipAsset) {
              return cy.wrap(newOwnershipAsset);
            }

            const changedAsset = assetsAfter.find((asset: any) => {
              if (getTicker(asset) !== getTicker(selectedStock)) return false;

              const ownershipId = String(getOwnershipId(asset));
              const beforeAmount = assetsBeforeMap.get(ownershipId);

              if (beforeAmount == null) {
                return Number(asset?.amount ?? 0) >= 1;
              }

              return Number(asset?.amount ?? 0) > beforeAmount;
            });

            if (changedAsset) {
              return cy.wrap(changedAsset);
            }

            if (attempt >= 10) {
              throw new Error(
                `Kupljena akcija se nije pojavila kao nova/uvećana pozicija za ticker ${getTicker(selectedStock)}.`
              );
            }

            return cy.wait(1500).then(() => pollBoughtAsset(attempt + 1));
          });
        }

        return pollBoughtAsset();
      })
      .then((boughtAsset) => {
        boughtOwnershipId = getOwnershipId(boughtAsset);
        boughtAssetId = getAssetId(boughtAsset);

        expect(boughtOwnershipId, 'Kupljena pozicija mora imati ownership id').to.exist;
        expect(boughtAssetId, 'Kupljena pozicija mora imati asset id').to.exist;

        function pollPublishableAsset(attempt = 0): Cypress.Chainable<any> {
          return cy.reload().then(() => {
            return fetchClientAssets(anaToken, anaClientId).then((assetsRes) => {
              expect(assetsRes.status).to.eq(200);

              const assets = pickArray(assetsRes.body);
              const sameAsset = assets.find(
                (asset: any) => String(getOwnershipId(asset)) === String(boughtOwnershipId)
              );

              expect(sameAsset, 'Kupljena pozicija mora i dalje postojati').to.exist;

              const publishable = getPublishableAmount(sameAsset);

              if (publishable >= 1) {
                return cy.wrap(sameAsset);
              }

              if (attempt >= 10) {
                throw new Error(
                  `Kupljena pozicija nije postala dostupna za publish. OwnershipId=${boughtOwnershipId}, publishable=${publishable}`
                );
              }

              return cy.wait(1500).then(() => pollPublishableAsset(attempt + 1));
            });
          });
        }

        return pollPublishableAsset();
      })
      .then((publishableAsset) => {
        const publishable = getPublishableAmount(publishableAsset);

        expect(
          publishable,
          'Mora postojati bar 1 dostupna akcija za publish'
        ).to.be.greaterThan(0);

        Cypress.log({
          name: 'publish-target',
          message: JSON.stringify({
            assetId: boughtAssetId,
            ownershipId: boughtOwnershipId,
            ticker: publishableAsset?.ticker,
            amount: publishableAsset?.amount,
            reservedAmount:
              publishableAsset?.reserved_amount ?? publishableAsset?.reservedAmount ?? 0,
          }),
        });

        function publishWithRetry(attempt = 0): Cypress.Chainable<any> {
          return publishClientAsset(
            anaToken,
            anaClientId,
            boughtOwnershipId as string | number,
            1
          ).then((publishRes) => {
            if ([200, 204].includes(publishRes.status)) {
              return cy.wrap(publishRes);
            }

            const msg = String(
              publishRes?.body?.message ??
              publishRes?.body?.error ??
              ''
            ).toLowerCase();

            const retriable =
              publishRes.status === 400 &&
              msg.includes('amount exceeds available');

            if (retriable && attempt < 8) {
              return cy.wait(1500).then(() => publishWithRetry(attempt + 1));
            }

            expect(
              [200, 204],
              `Publish nije uspeo: ${JSON.stringify(publishRes.body)}`
            ).to.include(publishRes.status);

            return cy.wrap(publishRes);
          });
        }

        return publishWithRetry();
      })
      .then((publishRes) => {
        expect(
          [200, 204],
          `Publish nije uspeo: ${JSON.stringify(publishRes.body)}`
        ).to.include(publishRes.status);

        const offerPayload = {
          asset_ownership_id: boughtOwnershipId,
          amount: 1,
          price_per_stock_rsd: Number(selectedStock?.price ?? 0),
          settlement_date: settlementDate,
          premium_rsd: 10,
          buyer_account_number: getAccountNumber(markoBuyerAccount),
        };

        return createOtcOffer(markoToken, offerPayload);
      })
      .then((offerRes) => {
        expect(
          [200, 201],
          `Kreiranje OTC ponude nije uspelo: ${JSON.stringify(offerRes.body)}`
        ).to.include(offerRes.status);

        createdOfferId = getOfferId(offerRes.body);
        expect(createdOfferId, 'Kreirana OTC ponuda mora imati id').to.exist;

        offerIdForRollback = createdOfferId;
        rejectTokenForRollback = markoToken;
        shouldRollbackOffer = true;

        return fetchActiveOffers(markoToken);
      })
      .then((markoOffersRes) => {
        expect(markoOffersRes.status).to.eq(200);

        const markoOffers = pickArray(markoOffersRes.body);
        const markoOffer = markoOffers.find((offer: any) => String(getOfferId(offer)) === String(createdOfferId));

        expect(markoOffer, 'Marko mora videti aktivnu OTC ponudu').to.exist;

        return fetchActiveOffers(anaToken);
      })
      .then((anaOffersRes) => {
        expect(anaOffersRes.status).to.eq(200);

        const anaOffers = pickArray(anaOffersRes.body);
        const anaOffer = anaOffers.find((offer: any) => String(getOfferId(offer)) === String(createdOfferId));

        expect(anaOffer, 'Ana mora videti istu aktivnu OTC ponudu').to.exist;

        return rejectOtcOffer(markoToken, createdOfferId as string | number, 'Odustajem od pregovora');
      })
      .then((rejectRes) => {
        expect(
          [200, 204],
          `Reject OTC ponude nije uspeo: ${JSON.stringify(rejectRes.body)}`
        ).to.include(rejectRes.status);

        shouldRollbackOffer = false;

        function pollOfferGone(token: string, who: string, attempt = 0): Cypress.Chainable<any> {
          return fetchActiveOffers(token).then((offersRes) => {
            expect(offersRes.status).to.eq(200);

            const offers = pickArray(offersRes.body);
            const stillThere = offers.find((offer: any) => String(getOfferId(offer)) === String(createdOfferId));

            if (!stillThere) {
              return cy.wrap(null);
            }

            if (attempt >= 8) {
              throw new Error(`OTC ponuda i dalje postoji kod ${who} nakon reject.`);
            }

            return cy.wait(1000).then(() => pollOfferGone(token, who, attempt + 1));
          });
        }

        return pollOfferGone(markoToken, 'Marka');
      })
      .then(() => {
        return fetchActiveOffers(anaToken).then((anaOffersRes) => {
          expect(anaOffersRes.status).to.eq(200);

          const anaOffers = pickArray(anaOffersRes.body);
          const anaOffer = anaOffers.find((offer: any) => String(getOfferId(offer)) === String(createdOfferId));

          expect(anaOffer, 'Ponuda ne sme više da postoji kod Ane').to.not.exist;
        });
      });
  });
});

export {};