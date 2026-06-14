import { getDirectApiUrl } from '../../support/helpers';

function getFundId(body: any) {
  return body?.fund_id ?? body?.id ?? body?.data?.fund_id ?? body?.data?.id ?? null;
}

describe('Scenario 38: Supervizor uspešno kreira novi investicioni fond', () => {
  let adminToken = '';
  let createdFundId: number | null = null;

  before(() => {
    cy.request('POST', `${getDirectApiUrl(8080)}/auth/login`, {
      email: 'admin@raf.rs',
      password: 'admin123',
    }).then((res) => {
      expect(res.status).to.eq(200);
      adminToken = res.body.token;
      expect(adminToken, 'Admin token mora postojati').to.exist;
    });
  });

  beforeEach(() => {
    createdFundId = null;

    cy.intercept('POST', '**/api/investment-funds').as('createFund');

    cy.loginAsAdmin();
    cy.visit('/investment-funds/new');
  });

  afterEach(() => {
    if (!createdFundId) return;

    cy.request({
      method: 'DELETE',
      url: `${getDirectApiUrl(8082)}/investment-funds/${createdFundId}`,
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(
        [200, 204],
        `Cleanup delete fonda nije uspeo za id=${createdFundId}. Response: ${JSON.stringify(res.body)}`
      ).to.include(res.status);
    });
  });

  it('kreira fond i fond postaje vidljiv na discovery stranici', () => {
    const uniqueName = `Cypress Fund ${Date.now()}`;

    cy.url().should('include', '/investment-funds/new');
    cy.contains('Kreiranje investicionog fonda').should('be.visible');

    cy.get('input[placeholder="npr. Globalni rast"]').should('be.visible').clear().type(uniqueName);
    cy.get('textarea[placeholder*="Kratki opis"]').should('be.visible').clear().type('Fond kreiran kroz Cypress test.');
    cy.get('input[placeholder="npr. 10000"]').should('be.visible').clear().type('1000');

    cy.contains('button', 'Kreiraj fond').click();

    cy.wait('@createFund').then(({ response }) => {
      expect([200, 201]).to.include(response?.statusCode);

      createdFundId = getFundId(response?.body);
      expect(createdFundId, 'Kreirani fond mora imati id za cleanup').to.exist;
    });

    cy.url().should('include', '/investment-funds');
    cy.contains('Fond "', { matchCase: false }).should('be.visible');
    cy.contains(uniqueName).should('be.visible');
  });
});

export {};
