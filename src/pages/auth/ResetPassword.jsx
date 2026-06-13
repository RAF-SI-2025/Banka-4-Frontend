import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useSearchParams, Link }              from 'react-router-dom';
import gsap                                   from 'gsap';
import { authApi }                            from '../../api/endpoints/auth';
import { validirajLozinku, sePoklapa, jacinalozinke } from '../../utils/helpers';
import Alert                                  from '../../components/ui/Alert';
import styles                                 from './ResetPassword.module.css';

function StepIndicator({ step }) {
  const steps = [
    { label: 'Unesi email',   number: 1 },
    { label: 'Proveri inbox', number: 2 },
    { label: 'Nova lozinka',  number: 3 },
  ];

  return (
    <div className={styles.steps}>
      {steps.map((s, i) => {
        const done   = s.number < step;
        const active = s.number === step;
        return (
          <div key={s.number} className={styles.stepItem}>
            <div className={`${styles.stepCircle} ${done ? styles.done : active ? styles.active : styles.inactive}`}>
              {done ? '✓' : s.number}
            </div>
            <div className={styles.stepInfo}>
              <div className={styles.stepNumber}>Korak {s.number}</div>
              <div className={`${styles.stepName} ${active ? styles.stepNameActive : ''}`}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ResetPassword() {
  useEffect(() => { document.title = 'RAFBank | Reset lozinke'; }, []);
  const [searchParams] = useSearchParams();
  const urlToken       = searchParams.get('token');
  const cardRef        = useRef(null);

  const [step,       setStep]       = useState(urlToken ? 3 : 1);
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [error,      setError]      = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);

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
  }, [step]);

  async function handleRequest(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setStep(2);
    } catch (err) {
      setError(err.error ?? 'Greška. Proverite email adresu.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    const pwError = validirajLozinku(password);
    if (pwError)                              { setError(pwError); return; }
    const matchError = sePoklapa(password, confirm, 'Lozinke se ne poklapaju');
    if (matchError)                           { setError(matchError); return; }

    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword({ token: urlToken, new_password: password });
      setSuccess(true);
    } catch (err) {
      setError(err.error ?? 'Link je istekao ili nevažeći.');
    } finally {
      setSubmitting(false);
    }
  }

  const strength = password ? jacinalozinke(password) : null;

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

      <main className={styles.formPanel}>
        <StepIndicator step={step} />

        {step === 1 && (
          <div ref={cardRef} className={styles.card}>
            <h2 className={styles.formTitle}>Zaboravili ste lozinku?</h2>
            <p className={styles.formSubtitle}>
              Unesite email adresu vašeg naloga. Poslaćemo vam link za resetovanje lozinke.
            </p>
            <div className={styles.divider} />

            {error && <Alert tip="greska" poruka={error} />}

            <form onSubmit={handleRequest} noValidate>
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

              <button type="submit" disabled={submitting} className={styles.btnPrimary}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                {submitting ? 'Slanje...' : 'Pošalji link za resetovanje'}
              </button>
            </form>

            <p className={styles.backLink}>
              <Link to="/login" className={styles.forgotLink}>← Nazad na prijavu</Link>
            </p>
          </div>
        )}

        {step === 2 && (
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
              onClick={() => { setStep(1); setError(null); }}
            >
              Pošalji ponovo
            </button>

            <p className={styles.backLink}>
              <Link to="/login" className={styles.forgotLink}>← Nazad na prijavu</Link>
            </p>
          </div>
        )}

        {step === 3 && (
          <div ref={cardRef} className={styles.card}>
            {success ? (
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

                {error && <Alert tip="greska" poruka={error} />}

                <form onSubmit={handleReset} noValidate>
                  <div className={styles.field}>
                    <label htmlFor="nova-lozinka">
                      Nova lozinka <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="nova-lozinka"
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
                    <label htmlFor="potvrda-lozinke">
                      Potvrdi lozinku <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="potvrda-lozinke"
                      type="password"
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError(null); }}
                      className={confirm ? styles.hasValue : ''}
                    />
                  </div>

                  <button type="submit" disabled={submitting} className={styles.btnPrimary}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {submitting ? 'Čuvanje...' : 'Potvrdi novu lozinku'}
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
