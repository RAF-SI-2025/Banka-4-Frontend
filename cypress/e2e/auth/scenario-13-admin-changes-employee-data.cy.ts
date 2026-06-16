describe('Scenario 13: Admin menja podatke zaposlenog', () => {
    beforeEach(() => {
        cy.loginAsAdmin();
    });

    it('otvara zaposlenog Petar iz tabele, menja ime u "Milenko" i vraća se na listu', () => {
        const employeeId = 2;
        const apiUrl = Cypress.env('API_URL') as string;
        const updatedEmployee = {
            id: employeeId,
            first_name: 'Milenko',
            last_name: 'Petrović',
            email: 'petar@raf.rs',
            phone_number: '0641234567',
            address: 'Bulevar 1',
            date_of_birth: '1990-01-01',
            gender: 'M',
            active: true,
            position_id: 1,
            department: 'HR',
            permissions: ['employee.view'],
        };
        let isUpdated = false;

        cy.intercept('POST', `**/auth/refresh*`, {
            statusCode: 200,
            body: { token: 'fake-access', refresh_token: 'fake-refresh' },
        }).as('refresh');

        cy.intercept('GET', `**/employees*`, (req) => {
            req.reply({
                statusCode: 200,
                body: {
                    data: [
                        {
                            id: employeeId,
                            first_name: isUpdated ? updatedEmployee.first_name : 'Petar',
                            last_name: 'Petrović',
                            email: 'petar@raf.rs',
                            position_id: 1,
                            department: isUpdated ? updatedEmployee.department : 'IT',
                            active: true,
                        },
                    ],
                    total_pages: 1,
                    page: 1,
                    page_size: 20,
                },
            });
        }).as('getEmployees');

        cy.intercept('GET', `**/employees/*`, (req) => {
            req.reply({
                statusCode: 200,
                body: isUpdated
                    ? updatedEmployee
                    : {
                        id: employeeId,
                        first_name: 'Petar',
                        last_name: 'Petrović',
                        email: 'petar@raf.rs',
                        phone_number: '060111222',
                        address: 'Bulevar 1',
                        date_of_birth: '1990-01-01',
                        gender: 'M',
                        active: true,
                        position_id: 1,
                        department: 'IT',
                        permissions: ['employee.view'],
                    },
            });
        }).as('getEmployee');

        cy.intercept('PATCH', `**/employees/*`, (req) => {
            expect(req.body).to.include({
                first_name: updatedEmployee.first_name,
                phone_number: updatedEmployee.phone_number,
                department: updatedEmployee.department,
            });
            isUpdated = true;
            req.reply({
                statusCode: 200,
                body: {
                    message: 'Employee updated',
                    data: updatedEmployee,
                },
            });
        }).as('updateEmployee');

        cy.visit('/employees');

        cy.wait('@getEmployees', { timeout: 20000 }).its('response.statusCode').should('eq', 200);

        cy.get('table', { timeout: 20000 }).should('be.visible');
        cy.get('table')
            .contains('td', 'Petar')
            .should('be.visible')
            .parent('tr')
            .click({ force: true });

        cy.location('pathname', { timeout: 20000 }).should('eq', `/employees/${employeeId}`);
        cy.wait('@getEmployee', { timeout: 20000 });

        cy.contains('button', 'Izmeni', { timeout: 20000 }).click();

        const newFirstName = 'Milenko';
        const newPhone = '0641234567';
        const newDepartment = 'HR';

        cy.contains('label', 'Ime').parent().find('input').clear().type(newFirstName);
        cy.contains('label', 'Telefon').parent().find('input').clear().type(newPhone);
        cy.contains('label', 'Departman').parent().find('input').clear().type(newDepartment);

        cy.contains('button[type="submit"]', 'Sačuvaj izmene').click();

        cy.wait('@updateEmployee', { timeout: 20000 })
            .its('response.statusCode')
            .should('be.oneOf', [200, 204]);

        cy.contains('a', 'Zaposleni', { timeout: 20000 }).click();

        cy.location('pathname', { timeout: 20000 }).should('eq', '/employees');

        cy.wait('@getEmployees', { timeout: 20000 }).its('response.statusCode').should('eq', 200);

        cy.get('table', { timeout: 20000 }).should('be.visible');
        cy.get('table').contains('td', newFirstName).should('be.visible');
        cy.get('table').contains('td', newDepartment).should('be.visible');
    });
});