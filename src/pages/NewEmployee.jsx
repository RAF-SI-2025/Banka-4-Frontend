import { useState, useRef, useLayoutEffect } from 'react';
import { useNavigate }                        from 'react-router-dom';
import gsap                                   from 'gsap';
import { employeesApi }                       from '../api/endpoints/employees';
import { jeObavezno, jeValidanEmail, jeValidanTelefon } from '../utils/helpers';
import Navbar                                 from '../components/layout/Navbar';
import Alert                                  from '../components/ui/Alert';
import styles                                 from './NewEmployee.module.css';

const POL_OPCIJE = ['Muški', 'Ženski', 'Ne želim da navedem'];

export default function NewEmployee() {
  const navigate = useNavigate();
  const pageRef  = useRef(null);

  const [forma, setForma] = useState({
    ime:           '',
    prezime:       '',
    email:         '',
    telefon:       '',
    adresa:        '',
    datumRodjenja: '',
    pol:           '',
    aktivan:       true,
    pozicija:      '',
    departman:     '',
    username:      '',
  });

  const [greske,    setGreske]    = useState({});
  const [apiGreska, setApiGreska] = useState(null);
  const [saljem,    setSaljem]    = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity: 0,
        y: 20,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  function azurirajPolje(polje, vrednost) {
    setForma(prev => {
      const novo = { ...prev, [polje]: vrednost };
      if (polje === 'ime' || polje === 'prezime') {
        const i = polje === 'ime'     ? vrednost : prev.ime;
        const p = polje === 'prezime' ? vrednost : prev.prezime;
        if (i && p) {
          novo.username = `${i.toLowerCase().charAt(0)}${p.toLowerCase().replace(/\s+/g, '')}`;
        }
      }
      return novo;
    });
    if (greske[polje]) setGreske(prev => ({ ...prev, [polje]: null }));
  }

  function validiraj() {
    const nove = {};
    const g = (polje, greska) => { if (greska) nove[polje] = greska; };

    g('ime',           jeObavezno(forma.ime));
    g('prezime',       jeObavezno(forma.prezime));
    g('email',         jeObavezno(forma.email) ?? jeValidanEmail(forma.email));
    g('datumRodjenja', jeObavezno(forma.datumRodjenja));
    g('pol',           jeObavezno(forma.pol));
    g('pozicija',      jeObavezno(forma.pozicija));
    g('departman',     jeObavezno(forma.departman));
    g('username',      jeObavezno(forma.username));

    if (forma.telefon && jeValidanTelefon(forma.telefon)) {
      nove.telefon = jeValidanTelefon(forma.telefon);
    }

    setGreske(nove);
    return Object.keys(nove).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validiraj()) return;

    setSaljem(true);
    setApiGreska(null);
    try {
      await employeesApi.create(forma);
      navigate('/employees');
    } catch (err) {
      setApiGreska(err.error ?? 'Došlo je do greške. Pokušajte ponovo.');
    } finally {
      setSaljem(false);
    }
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Zaposleni</span>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbAktivna}>Novi zaposleni</span>
          </div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Kreiranje novog zaposlenog</h1>
              <p className={styles.pageDesc}>
                Popunite sva obavezna polja. Zaposleni će dobiti email sa linkom za aktivaciju naloga.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => navigate(-1)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Nazad
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className={`page-anim ${styles.grid}`}>
          {/* ── Forma ── */}
          <div className={styles.formCard}>

            {/* Lični podaci */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <span className={styles.sectionTitle}>Lični podaci</span>
              </div>

              {apiGreska && <Alert tip="greska" poruka={apiGreska} />}

              <div className={styles.fieldGrid2}>
                <Polje label="Ime" required greska={greske.ime}>
                  <input
                    type="text"
                    value={forma.ime}
                    onChange={e => azurirajPolje('ime', e.target.value)}
                    className={forma.ime ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Prezime" required greska={greske.prezime}>
                  <input
                    type="text"
                    value={forma.prezime}
                    onChange={e => azurirajPolje('prezime', e.target.value)}
                    className={forma.prezime ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Email adresa" required greska={greske.email}>
                  <input
                    type="email"
                    value={forma.email}
                    onChange={e => azurirajPolje('email', e.target.value)}
                    className={forma.email ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Broj telefona" greska={greske.telefon}>
                  <input
                    type="tel"
                    value={forma.telefon}
                    placeholder="+381..."
                    onChange={e => azurirajPolje('telefon', e.target.value)}
                    className={forma.telefon ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Adresa" greska={greske.adresa}>
                  <input
                    type="text"
                    value={forma.adresa}
                    onChange={e => azurirajPolje('adresa', e.target.value)}
                    className={forma.adresa ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Datum rođenja" required greska={greske.datumRodjenja}>
                  <input
                    type="date"
                    value={forma.datumRodjenja}
                    onChange={e => azurirajPolje('datumRodjenja', e.target.value)}
                    className={forma.datumRodjenja ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Pol" required greska={greske.pol}>
                  <select
                    value={forma.pol}
                    onChange={e => azurirajPolje('pol', e.target.value)}
                    className={forma.pol ? styles.hasValue : ''}
                  >
                    <option value="">Izaberite...</option>
                    {POL_OPCIJE.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Polje>

                <Polje label="Status pri kreiranju">
                  <div
                    className={styles.toggleWrap}
                    onClick={() => azurirajPolje('aktivan', !forma.aktivan)}
                    role="switch"
                    aria-checked={forma.aktivan}
                    tabIndex={0}
                  >
                    <span className={styles.toggleLabel}>Aktivan nalog</span>
                    <div className={`${styles.toggle} ${forma.aktivan ? '' : styles.toggleOff}`} />
                  </div>
                </Polje>
              </div>
            </div>

            {/* Radno mesto */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                </div>
                <span className={styles.sectionTitle}>Radno mesto</span>
              </div>

              <div className={styles.fieldGrid2}>
                <Polje label="Pozicija" required greska={greske.pozicija}>
                  <input
                    type="text"
                    value={forma.pozicija}
                    onChange={e => azurirajPolje('pozicija', e.target.value)}
                    className={forma.pozicija ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Departman" required greska={greske.departman}>
                  <input
                    type="text"
                    value={forma.departman}
                    onChange={e => azurirajPolje('departman', e.target.value)}
                    className={forma.departman ? styles.hasValue : ''}
                  />
                </Polje>
              </div>
            </div>

            {/* Pristup sistemu */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <span className={styles.sectionTitle}>Pristup sistemu</span>
              </div>

              <Polje label="Username" required greska={greske.username}>
                <div className={styles.inputWithBadge}>
                  <input
                    type="text"
                    value={forma.username}
                    onChange={e => azurirajPolje('username', e.target.value)}
                    className={forma.username ? styles.hasValue : ''}
                  />
                  <span className={styles.inputBadge}>Auto-gen</span>
                </div>
              </Polje>

              <div className={styles.field} style={{ marginTop: 16 }}>
                <Alert tip="info">
                  Zaposleni postavlja lozinku sam, putem aktivacionog linka koji dobija na email.
                </Alert>
                <div className={styles.pwConstraints}>
                  {['Min. 8 karaktera', 'Max. 32 karaktera', '≥ 2 broja', '1 veliko slovo', '1 malo slovo'].map(t => (
                    <span key={t} className={styles.pwTag}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Akcije */}
            <div className={styles.formActions}>
              <button type="button" className={styles.btnGhost} onClick={() => navigate(-1)}>
                Otkaži
              </button>
              <div className={styles.actionsRight}>
                <button type="submit" disabled={saljem} className={styles.btnPrimary}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {saljem ? 'Kreiranje...' : 'Kreiraj zaposlenog'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className={`page-anim ${styles.sidebar}`}>
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h4>Napomene</h4>
              </div>
              <div className={styles.infoCardBody}>
                {[
                  { bold: 'Email mora biti jedinstven', rest: ' — dva naloga ne mogu imati isti email' },
                  { bold: 'Username', rest: ' se auto-generiše iz imena, ali ga možete izmeniti' },
                  { bold: 'Administrator ne unosi lozinku', rest: ' — zaposleni je postavlja sam' },
                  { bold: 'Permisije', rest: ' se dodeljuju nakon kreiranja iz profila zaposlenog' },
                ].map((item, i) => (
                  <div key={i} className={styles.infoItem}>
                    <div className={styles.infoBullet} />
                    <div className={styles.infoItemText}>
                      <strong>{item.bold}</strong>{item.rest}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.emailPreview}>
              <div className={styles.emailPreviewBar} />
              <div className={styles.emailPreviewBody}>
                <div className={styles.emailTag}>Aktivacioni email</div>
                <div className={styles.emailPreviewTitle}>Primer emaila koji zaposleni prima</div>
                <div className={styles.emailPreviewText}>
                  Poštovani <strong>{forma.ime || 'zaposleni'}</strong>,<br /><br />
                  Vaš nalog na RAFBank portalu je kreiran. Kliknite na dugme ispod da aktivirate nalog i postavite lozinku.<br /><br />
                  <em>Link ističe za 24 sata.</em>
                </div>
                <div className={styles.emailPreviewCta}>Aktiviraj nalog →</div>
              </div>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}

function Polje({ label, required, greska, children }) {
  return (
    <div className={styles.field}>
      <label>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      {children}
      {greska && <span className={styles.greska}>{greska}</span>}
    </div>
  );
}
