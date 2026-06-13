import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useSearchParams, Link }              from 'react-router-dom';
import gsap                                   from 'gsap';
import { authApi }                            from '../../api/endpoints/auth';
import { validirajLozinku, sePoklapa, jacinalozinke } from '../../utils/helpers';
import Alert                                  from '../../components/ui/Alert';
import styles                                 from './AccountActivation.module.css';

export default function AccountActivation() {
  useEffect(() => { document.title = 'RAFBank | Aktivacija naloga'; }, []);
  const [searchParams] = useSearchParams();
  const urlToken       = searchParams.get('token');
  const cardRef        = useRef(null);

  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [error,      setError]      = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [expired,    setExpired]    = useState(false);
  const [resending,  setResending]  = useState(false);
  const [resent,     setResent]     = useState(false);

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
    const pwError = validirajLozinku(password);
    if (pwError)                              { setError(pwError); return; }
    const matchError = sePoklapa(password, confirm, 'Lozinke se ne poklapaju');
    if (matchError)                           { setError(matchError); return; }

    setSubmitting(true);
    setError(null);
    try {
      await authApi.activate({ token: urlToken, password });
      setSuccess(true);
    } catch (err) {
      const msg = err.error ?? err.message ?? '';
      if (err.status === 410 || /expired|istekao/i.test(msg)) {
        setExpired(true);
      } else {
        setError(msg || 'Link je nevažeći. Kontaktirajte administratora.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      await authApi.resendActivation(urlToken);
      setResent(true);
    } catch (err) {
      setError(err.error ?? 'Greška pri slanju novog linka. Kontaktirajte administratora.');
    } finally {
      setResending(false);
    }
  }

  const strength = password ? jacinalozinke(password) : null;

  if (!urlToken) {
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

      <main className={styles.formPanel}>
        <div ref={cardRef} className={styles.card}>
          {expired ? (
            <div className={styles.successCenter}>
              {resent ? (
                <>
                  <div className={styles.successIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <h2 className={styles.formTitle}>Novi link je poslat!</h2>
                  <p className={styles.formSubtitle}>
                    Proverite vaš email za novi aktivacioni link.
                  </p>
                </>
              ) : (
                <>
                  <div className={styles.successIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red, #e74c3c)" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <h2 className={styles.formTitle}>Aktivacioni link je istekao</h2>
                  <p className={styles.formSubtitle}>
                    Vaš aktivacioni token više nije važeći. Kliknite na dugme ispod da dobijete novi link na email.
                  </p>
                  {error && <Alert tip="greska" poruka={error} />}
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className={styles.btnPrimary}
                    style={{ marginTop: 24 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    {resending ? 'Slanje...' : 'Pošalji novi aktivacioni link'}
                  </button>
                </>
              )}
              <p className={styles.backLink}>
                <Link to="/login" className={styles.forgotLink}>← Nazad na prijavu</Link>
              </p>
            </div>
          ) : success ? (
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

              {error && <Alert tip="greska" poruka={error} />}

              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.field}>
                  <label htmlFor="password">
                    Lozinka <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    className={password ? styles.hasValue : ''}
                  />
                  {strength && (
                    <div className={styles.pwStrength}>
                      <div className={styles.pwStrengthBar}>
                        <div
                          className={styles.pwStrengthFill}
                          style={{ width: strength.procenat, background: strength.boja }}
                        />
                      </div>
                      <span className={styles.pwStrengthLabel} style={{ color: strength.boja }}>
                        {strength.naziv} lozinka
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="confirm">
                    Potvrdi lozinku <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(null); }}
                    className={confirm ? styles.hasValue : ''}
                  />
                </div>

                <div className={styles.pwConstraints}>
                  {['Min. 8 karaktera', 'Max. 32 karaktera', '≥ 2 broja', '1 veliko slovo', '1 malo slovo'].map(t => (
                    <span key={t} className={styles.pwTag}>{t}</span>
                  ))}
                </div>

                <button type="submit" disabled={submitting} className={styles.btnPrimary} style={{ marginTop: 24 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {submitting ? 'Aktivacija...' : 'Aktiviraj nalog'}
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
