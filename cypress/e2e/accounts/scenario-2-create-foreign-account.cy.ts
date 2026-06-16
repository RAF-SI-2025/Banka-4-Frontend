describe('Scenario 2: Kreiranje deviznog racuna za klijenta', () => {
    it('kreira devizni racun u EUR sa pocetnim stanjem 0', () => {
        cy.loginAsAdmin();
        const apiUrl = Cypress.env('API_URL');

        cy.intercept('GET', `**/clients*`, {
            statusCode: 200,
            body: { data: [{ id: 501, first_name: 'Test', last_name: 'Klijent', email: 'klijent@gmail.com' }] },
        }).as('searchClient');

        cy.intercept('POST', '**/accounts', (req) => {
            req.reply({
                statusCode: 201,
                body: {
                    data: {
                        id: 9102,
                        account_number: '265555555555555522',
                        currency: 'EUR',
                        balance: 0,
                    },
                    message: 'Devizni racun je uspesno kreiran. Email obavestenje poslato.',
                },
            });
        }).as('createAccount');

        cy.visit('/accounts/new');

        cy.get('input[placeholder*="jmbg" i], input[placeholder*="email" i]', { timeout: 15000 })
            .first()
            .clear({ force: true })
            .type('klijent@gmail.com', { force: true });
        cy.contains('button', /pretra[zž]i/i).click();
        cy.wait('@searchClient');

        cy.get('input[name="account_type"][value="devizni"]').check({ force: true });
        cy.contains('button', /^EUR$/).click({ force: true });
        cy.contains('label', /vrsta ra.una/i).parent().find('select').select('licni_standardni');
        cy.get('input[placeholder="0,00"], input[name="initial_balance"]').first().clear({ force: true }).type('0', { force: true });
        cy.contains('label', /dnevni limit/i).parent().find('input').first().clear({ force: true }).type('5000', { force: true });
        cy.contains('label', /mese.ni limit/i).parent().find('input').first().clear({ force: true }).type('20000', { force: true });

        cy.contains('button[type="submit"]', /potvrdi kreiranje ra.una/i).click();

        cy.wait('@createAccount').then(({ request, response }) => {
            expect(request.body.initial_balance).to.eq(0);
            expect(request.body.currency_code).to.eq('EUR');
            expect(response?.body?.data?.balance).to.eq(0);
        });
    });
});
