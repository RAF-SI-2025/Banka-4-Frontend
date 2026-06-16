describe('Scenario 39: Admin pretrazuje klijenta', () => {
    it('filtrira listu klijenata po imenu ili email-u', () => {
        cy.loginAsAdmin();
        const apiUrl = Cypress.env('API_URL');

        cy.intercept('GET', `**/clients*`, {
            statusCode: 200,
            body: {
                data: [
                    { id: 101, first_name: 'Ana', last_name: 'Anic', email: 'ana.anic@example.com', city: 'Beograd' },
                    { id: 102, first_name: 'Marko', last_name: 'Markovic', email: 'marko@example.com', city: 'Novi Sad' },
                ],
                }
        }).as('getClients');

        cy.visit('/admin/clients');
        cy.wait('@getClients');

        cy.get('input[placeholder*="Pretra"]').type('Ana');
        cy.contains('td', 'Ana').should('be.visible');
        cy.contains('td', 'Anic').should('be.visible');
        cy.contains('td', 'Marko').should('not.exist');
    });
});
