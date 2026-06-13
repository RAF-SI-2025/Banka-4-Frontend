import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useNavigate, Link }                  from 'react-router-dom';
import gsap                                   from 'gsap';
import { authApi }                            from '../../api/endpoints/auth';
import { useAuthStore }                       from '../../store/authStore';
import Alert                                  from '../../components/ui/Alert';
import styles                                 from './Login.module.css';

export default function UnifiedLogin() {
  useEffect(() => { document.title = 'RAFBank | Prijava'; }, []);
  const navigate = useNavigate();
  const setAuth  = useAuthStore(s => s.setAuth);
  const cardRef  = useRef(null);

  const [loginType,  setLoginType]  = useState('client'); // 'client' ili 'employee'
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
    setError(null);
    setSubmitting(true);
    
    try {
      const res = await authApi.login({ email, password });

      const expectedType = loginType === 'client' ? 'client' : 'employee';
      if (res.user?.identity_type !== expectedType) {
        setError(
          loginType === 'client'
            ? 'Ovi kredencijali ne pripadaju klijentskom nalogu.'
            : 'Ovi kredencijali ne pripadaju nalogu zaposlenog.'
        );
        return;
      }

      setAuth(res.user, res.token, res.refresh_token);

      if (loginType === 'client') {
        navigate('/dashboard');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      const msg = err.error ?? err.message ?? '';
      if (err.status === 403 || /locked|blocked|too many/i.test(msg)) {
        setError('Vaš nalog je privremeno blokiran zbog previše neuspešnih pokušaja. Pokušajte ponovo za 5 minuta.');
      } else {
        setError(msg || 'Pogrešan email ili lozinka. Proverite unos i pokušajte ponovo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Dinamički sadržaj na osnovu tipa login-a
  const content = loginType === 'client' ? {
    brandSub: 'Klijentski portal',
    eyebrow: 'Online Banking',
    headline: 'Vaše finansije\nna jednom mestu',
    description: 'Pratite stanje računa, vršite plaćanja i transfere, i upravljajte karticama — sve iz browsera.',
    features: [
      'Pregled svih računa i transakcija',
      'Plaćanja i transferi u realnom vremenu',
      'Menjačnica i kursna lista',
      'Upravljanje karticama i kreditima',
    ],
    title: 'Dobrodošli',
    subtitle: 'Prijavite se na vaš klijentski nalog.',
    emailPlaceholder: 'vas@email.com',
    supportEmail: 'podrska@rafbank.rs',
  } : {
    brandSub: 'Portal za zaposlene',
    eyebrow: 'Interni sistem',
    headline: 'Upravljanje\nkorisnicima',
    description: 'Centralizovana platforma za administraciju zaposlenih, kontrolu pristupa i upravljanje klijentskim nalozima.',
    features: [
      'Upravljanje zaposlenima i permisijama',
      'Pregled i kreiranje klijentskih naloga',
      'Bezbedna autentifikacija i autorizacija',
      'Revizijski trag svih akcija',
    ],
    title: 'Dobrodošli nazad',
    subtitle: 'Unesite vaše kredencijale za pristup portalu.',
    emailPlaceholder: 'ime@raf.rs',
    supportEmail: 'it@raf.rs',
  };

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
            <div className={styles.brandSub}>{content.brandSub}</div>
          </div>
        </div>

        <div className={styles.brandContent}>
          <div className={styles.brandEyebrow}>{content.eyebrow}</div>
          <h1 className={styles.brandHeadline}>
            {content.headline.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h1>
          <p className={styles.brandDesc}>{content.description}</p>
          <div className={styles.brandFeatures}>
            {content.features.map(f => (
              <div key={f} className={styles.brandFeature}>
                <div className={styles.featureDot} />
                <span className={styles.featureText}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className={styles.formPanel}>
        <div ref={cardRef} className={styles.card}>
          
          {/* Toggle za tip login-a */}
          <div className={styles.loginTypeSwitch}>
            <button
              type="button"
              className={`${styles.loginTypeBtn} ${loginType === 'client' ? styles.active : ''}`}
              onClick={() => {
                setLoginType('client');
                setError(null);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Klijent
            </button>
            <button
              type="button"
              className={`${styles.loginTypeBtn} ${loginType === 'employee' ? styles.active : ''}`}
              onClick={() => {
                setLoginType('employee');
                setError(null);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              Zaposleni
            </button>
          </div>

          <h2 className={styles.formTitle}>{content.title}</h2>
          <p className={styles.formSubtitle}>{content.subtitle}</p>
          <div className={styles.divider} />

          {error && <Alert tip="greska" poruka={error} />}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="email">
                {loginType === 'client' ? 'Email adresa' : 'Email'}
              </label>
              <input
                id="email"
                type="email"
                placeholder={content.emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={email ? styles.hasValue : ''}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Lozinka</label>
              <input
                id="password"
                type="password"
                placeholder="Unesite lozinku"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={password ? styles.hasValue : ''}
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.rememberLabel}>
                <input type="checkbox" style={{ width: 15, height: 15, accentColor: 'var(--blue)' }} />
                Zapamti prijavu
              </label>
              <Link to="/reset-password" className={styles.forgotLink}>
                Zaboravili ste lozinku?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={styles.btnPrimary}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              {submitting ? 'Prijavljivanje...' : 'Prijavi se'}
            </button>
          </form>

          <p className={styles.footerText}>
            Problem sa prijavom? Kontaktirajte {loginType === 'client' ? 'podršku' : 'IT podršku'}: <strong>{content.supportEmail}</strong>
          </p>
        </div>
      </main>
    </div>
  );
}
