export const jeObavezno = v =>
  v?.toString().trim() ? null : 'Polje je obavezno';

export const jeValidanEmail = v =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Email adresa nije ispravna';

export const jeValidanTelefon = v =>
  /^\+?[0-9\s-]{8,15}$/.test(v) ? null : 'Broj telefona nije ispravan';

export function validirajLozinku(l) {
  if (!l || l.length < 8)  return 'Minimum 8 karaktera';
  if (l.length > 32)       return 'Maksimum 32 karaktera';
  if (!/[A-Z]/.test(l))   return 'Potrebno najmanje 1 veliko slovo';
  if (!/[a-z]/.test(l))   return 'Potrebno najmanje 1 malo slovo';
  if ((l.match(/[0-9]/g) || []).length < 2) return 'Potrebna su najmanje 2 broja';
  return null;
}

export const sePoklapa = (a, b, poruka = 'Vrednosti se ne poklapaju') =>
  a === b ? null : poruka;

export function jacinalozinke(lozinka) {
  let score = 0;
  if (lozinka.length >= 8)              score++;
  if (/[A-Z]/.test(lozinka))           score++;
  if (/[0-9].*[0-9]/.test(lozinka))   score++;
  if (/[^A-Za-z0-9]/.test(lozinka))   score++;
  const pcts   = ['20%', '45%', '68%', '100%'];
  const boje   = ['var(--red)', 'var(--amber)', 'var(--accent)', 'var(--green)'];
  const nazivi = ['Slaba', 'Srednja', 'Dobra', 'Jaka'];
  return {
    procenat: pcts[score]   ?? '20%',
    boja:     boje[score]   ?? boje[0],
    naziv:    nazivi[score] ?? 'Slaba',
  };
}
