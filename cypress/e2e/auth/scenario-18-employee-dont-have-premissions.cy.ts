import { fillInputByLabel, fillDateByLabel, selectByLabel } from '../../support/formByLable';

describe('Scenario 18: Verifikacija praznih permisija za novog korisnika', () => {

    it('Kreira korisnika i ulazi u njegove detalje iz tabele', () => {
        cy.loginAsAdmin();
        const apiUrl = Cypress.env('API_URL') as string;

        const employeeId = 99018;

        cy.intercept('POST', `**/employees/register`, (req) => {
            expect(req.body.permissions).to.deep.equal([]);
            req.reply({
                statusCode: 201,
                body: {
                    data: {
                        id: employeeId,
                        ...req.body,
                    },
                },
            });
        }).as('registerEmployee');

        cy.intercept('GET', `**/employees*`, {
            statusCode: 200,
            body: {
                data: [],
                total_pages: 1,
                page: 1,
                page_size: 20,
            },
        }).as('employeesList');

        cy.intercept('GET', `**/employees/*`, {
            statusCode: 200,
            body: {
                id: employeeId,
                first_name: 'Novi',
                last_name: 'Zaposleni',
                email: 'novi.zaposleni@raf.rs',
                phone_number: '+381601234567',
                address: 'Bulevar Kralja Aleksandra 1',
                date_of_birth: '1990-01-01',
                gender: 'M',
                active: true,
                position_id: 1,
                department: 'IT',
                permissions: [],
            },
        }).as('employeeDetails');

        cy.visit('/employees/new');

        const ts = Date.now();
        const email = `nema_permisija_${ts}@raf.rs`;
        const ime = 'Novi';
        const prezime = 'Zaposleni';

        fillInputByLabel('Ime', ime);
        fillInputByLabel('Prezime', prezime);
        fillInputByLabel('Email adresa', email);
        fillInputByLabel('Broj telefona', '+381601234567');
        fillInputByLabel('Adresa', 'Bulevar Kralja Aleksandra 1');
        fillDateByLabel('Datum rođenja', '1990-01-01');
        selectByLabel('Pol', 'M');
        fillInputByLabel('ID Pozicije', '1');
        fillInputByLabel('Departman', 'IT');
        fillInputByLabel('Username', `user${ts}`);

        cy.contains('button[type="submit"]', 'Kreiraj zaposlenog').click();

        cy.wait('@registerEmployee').its('response.statusCode').should('eq', 201);
        cy.wait('@employeesList');

        cy.visit(`/employees/${employeeId}`);
        cy.wait('@employeeDetails').its('response.statusCode').should('eq', 200);

        cy.location('pathname').should('eq', `/employees/${employeeId}`);
        cy.contains(/nema dodeljenih permisija/i).should('be.visible');

    });
});