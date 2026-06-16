describe('Scenario 3: Kreiranje racuna sa automatskim kreiranjem kartice', () => {
    it('kreira racun i automatski debitnu karticu', () => {
        cy.loginAsAdmin();
        const apiUrl = Cypress.env('API_URL');

        cy.intercept('GET', `**/clients*`, {
            statusCode: 200,
            body: { data: [{ id: 501, first_name: 'Test', last_name: 'Klijent', email: 'klijent@gmail.com' }] },
        }).as('searchClient');

        cy.intercept('POST', '**/accounts', {
            statusCode: 201,
            body: {
                data: {
                    id: 9103,
                    account_number: '265666666666666633',
                    card: {
                        id: 7301,
                        type: 'Debitna',
                        card_number: '4000123412345678',
                        cvv: '431',
                    },
                },
            },
        }).as('createAccount');

        cy.visit('/accounts/new');

        cy.get('input[placeholder*="jmbg" i], input[placeholder*="email" i]', { timeout: 15000 })
            .first()
            .clear({ force: true })
            .type('klijent@gmail.com', { force: true });
        cy.contains('button', /pretra[zž]i/i).click();
        cy.wait('@searchClient');

        cy.get('input[name="account_type"][value="tekuci"]').check({ force: true });
        cy.contains('label', /vrsta ra.una/i).parent().find('select').select('licni_standardni');
        cy.contains('label', /dnevni limit/i).parent().find('input').first().clear({ force: true }).type('50000', { force: true });
        cy.contains('label', /mese.ni limit/i).parent().find('input').first().clear({ force: true }).type('150000', { force: true });
        cy.contains('label', 'Napravi karticu').find('input[type="checkbox"]').check({ force: true }).should('be.checked');

        cy.contains('button[type="submit"]', /potvrdi kreiranje ra.una/i).click();

        cy.wait('@createAccount').then(({ request, response }) => {
            expect(request.body).to.include({ create_card: true, generate_card: true });
            expect(response?.body?.data?.card?.type).to.match(/debit/i);
        });
    });
});
