describe('Scenario 1: Kreiranje tekuceg racuna za postojeceg klijenta', () => {
    it('kreira tekuci racun i proverava broj racuna', () => {
        cy.loginAsAdmin();
        const apiUrl = Cypress.env('API_URL');

        cy.intercept('GET', `**/clients*`, {
            statusCode: 200,
            body: {
                data: [
                    {
                        id: 501,
                        first_name: 'Test',
                        last_name: 'Klijent',
                        email: 'klijent@gmail.com',
                        jmbg: '0101990710006',
                    },
                ],
            },
        }).as('searchClient');

        cy.intercept('POST', '**/accounts', (req) => {
            req.reply({
                statusCode: 201,
                body: {
                    data: {
                        id: 9101,
                        account_number: '265444444444444411',
                        status: 'ACTIVE',
                    },
                    message: 'Racun je uspesno kreiran. Email obavestenje poslato.',
                },
            });
        }).as('createAccount');

        cy.visit('/accounts/new');

        cy.get('input[placeholder*="jmbg" i], input[placeholder*="email" i]', { timeout: 15000 })
            .first()
            .clear({ force: true })
            .type('klijent@gmail.com', { force: true });
        cy.contains('button', /pretra[zž]i/i).click();
        cy.wait('@searchClient').its('response.statusCode').should('eq', 200);

        cy.get('input[name="account_type"][value="tekuci"]').check({ force: true });
        cy.contains('label', /vrsta ra.una/i).parent().find('select').select('licni_standardni');
        cy.get('input[placeholder="0,00"], input[name="initial_balance"]').first().clear({ force: true }).type('15000', { force: true });
        cy.contains('label', /dnevni limit/i).parent().find('input').first().clear({ force: true }).type('50000', { force: true });
        cy.contains('label', /mese.ni limit/i).parent().find('input').first().clear({ force: true }).type('150000', { force: true });

        cy.contains('button[type="submit"]', /potvrdi kreiranje ra.una/i).click();

        cy.wait('@createAccount').then(({ response }) => {
            const num = String(response?.body?.data?.account_number ?? '').replace(/\D/g, '');
            expect(num).to.have.length(18);
        });

        cy.contains(/ra.un je uspe.no kreiran/i).should('be.visible');
    });
});
