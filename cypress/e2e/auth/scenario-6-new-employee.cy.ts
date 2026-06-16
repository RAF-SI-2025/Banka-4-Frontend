import { fillInputByLabel, fillDateByLabel, selectByLabel,} from '../../support/formByLable';


describe('Feature: Kreiranje i aktivacija zaposlenog', () => {
    it('Scenario 6: Admin kreira novog zaposlenog', () => {
        cy.loginAsAdmin();
        const apiUrl = Cypress.env('API_URL') as string;

        cy.intercept('POST', `**/employees/register`, (req) => {
            req.reply({
                statusCode: 201,
                body: {
                    data: {
                        id: 99006,
                        ...req.body,
                    },
                    message: 'Employee created successfully',
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
        const email = `e2e_emp_${ts}@raf.rs`;

        fillInputByLabel('Ime', 'E2E');
        fillInputByLabel('Prezime', 'Employee');
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

            expect(request.body).to.include({
                active: true,
                address: 'Bulevar Kralja Aleksandra 1',
                department: 'IT',
                email,
                first_name: 'E2E',
                gender: 'F',
                last_name: 'Employee',
                phone_number: '+381601234567',
                position_id: 1,
                username: `e2e${ts}`,
            });

            expect(request.body.date_of_birth).to.eq('1999-01-01T00:00:00Z');
            expect(request.body.permissions).to.deep.equal(['employee.view']);
        });

        cy.wait('@employeesList');
        cy.url().should('include', '/employees');
    });
});