describe('Scenario 56: Dividenda se konvertuje u RSD ako korisnik nema ni originalni ni podrazumevani USD račun', () => {
  it.skip('skip - nije moguće pouzdano testirati u trenutnom seed okruženju', () => {
    // Razlog:
    // U ovom okruženju ne postoji stabilan test korisnik koji:
    // 1) nema USD račun,
    // 2) ima odgovarajući fallback račun za očekivanu isplatu,
    // 3) i istovremeno ima pristup kompletnom securities/dividend flow-u.
    //
    // Dodatno, backend i UI prikazuju različite skupove računa za iste korisnike,
    // pa se ne može pouzdano potvrditi da se zaista testira fallback grana bez USD računa.
    //
    // Zbog nekonzistentnih seed podataka i nemogućnosti upravljanja lifecycle-om računa
    // (brisanje/deaktivacija/forsiranje fallback konfiguracije), scenario se preskače.
  });
});