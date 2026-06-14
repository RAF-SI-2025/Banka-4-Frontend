/// <reference types="cypress" />

import { fillInputByLabel, selectByLabel } from '../../support/formByLable';
import { apiUrl } from './helpers';

function fillEmployeeFormExceptBirthDate() {
    const ts = Date.now();

    fillInputByLabel('Ime', 'E2E');
    fillInputByLabel('Prezime', 'Employee');
    fillInputByLabel('Email adresa', `e2e_invalid_birth_format_${ts}@raf.rs`);
    fillInputByLabel('Broj telefona', '+381601234567');
    fillInputByLabel('Adresa', 'Bulevar Kralja Aleksandra 1');

    // Namerno ne popunjavamo datum validnom vrednošću.
    // input[type="date"] ne dozvoljava unos formata "1990/03/15" kroz realan UI.

    selectByLabel('Pol', 'F');

    fillInputByLabel('ID Pozicije', '1');
    fillInputByLabel('Departman', 'IT');

    cy.contains('label', 'employee.view')
        .find('input[type="checkbox"]')
        .check({ force: true });

    fillInputByLabel('Username', `e2einvaliddate${ts}`);
}

describe('Scenario 6: Datum rođenja nije u ispravnom formatu', () => {
    beforeEach(() => {
        cy.loginAsAdmin();

        cy.intercept('POST', `${apiUrl()}/employees/register`, (req) => {
            req.reply({ statusCode: 422, body: { error: 'intercepted by test' } });
        }).as('registerEmployee');

        cy.visit('/employees/new');
    });

    it('sistem ne dozvoljava kreiranje kada datum rođenja nije unet kao validan datum', () => {
        fillEmployeeFormExceptBirthDate();

        cy.contains('button[type="submit"]', 'Kreiraj zaposlenog').click();

        cy.contains(/obavezno|datum rođenja/i)
            .should('be.visible');

        cy.get('@registerEmployee.all').should('have.length', 0);

        cy.url().should('include', '/employees/new');
    });
});
