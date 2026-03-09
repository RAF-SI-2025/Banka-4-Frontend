import { useState, useRef, useLayoutEffect } from 'react';
import { useSearchParams, Link }              from 'react-router-dom';
import gsap                                   from 'gsap';
import { authApi }                            from '../api/endpoints/auth';
import { validirajLozinku, sePoklapa, jacinalozinke } from '../utils/helpers';
import Alert                                  from '../components/ui/Alert';
import styles                                 from './AccountActivation.module.css';

export default function AccountActivation() {
  const [searchParams] = useSearchParams();
  const tokenIzUrla    = searchParams.get('token');
  const cardRef        = useRef(null);

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
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const lozinkaGreska = validirajLozinku(lozinka);
    if (lozinkaGreska)           { setGreska(lozinkaGreska); return; }
    const poklapaGreska = sePoklapa(lozinka, potvrda, 'Lozinke se ne poklapaju');
    if (poklapaGreska)           { setGreska(poklapaGreska); return; }

    setSaljem(true);
    setGreska(null);
    try {
      await authApi.aktivacija({ token: tokenIzUrla, lozinka, potvrda });
      setUspeh(true);
    } catch (err) {
      setGreska(err.error ?? 'Link je istekao ili nevažeći. Kontaktirajte administratora.');
    } finally {
      setSaljem(false);
    }
  }

  const jacina = lozinka ? jacinalozinke(lozinka) : null;

  if (!tokenIzUrla) {
    return (
      <div className={styles.formPanel} style={{ minHeight: '100vh' }}>
        <div className={styles.card}>
          <Alert tip="greska" poruka="Nedostaje aktivacioni token. Proverite link iz emaila." />
          <p className={styles.backLink}>
            <Link to="/login" className={styles.forgotLink}>← Idi na prijavu</Link>
          </p>
        </div>
      </div>
    );
  }

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

        <div className={styles.activateVisual}>
          <div className={styles.activateIconWrap}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <div className={styles.brandEyebrow}>Aktivacija</div>
            <h2 className={styles.brandHeadline}>Postavite<br />lozinku</h2>
            <p className={styles.brandDesc}>
              Vaš nalog je kreiran od strane administratora. Postavite lozinku da biste pristupili portalu.
            </p>
          </div>
          <div className={styles.brandFeatures}>
            {[
              'Jednokratna aktivacija',
              'Link aktivan 24 sata',
              'Sigurno postavljanje lozinke',
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
        <div ref={cardRef} className={styles.card}>
          {uspeh ? (
            <div className={styles.successCenter}>
              <div className={styles.successIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 className={styles.formTitle}>Nalog je aktiviran!</h2>
              <p className={styles.formSubtitle}>Možete se prijaviti sa novom lozinkom.</p>
              <Link to="/login" className={styles.btnPrimary} style={{ marginTop: 24, textDecoration: 'none' }}>
                Idi na prijavu
              </Link>
            </div>
          ) : (
            <>
              <h2 className={styles.formTitle}>Aktivirajte nalog</h2>
              <p className={styles.formSubtitle}>
                Postavite lozinku za pristup portalu. Lozinka mora imati min. 8, max. 32 karaktera, sa 2 broja, 1 velikim i 1 malim slovom.
              </p>
              <div className={styles.divider} />

              {greska && <Alert tip="greska" poruka={greska} />}

              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.field}>
                  <label htmlFor="lozinka">
                    Lozinka <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="lozinka"
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
                  <label htmlFor="potvrda">
                    Potvrdi lozinku <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="potvrda"
                    type="password"
                    value={potvrda}
                    onChange={e => { setPotvrda(e.target.value); setGreska(null); }}
                    className={potvrda ? styles.hasValue : ''}
                  />
                </div>

                <div className={styles.pwConstraints}>
                  {['Min. 8 karaktera', 'Max. 32 karaktera', '≥ 2 broja', '1 veliko slovo', '1 malo slovo'].map(t => (
                    <span key={t} className={styles.pwTag}>{t}</span>
                  ))}
                </div>

                <button type="submit" disabled={saljem} className={styles.btnPrimary} style={{ marginTop: 24 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {saljem ? 'Aktivacija...' : 'Aktiviraj nalog'}
                </button>
              </form>

              <p className={styles.backLink}>
                <Link to="/login" className={styles.forgotLink}>← Nazad na prijavu</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
