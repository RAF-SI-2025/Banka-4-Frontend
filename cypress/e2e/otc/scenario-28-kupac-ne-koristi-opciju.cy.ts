describe('Scenario 28: Kupac ne iskorišćava opciju - gubi samo premiju', () => {
  

  beforeEach(() => {
    cy.intercept('GET', `**/otc/contracts**`).as('getContracts');
    cy.loginAsClient();
    cy.visit('/otc');
  });

  it('analizira važeći ugovor koji je out-of-the-money', () => {
    // 1. Odlazak na Važeće ugovore
    cy.contains('button', /Sklopljeni ugovori/i).click({ force: true });
    cy.wait('@getContracts');
    cy.contains('button', /Važeći ugovori/i).click();

    // 2. Tražimo ugovor gde je Strike Price nepovoljan (Out-of-the-money)
    // Na tvojoj slici image_e3416f.jpg vidimo kolone: STRIKE PRICE i PROFIT
    cy.get('table tbody tr').each(($row) => {
      const profitText = $row.find('td').eq(6).text(); // Kolona PROFIT (image_e3416f.jpg)
      
      if (profitText.includes('0,00')) {
        cy.wrap($row).within(() => {
          cy.log('Pronađen ugovor bez profita (out-of-the-money)');
          
          // 3. Provera: Dugme "Iskoristi" postoji ali kupac odlučuje da ga ne klikne
          // (U automatizaciji samo potvrđujemo da profit nije ostvaren)
          cy.get('button').contains(/Iskoristi/i).should('be.visible');
        });
      }
    });
  });

  it('potvrđuje da istekli ugovori prikazuju samo osnovne podatke', () => {
    cy.contains('button', /Sklopljeni ugovori/i).click({ force: true });
    cy.contains('button', /Istekli ugovori/i).click();

    // 4. Provera u tabeli isteklih (image_e2dfd6.jpg)
    // Ovde ugovor dobija status "isteklog" samim tim što je u ovom tabu
    cy.get('table tbody tr').first().within(() => {
      // Proveravamo kolonu Premium (image_e2dfd6.jpg)
      // To je iznos koji je kupac izgubio
      cy.get('td').eq(3).then(($premium) => {
        const premiumValue = $premium.text().trim();
        cy.log('Plaćena premija koja je izgubljena: ' + premiumValue);
        expect(premiumValue).to.not.be.empty;
      });

      // 5. Potvrda: Nema dugmeta za akciju, ugovor je samo evidencija
      cy.get('button').should('not.exist');
    });
  });

it('potvrđuje da je kupac izgubio samo premiju na isteklom ugovoru', () => {
  // 1. Idemo na tab Istekli ugovori
  cy.contains('button', /Sklopljeni ugovori/i).click({ force: true });
  cy.contains('button', /Istekli ugovori/i).click();

  // 2. Uzimamo prvi red iz tabele (onaj sa slike image_e2d14b.jpg)
  cy.get('table tbody tr').first().within(() => {
    // Proveravamo da je Profit 0,00 RSD (znači nije bilo zarade)
    cy.get('td').contains('0,00 RSD').should('be.visible');

    // Proveravamo kolonu Premium (to je 4. kolona, indeks 3)
    cy.get('td').eq(3).invoke('text').then((premiumText) => {
      const premiumValue = parseFloat(premiumText.replace(',', '.'));
      // Potvrđujemo da je plaćena premija (gubitak) veća od nule
      expect(premiumValue).to.be.greaterThan(0);
      cy.log('Kupac je izgubio samo plaćenu premiju: ' + premiumText);
    });
  });
});
});