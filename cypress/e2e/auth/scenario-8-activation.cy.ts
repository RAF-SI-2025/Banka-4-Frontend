import { fillInputByLabel, fillDateByLabel, selectByLabel } from '../../support/formByLable';
import { fillLoginForm, submitLogin, visitEmployeeLogin } from '../../support/authHelpers';

describe('Feature 1 - Autentifikacija korisnika', () => {
    it('Scenario 8: Zaposleni aktivira nalog putem email linka', () => {
        cy.loginAsAdmin();
        const apiUrl = Cypress.env('API_URL') as string;

        const activationToken = `e2e-activation-token-${Date.now()}`;

        cy.intercept('POST', `**/employees/register`, (req) => {
            req.reply({
                statusCode: 201,
                body: {
                    data: {
                        id: 99008,
                        activation_token: activationToken,
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

        cy.visit('/employees/new');

        const ts = Date.now();
        const email = `e2e_act_${ts}@raf.rs`;

        fillInputByLabel('Ime', 'E2E');
        fillInputByLabel('Prezime', 'Activation');
        fillInputByLabel('Email adresa', email);
        fillInputByLabel('Broj telefona', '+381601234567');
        fillInputByLabel('Adresa', 'Bulevar Kralja Aleksandra 1');
        fillDateByLabel('Datum rođenja', '1999-01-01');
        selectByLabel('Pol', 'F');
        fillInputByLabel('ID Pozicije', '1');
        fillInputByLabel('Departman', 'IT');

        cy.contains('label', 'employee.view')
            .find('input[type="checkbox"]')
            .check({ force: true });

        fillInputByLabel('Username', `e2e${ts}`);

        cy.contains('button[type="submit"]', 'Kreiraj zaposlenog').click();

        cy.wait('@registerEmployee').then(({ request, response }) => {
            expect(response?.statusCode).to.eq(201);
            expect(request.body.email).to.eq(email);
        });

        cy.wait('@employeesList');
        cy.url().should('include', '/employees');

        // Simulacija klika na link iz emaila.
        cy.visit(`/activate?token=${activationToken}`);

        const newPassword = 'TestPass12';

        cy.intercept('POST', `**/auth/activate`, (req) => {
            expect(req.body).to.deep.equal({ token: activationToken, password: newPassword });
            req.reply({
                statusCode: 200,
                body: { message: 'Account activated' },
            });
        }).as('activate');

        cy.get('#password').clear().type(newPassword);
        cy.get('#confirm').clear().type(newPassword);

        cy.contains('button', 'Aktiviraj nalog').click();

        cy.wait('@activate').its('response.statusCode').should('eq', 200);

        cy.contains('Nalog je aktiviran').should('be.visible');

        cy.contains('Idi na prijavu').click();
        cy.url().should('include', '/login');

        cy.intercept('POST', `**/auth/login`, (req) => {
            expect(req.body).to.deep.equal({ email, password: newPassword });
            req.reply({
                statusCode: 200,
                body: {
                    user: {
                        id: 99008,
                        email,
                        identity_type: 'employee',
                        first_name: 'E2E',
                        last_name: 'Activation',
                        permissions: ['employee.view'],
                    },
                    token: 'employee-access-token',
                    refresh_token: 'employee-refresh-token',
                },
            });
        }).as('newLogin');

        visitEmployeeLogin();
        fillLoginForm(email, newPassword);
        submitLogin();

        cy.wait('@newLogin').its('response.statusCode').should('eq', 200);
    });
});
