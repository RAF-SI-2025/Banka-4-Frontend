describe('Scenario 31: Odblokiranje kartice od strane zaposlenog', () => {
    it('zaposleni pronalazi blokiranu karticu i odblokira je', () => {
        cy.loginAsAdmin();
        const apiUrl = Cypress.env('API_URL');

        cy.intercept('GET', `**/clients*`, {
            statusCode: 200,
            body: {
                data: [
                    { id: 101, first_name: 'Ana', last_name: 'Anic', email: 'ana.anic@example.com' },
                ],
            },
        }).as('getClients');

        cy.intercept('GET', '**/clients/101/accounts*', {
            statusCode: 200,
            body: {
                data: [
                    { account_number: '265-1234567890123-45', name: 'Tekuci RSD', account_type: 'PERSONAL' },
                ],
            },
        }).as('getAccounts');

        cy.intercept('GET', '**/clients/101/accounts/265-1234567890123-45/cards*', {
            statusCode: 200,
            body: {
                data: [
                    { id: 7001, card_number: '4000123412341234', status: 'BLOCKED' },
                ],
            },
        }).as('getCards');

        cy.intercept('PUT', '**/cards/7001/unblock', {
            statusCode: 200,
            body: { message: 'Kartica je aktivna. Klijent je obavesten email-om.' },
        }).as('unblockCard');

        cy.visit('/admin/cards');
        cy.wait('@getClients');
        cy.wait('@getAccounts');
        cy.wait('@getCards');

        cy.contains('tr', 'ana.anic@example.com').within(() => {
            cy.contains('button', /deblokiraj/i).click({ force: true });
        });

        cy.contains('h3', /deblokiraj karticu/i)
            .parent()
            .contains('button', /^Deblokiraj$/)
            .click({ force: true });
        cy.wait('@unblockCard').its('response.statusCode').should('eq', 200);
    });
});
