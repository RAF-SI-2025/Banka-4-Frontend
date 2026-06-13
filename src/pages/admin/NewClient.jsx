import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useNavigate }                        from 'react-router-dom';
import gsap                                   from 'gsap';
import { clientsApi }                         from '../../api/endpoints/clients';
import { jeObavezno, jeValidanEmail, jeValidanTelefon } from '../../utils/helpers';
import Navbar                                 from '../../components/layout/Navbar';
import Alert                                  from '../../components/ui/Alert';
import styles                                 from './NewEmployee.module.css';

const GENDER_OPTIONS = ['M', 'F'];

export default function NewClient() {
  useEffect(() => { document.title = 'RAFBank | Novi klijent'; }, []);
  const navigate = useNavigate();
  const pageRef  = useRef(null);

  const [form, setForm] = useState({
    first_name:    '',
    last_name:     '',
    username:      '',
    email:         '',
    jmbg:          '',
    phone_number:  '',
    address:       '',
    date_of_birth: '',
    gender:        '',
  });

  const [errors,     setErrors]     = useState({});
  const [apiError,   setApiError]   = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  }

  function validate() {
    const e = {};
    const check = (field, err) => { if (err) e[field] = err; };

    check('first_name',    jeObavezno(form.first_name));
    check('last_name',     jeObavezno(form.last_name));
    check('username',      jeObavezno(form.username));
    check('email',         jeObavezno(form.email) ?? jeValidanEmail(form.email));
    check('jmbg',          jeObavezno(form.jmbg));
    check('date_of_birth', jeObavezno(form.date_of_birth));
    check('gender',        jeObavezno(form.gender));

    if (form.phone_number && jeValidanTelefon(form.phone_number)) {
      e.phone_number = jeValidanTelefon(form.phone_number);
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const formattedDate = form.date_of_birth ? `${form.date_of_birth}T00:00:00Z` : null;

      const payload = {
        ...form,
        date_of_birth: formattedDate
      };

      await clientsApi.create(payload);
      navigate('/clients');
    } catch (err) {
      setApiError(err.message || err.error || 'Greška u komunikaciji sa serverom.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Klijenti</span>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbAktivna}>Novi klijent</span>
          </div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Kreiranje novog klijenta</h1>
              <p className={styles.pageDesc}>
                Popunite sva obavezna polja za registraciju klijenta.
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
          <div className={styles.formCard}>
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <span className={styles.sectionTitle}>Podaci o klijentu</span>
              </div>

              {apiError && <Alert tip="greska" poruka={apiError} />}

              <div className={styles.fieldGrid2}>
                <Polje label="Ime" required greska={errors.first_name}>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={e => updateField('first_name', e.target.value)}
                    className={form.first_name ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Prezime" required greska={errors.last_name}>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={e => updateField('last_name', e.target.value)}
                    className={form.last_name ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Korisničko ime" required greska={errors.username}>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => updateField('username', e.target.value)}
                    className={form.username ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Email adresa" required greska={errors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => updateField('email', e.target.value)}
                    className={form.email ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="JMBG" required greska={errors.jmbg}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={form.jmbg}
                    onChange={e => updateField('jmbg', e.target.value)}
                    className={form.jmbg ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Broj telefona" greska={errors.phone_number}>
                  <input
                    type="tel"
                    value={form.phone_number}
                    placeholder="+381..."
                    onChange={e => updateField('phone_number', e.target.value)}
                    className={form.phone_number ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Adresa" greska={errors.address}>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => updateField('address', e.target.value)}
                    className={form.address ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Datum rođenja" required greska={errors.date_of_birth}>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => updateField('date_of_birth', e.target.value)}
                    className={form.date_of_birth ? styles.hasValue : ''}
                  />
                </Polje>

                <Polje label="Pol" required greska={errors.gender}>
                  <select
                    value={form.gender}
                    onChange={e => updateField('gender', e.target.value)}
                    className={form.gender ? styles.hasValue : ''}
                  >
                    <option value="">Izaberite...</option>
                    {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o === 'M' ? 'Muški' : 'Ženski'}</option>)}
                  </select>
                </Polje>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.btnGhost} onClick={() => navigate(-1)}>
                Otkaži
              </button>
              <div className={styles.actionsRight}>
                <button type="submit" disabled={submitting} className={styles.btnPrimary}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {submitting ? 'Kreiranje...' : 'Kreiraj klijenta'}
                </button>
              </div>
            </div>
          </div>
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
