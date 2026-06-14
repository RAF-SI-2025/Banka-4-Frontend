import { pickArray, getDirectApiUrl, extractOrderId } from '../../support/helpers';

function loginAsSupervisor() {
  const apiUrl = Cypress.env('API_URL');
  if (!apiUrl) throw new Error('Missing Cypress env API_URL');

  cy.request('POST', `${getDirectApiUrl(8080)}/auth/login`, {
    email: 'admin@raf.rs',
    password: 'admin123',
  }).then((res) => {
    expect(res.status).to.eq(200);

    const { user, token, refresh_token } = res.body;

    cy.visit('/securities', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token);
        if (refresh_token) win.localStorage.setItem('refreshToken', refresh_token);
        else win.localStorage.removeItem('refreshToken');
        win.localStorage.setItem('user', JSON.stringify(user));
      },
    });
  });
}

function selectFirstRealAccountOption() {
  cy.contains(/^RAČUN ZA KUPOVINU$/i)
    .parent()
    .find('select')
    .should('not.be.disabled');

  cy.wait(500);

  cy.contains(/^RAČUN ZA KUPOVINU$/i)
    .parent()
    .find('select option')
    .then(($options) => {
      const real = [...$options].find((o) => {
        const opt = o as HTMLOptionElement;
        const text = (opt.textContent || '').trim();
        return opt.value && text !== 'Učitavanje...' && text !== 'Izaberite račun...';
      });

      expect(real, 'Mora postojati bar jedan stvarni račun u dropdown-u.').to.exist;

      cy.contains(/^RAČUN ZA KUPOVINU$/i)
        .parent()
        .find('select')
        .select((real as HTMLOptionElement).value, { force: true })
        .blur();
    });
}

describe('Scenario 40: Supervizor kupuje hartiju za investicioni fond', () => {
  let supervisorToken: string | null = null;
  let createdOrderId: string | null = null;

  beforeEach(() => {
    supervisorToken = null;
    createdOrderId = null;

    loginAsSupervisor();

    cy.window().then((win) => {
      supervisorToken = win.localStorage.getItem('token');
    });

    cy.intercept('GET', '**/api/listings/stocks*').as('getStocks');
    cy.intercept('GET', '**/api/accounts*').as('getAccounts');
    cy.intercept('GET', '**/api/actuary/*/assets/funds*').as('getManagedFunds');
    cy.intercept('POST', '**/api/orders/invest').as('createFundOrder');
  });

  afterEach(() => {
    if (!supervisorToken || !createdOrderId) return;

    cy.request({
      method: 'PATCH',
      url: `${getDirectApiUrl(8082)}/orders/${createdOrderId}/cancel`,
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: {},
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 204], `Rollback cancel ordera nije uspeo. Response: ${JSON.stringify(res.body)}`).to.include(res.status);
    });
  });

  it('kreira BUY order za fond i šalje ga preko /orders/invest', () => {
    cy.wait('@getStocks').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);

      const stocks = pickArray(response?.body);
      expect(stocks.length).to.be.greaterThan(0);

      const cheapest = [...stocks]
        .filter((s: any) => Number(s?.price) > 0)
        .sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];

      expect(cheapest).to.exist;
      cy.wrap(cheapest).as('targetStock');
    });

    cy.get('@targetStock').then((stock: any) => {
      cy.contains('td', stock.ticker)
        .closest('tr')
        .within(() => {
          cy.contains(/kreiraj nalog/i).click();
        });
    });

    cy.contains(/^KUPUJEM ZA INVESTICIONI FOND$/i).click();

    cy.wait('@getAccounts').its('response.statusCode').should('eq', 200);
    cy.wait('@getManagedFunds').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);

      const funds = pickArray(response?.body);
      expect(funds.length).to.be.greaterThan(0);

      cy.get('@targetStock').then((stock: any) => {
        const stockPrice = Number(stock.price ?? 0);

        const fund = funds.find((f: any) => {
          const liquidity = Number(
            f.liquid_assets ??
            f.available_liquidity_rsd ??
            f.liquidity_rsd ??
            0
          );
          return liquidity >= stockPrice;
        });

        expect(fund, 'Potreban je fond sa dovoljno likvidnosti za 1 komad izabrane hartije.').to.exist;
        cy.wrap(fund).as('targetFund');
      });
    });

    selectFirstRealAccountOption();

    cy.contains(/^INVESTICIONI FOND$/i)
      .parent()
      .find('select')
      .should('not.be.disabled');

    cy.wait(500);

    cy.get('@targetFund').then((fund: any) => {
      const fundId = String(fund.fund_id ?? fund.id);

      cy.contains(/^INVESTICIONI FOND$/i)
        .parent()
        .find('select')
        .select(fundId, { force: true })
        .blur();
    });

    cy.get('input[placeholder="Unesite količinu..."]').clear().type('1');

    cy.contains('button', /^Nastavi$/i)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    cy.contains('button', /^Potvrdi$/i)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    cy.wait('@createFundOrder').then(({ request, response }) => {
      expect([200, 201]).to.include(response?.statusCode);
      expect(request.body.direction).to.eq('BUY');
      expect(request.body.quantity).to.eq(1);
      expect(request.body.fund_id).to.exist;
      expect(request.body.listing_id).to.exist;

      createdOrderId = extractOrderId(response?.body);
    });
  });
});