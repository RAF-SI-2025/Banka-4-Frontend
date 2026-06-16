describe('Scenario 4: Kreiranje poslovnog racuna za firmu', () => {
    it('kreira poslovni racun i vezuje ga za firmu', () => {
        cy.loginAsAdmin();
        const apiUrl = Cypress.env('API_URL');

        cy.intercept('GET', `**/clients*`, {
            statusCode: 200,
            body: { data: [{ id: 501, first_name: 'Test', last_name: 'Klijent', email: 'klijent@gmail.com' }] },
        }).as('searchClient');

        cy.intercept('GET', '**/api/companies/work-codes*', {
            statusCode: 200,
            body: [{ id: 1, code: '6201', description: 'Programiranje' }],
        }).as('workCodes');

        cy.intercept('POST', '**/api/companies', {
            statusCode: 201,
            body: { id: 3001, name: 'Test Firma DOO' },
        }).as('createCompany');

        cy.intercept('POST', '**/api/accounts', {
            statusCode: 201,
            body: {
                data: { id: 9104, account_number: '265777777777777744', status: 'ACTIVE', account_type: 'Business' },
            },
        }).as('createAccount');


        cy.intercept('POST', '**/auth/refresh*', {
            statusCode: 200,
            body: { token: 'fake-access', refresh_token: 'fake-refresh' },
        }).as('refresh');


        // cy.intercept('POST', '**/accounts', {
        //     statusCode: 201,
        //     body: {
        //         data: {
        //             id: 9104,
        //             account_number: '265777777777777744',
        //             status: 'ACTIVE',
        //             account_type: 'Business',
        //         },
        //     },
        // }).as('createAccount');

        cy.visit('/accounts/new');

        cy.get('input[placeholder*="jmbg" i], input[placeholder*="email" i]', { timeout: 15000 })
            .first()
            .clear({ force: true })
            .type('klijent@gmail.com', { force: true });
        cy.contains('button', /pretra[zž]i/i).click();
        cy.wait('@searchClient');

        cy.get('input[name="account_type"][value="tekuci"]').check({ force: true });
        cy.contains('label', /vrsta ra.una/i).parent().find('select').select('poslovni_doo');
        cy.wait('@workCodes');

        cy.contains('label', /naziv firme/i).parent().find('input').type('Test Firma DOO', { force: true });
        cy.contains('label', /mati.ni broj/i).parent().find('input').type('12345678', { force: true });
        cy.contains('label', /^PIB/i).parent().find('input').type('123456789', { force: true });
        cy.contains('label', /ifra delatnosti/i).parent().find('select').select('1');
        cy.contains('label', /^Adresa/i).parent().find('input').type('Knez Mihailova 1', { force: true });

        cy.contains('label', /dnevni limit/i).parent().find('input').first().clear({ force: true }).type('100000', { force: true });
        cy.contains('label', /mese.ni limit/i).parent().find('input').first().clear({ force: true }).type('400000', { force: true });

        cy.contains('button[type="submit"]', /potvrdi kreiranje ra.una/i).click();

        cy.wait('@createCompany', { timeout: 15000 }).its('response.statusCode').should('eq', 201);
        cy.wait('@createAccount').then(({ response }) => {
            expect(response?.body?.data?.status).to.eq('ACTIVE');
        });
    });
});
