describe('Scenario 40: Admin menja podatke klijenta', () => {
    it('otvara formu i cuva izmene klijenta', () => {
        cy.loginAsAdmin();
        const apiUrl = Cypress.env('API_URL');

        cy.intercept('GET', `**/clients*`, {
            statusCode: 200,
            body: {
                data: [
                    {
                        id: 101,
                        first_name: 'Ana',
                        last_name: 'Anic',
                        email: 'ana.anic@example.com',
                        phone_number: '+381601111111',
                        city: 'Beograd',
                        address: 'Glavna 1',
                        postal_code: '11000',
                        country: 'Srbija',
                    },
                ],
            },
        }).as('getClients');

        cy.intercept('PUT', '**/clients/*', {
            statusCode: 200,
            body: {
                message: 'Podaci klijenta su uspesno izmenjeni.',
                data: { id: 101, address: 'Bulevar 10' },
            },
        }).as('updateClient');

        cy.intercept('PATCH', '**/clients/*', {
            statusCode: 200,
            body: {
                message: 'Podaci klijenta su uspesno izmenjeni.',
                data: { id: 101, address: 'Bulevar 10' },
            },
        });

        cy.visit('/admin/clients');
        cy.wait('@getClients');

        cy.get('tbody tr').first().click({ force: true });

        cy.contains('label', /^Adresa$/i).parent().find('input').clear().type('Bulevar 10');
        cy.contains('button', /sa.uvaj izmene/i).click({ force: true });

        cy.wait('@updateClient').its('response.statusCode').should('eq', 200);
        cy.contains(/sacuvani|uspesno|uspe.no/i).should('be.visible');
    });
});
