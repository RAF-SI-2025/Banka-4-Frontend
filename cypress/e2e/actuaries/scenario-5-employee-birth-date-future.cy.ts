/// <reference types="cypress" />

import { fillInputByLabel, fillDateByLabel, selectByLabel } from '../../support/formByLable';
import { apiUrl } from './helpers';

function fillValidEmployeeForm(dateOfBirth: string) {
    const ts = Date.now();

    fillInputByLabel('Ime', 'E2E');
    fillInputByLabel('Prezime', 'Employee');
    fillInputByLabel('Email adresa', `e2e_future_birth_${ts}@raf.rs`);
    fillInputByLabel('Broj telefona', '+381601234567');
    fillInputByLabel('Adresa', 'Bulevar Kralja Aleksandra 1');
    fillDateByLabel('Datum rođenja', dateOfBirth);
    selectByLabel('Pol', 'F');

    fillInputByLabel('ID Pozicije', '1');
    fillInputByLabel('Departman', 'IT');

    cy.contains('label', 'employee.view')
        .find('input[type="checkbox"]')
        .check({ force: true });

    fillInputByLabel('Username', `e2efuture${ts}`);
}

describe('Scenario 5: Datum rođenja je u budućnosti', () => {
    beforeEach(() => {
        cy.loginAsAdmin();

        cy.intercept('POST', `${apiUrl()}/employees/register`, (req) => {
            req.reply({ statusCode: 422, body: { error: 'intercepted by test' } });
        }).as('registerEmployee');

        cy.visit('/employees/new');
    });

    it('sistem odbija kreiranje i prikazuje poruku da datum rođenja ne sme biti u budućnosti', () => {
        fillValidEmployeeForm('2030-01-01');

        cy.contains('button[type="submit"]', 'Kreiraj zaposlenog').click();

        cy.contains(/datum rođenja ne sme biti u budućnosti/i)
            .should('be.visible');

        cy.get('@registerEmployee.all').should('have.length', 0);

        cy.url().should('include', '/employees/new');
    });
});
