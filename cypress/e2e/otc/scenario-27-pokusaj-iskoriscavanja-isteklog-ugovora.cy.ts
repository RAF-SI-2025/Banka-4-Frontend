describe('Scenario 27: Pokušaj iskorišćavanja isteklog opcionog ugovora', () => {
  

  beforeEach(() => {
    cy.intercept('GET', `**/otc/contracts**`).as('getContracts');
    cy.loginAsClient();
    cy.visit('/otc'); 
  });

  it('potvrđuje da u tabu Istekli ugovori nema dostupnih akcija', () => {
    // 1. Prelazak na glavni tab Sklopljeni ugovori
    cy.contains('button', /Sklopljeni ugovori/i).click({ force: true });
    cy.wait('@getContracts');

    // 2. Klik na pod-tab Istekli ugovori (prikazano na image_e2dfd6.jpg)
    cy.contains('button', /Istekli ugovori/i).click();
    cy.wait(1000); // Vizuelna pauza

    // 3. Provera da tabela postoji ali nema dugmića
    cy.get('table tbody tr').first().within(() => {
      // Proveravamo da li su podaci tu (npr. Stock i Amount sa tvoje slike)
      cy.get('td').should('exist'); 
      
      // KLJUČNA PROVERA: Na slici image_e2dfd6.jpg nema kolone AKCIJA niti dugmadi
      cy.get('button').should('not.exist');
      
      cy.log('Potvrđeno: Red ne sadrži nikakva dugmad za akciju.');
    });

    // 4. Provera da nema dugmeta "Iskoristi" bilo gde u tabeli
    cy.get('table').should('not.contain', 'Iskoristi');
  });

  it('prikazuje ugovor samo kao tekstualnu evidenciju', () => {
    cy.contains('button', /Sklopljeni ugovori/i).click({ force: true });
    cy.contains('button', /Istekli ugovori/i).click();

    // Provera naslova kolona (Settlement Date, Seller Info, Profit...)
    // Na slici image_e2dfd6.jpg se vidi da su ovo samo tekstualne informacije
    const headers = ['STOCK', 'AMOUNT', 'STRIKE PRICE', 'PREMIUM', 'SETTLEMENT DATE', 'SELLER INFO', 'PROFIT'];
    headers.forEach(header => {
      cy.get('table thead').contains(header).should('be.visible');
    });

    cy.log('Ugovori su prikazani isključivo radi evidencije bez mogućnosti interakcije.');
    cy.wait(2000);
  });
});