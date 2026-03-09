import { useState, useRef, useLayoutEffect } from 'react';
import { useSearchParams, Link }              from 'react-router-dom';
import gsap                                   from 'gsap';
import { authApi }                            from '../api/endpoints/auth';
import { validirajLozinku, sePoklapa, jacinalozinke } from '../utils/helpers';
import Alert                                  from '../components/ui/Alert';
import styles                                 from './ResetPassword.module.css';

function StepIndicator({ korak }) {
  const koraci = [
    { naziv: 'Unesi email',   broj: 1 },
    { naziv: 'Proveri inbox', broj: 2 },
    { naziv: 'Nova lozinka',  broj: 3 },
  ];

  return (
    <div className={styles.steps}>
      {koraci.map((k, i) => {
        const done   = k.broj < korak;
        const active = k.broj === korak;
        return (
          <div key={k.broj} className={styles.stepItem}>
            <div className={`${styles.stepCircle} ${done ? styles.done : active ? styles.active : styles.inactive}`}>
              {done ? '✓' : k.broj}
            </div>
            <div className={styles.stepInfo}>
              <div className={styles.stepNumber}>Korak {k.broj}</div>
              <div className={`${styles.stepName} ${active ? styles.stepNameActive : ''}`}>{k.naziv}</div>
            </div>
            {i < koraci.length - 1 && (
              <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const tokenIzUrla    = searchParams.get('token');
  const cardRef        = useRef(null);

  const [korak,   setKorak]   = useState(tokenIzUrla ? 3 : 1);
  const [email,   setEmail]   = useState('');
  const [lozinka, setLozinka] = useState('');
  const [potvrda, setPotvrda] = useState('');
  const [greska,  setGreska]  = useState(null);
  const [saljem,  setSaljem]  = useState(false);
  const [uspeh,   setUspeh]   = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 16,
        duration: 0.5,
        ease: 'power2.out',
      });
    });
    return () => ctx.revert();
  }, [korak]);

  async function handleZahtev(e) {
    e.preventDefault();
    setSaljem(true);
    setGreska(null);
    try {
      await authApi.resetZahtev(email);
      setKorak(2);
    } catch (err) {
      setGreska(err.error ?? 'Greška. Proverite email adresu.');
    } finally {
      setSaljem(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    const lozinkaGreska = validirajLozinku(lozinka);
    if (lozinkaGreska)           { setGreska(lozinkaGreska); return; }
    const poklapaGreska = sePoklapa(lozinka, potvrda, 'Lozinke se ne poklapaju');
    if (poklapaGreska)           { setGreska(poklapaGreska); return; }

    setSaljem(true);
    setGreska(null);
    try {
      await authApi.resetLozinka({ token: tokenIzUrla, lozinka, potvrda });
      setUspeh(true);
    } catch (err) {
      setGreska(err.error ?? 'Link je istekao ili nevažeći.');
    } finally {
      setSaljem(false);
    }
  }

  const jacina = lozinka ? jacinalozinke(lozinka) : null;

  return (
    <div className={styles.wrap}>

      {/* Leva — brand panel */}
      <aside className={styles.brand}>
        <div className={styles.brandLogo}>
          <div className={styles.brandIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <div className={styles.brandName}>Banka 4</div>
            <div className={styles.brandSub}>Portal za zaposlene</div>
          </div>
        </div>

        <div className={styles.lockVisual}>
          <div className={styles.lockIconWrap}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              <circle cx="12" cy="16" r="1" fill="var(--accent)"/>
            </svg>
          </div>
          <div>
            <div className={styles.brandEyebrow}>Sigurnost</div>
            <h2 className={styles.brandHeadline}>Resetujte<br />lozinku</h2>
            <p className={styles.brandDesc}>
              Brzo i sigurno resetujte pristup svom nalogu putem verifikacionog emaila.
            </p>
          </div>
          <div className={styles.brandFeatures}>
            {[
              'Link aktivan 30 minuta',
              'Jednokratna upotreba',
              'Potvrda putem emaila',
            ].map(f => (
              <div key={f} className={styles.brandFeature}>
                <div className={styles.featureDot} />
                <span className={styles.featureText}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.brandFooter}></div>
      </aside>

      {/* Desna — forma panel */}
      <main className={styles.formPanel}>
        <StepIndicator korak={korak} />

        {/* Korak 1: Email */}
        {korak === 1 && (
          <div ref={cardRef} className={styles.card}>
            <h2 className={styles.formTitle}>Zaboravili ste lozinku?</h2>
            <p className={styles.formSubtitle}>
              Unesite email adresu vašeg naloga. Poslaćemo vam link za resetovanje lozinke.
            </p>
            <div className={styles.divider} />

            {greska && <Alert tip="greska" poruka={greska} />}

            <form onSubmit={handleZahtev} noValidate>
              <div className={styles.field}>
                <label htmlFor="email">Email adresa</label>
                <input
                  id="email"
                  type="email"
                  placeholder="ime.prezime@raf.rs"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className={email ? styles.hasValue : ''}
                />
              </div>

              <button type="submit" disabled={saljem} className={styles.btnPrimary}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                {saljem ? 'Slanje...' : 'Pošalji link za resetovanje'}
              </button>
            </form>

            <p className={styles.backLink}>
              <Link to="/login" className={styles.forgotLink}>← Nazad na prijavu</Link>
            </p>
          </div>
        )}

        {/* Korak 2: Email poslat */}
        {korak === 2 && (
          <div ref={cardRef} className={styles.card}>
            <div className={styles.successCenter}>
              <div className={styles.successIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 className={styles.formTitle}>Email je poslat!</h2>
              <p className={styles.formSubtitle}>
                Proverite vaš inbox na adresi <strong>{email}</strong>. Link je aktivan <strong>30 minuta</strong>.
              </p>
            </div>

            <Alert tip="info">
              Niste primili email? Proverite <strong>spam</strong> folder ili pošaljite ponovo.
            </Alert>

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => { setKorak(1); setGreska(null); }}
            >
              Pošalji ponovo
            </button>

            <p className={styles.backLink}>
              <Link to="/login" className={styles.forgotLink}>← Nazad na prijavu</Link>
            </p>
          </div>
        )}

        {/* Korak 3: Nova lozinka */}
        {korak === 3 && (
          <div ref={cardRef} className={styles.card}>
            {uspeh ? (
              <div className={styles.successCenter}>
                <div className={styles.successIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 className={styles.formTitle}>Lozinka je promenjena!</h2>
                <p className={styles.formSubtitle}>Možete se prijaviti sa novom lozinkom.</p>
                <Link to="/login" className={styles.btnPrimary} style={{ marginTop: 24, textDecoration: 'none' }}>
                  Idi na prijavu
                </Link>
              </div>
            ) : (
              <>
                <h2 className={styles.formTitle}>Postavite novu lozinku</h2>
                <p className={styles.formSubtitle}>
                  Lozinka mora imati min. 8, max. 32 karaktera, sa 2 broja, 1 velikim i 1 malim slovom.
                </p>
                <div className={styles.divider} />

                {greska && <Alert tip="greska" poruka={greska} />}

                <form onSubmit={handleReset} noValidate>
                  <div className={styles.field}>
                    <label htmlFor="nova-lozinka">
                      Nova lozinka <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="nova-lozinka"
                      type="password"
                      value={lozinka}
                      onChange={e => { setLozinka(e.target.value); setGreska(null); }}
                      className={lozinka ? styles.hasValue : ''}
                    />
                    {jacina && (
                      <div className={styles.pwStrength}>
                        <div className={styles.pwStrengthBar}>
                          <div
                            className={styles.pwStrengthFill}
                            style={{ width: jacina.procenat, background: jacina.boja }}
                          />
                        </div>
                        <span className={styles.pwStrengthLabel} style={{ color: jacina.boja }}>
                          {jacina.naziv} lozinka
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="potvrda-lozinke">
                      Potvrdi lozinku <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="potvrda-lozinke"
                      type="password"
                      value={potvrda}
                      onChange={e => { setPotvrda(e.target.value); setGreska(null); }}
                      className={potvrda ? styles.hasValue : ''}
                    />
                  </div>

                  <button type="submit" disabled={saljem} className={styles.btnPrimary}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {saljem ? 'Čuvanje...' : 'Potvrdi novu lozinku'}
                  </button>
                </form>

                <p className={styles.backLink}>
                  <Link to="/login" className={styles.forgotLink}>← Nazad na prijavu</Link>
                </p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
