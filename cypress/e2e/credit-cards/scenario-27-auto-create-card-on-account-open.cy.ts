describe('Scenario 27: Automatsko kreiranje kartice pri otvaranju racuna', () => {
    it('zaposleni kreira racun sa opcijom "Napravi karticu" i sistem vraca broj kartice i CVV', () => {
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
                        id: 9001,
                        account_number: '265-4444444444444-11',
                        card: {
                            id: 7001,
                            type: 'Debitna',
                            card_number: '4000123412341234',
                            cvv: '742',
                        },
                    },
                    message: 'Racun i kartica su uspesno kreirani.',
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
        cy.contains(/klijent prona.{0,2}en u sistemu/i).should('be.visible');

        cy.get('input[name="account_type"][value="tekuci"]').check({ force: true });
        cy.contains('label', /vrsta ra.una/i)
            .parent()
            .find('select')
            .select('licni_standardni');
        cy.contains('label', /dnevni limit/i)
            .parent()
            .find('input')
            .first()
            .clear({ force: true })
            .type('50000', { force: true });
        cy.contains('label', /mese.ni limit/i)
            .parent()
            .find('input')
            .first()
            .clear({ force: true })
            .type('150000', { force: true });

        cy.contains('label', 'Napravi karticu')
            .find('input[type="checkbox"]')
            .check({ force: true })
            .should('be.checked');

        cy.contains('button[type="submit"]', /potvrdi kreiranje ra.una/i).click();

        cy.wait('@createAccount').then(({ request, response }) => {
            expect(response?.statusCode).to.eq(201);

            expect(request.body).to.include({
                create_card: true,
                generate_card: true,
            });

            const card = response?.body?.data?.card;
            expect(card, 'card in response').to.exist;
            expect(card.type).to.match(/debit/i);
            expect(card.card_number).to.match(/^(?!([0-9])\1+$)\d{16,19}$/);
            expect(card.cvv).to.match(/^\d{3,4}$/);
        });

        cy.contains(/ra.un je uspe.no kreiran/i).should('be.visible');
    });
});