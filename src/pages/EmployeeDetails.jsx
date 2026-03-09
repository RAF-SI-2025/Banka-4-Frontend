import { useState, useRef, useLayoutEffect }  from 'react';
import { useParams, useNavigate, Link }        from 'react-router-dom';
import gsap                                    from 'gsap';
import { useFetch }                            from '../hooks/useFetch';
import { employeesApi }                        from '../api/endpoints/employees';
import { jeObavezno, jeValidanEmail, jeValidanTelefon } from '../utils/helpers';
import { useAuthStore }                        from '../store/authStore';
import Navbar                                  from '../components/layout/Navbar';
import Spinner                                 from '../components/ui/Spinner';
import Alert                                   from '../components/ui/Alert';
import styles                                  from './EmployeeDetails.module.css';

const POL_OPCIJE = ['Muški', 'Ženski', 'Ne želim da navedem'];

export default function EmployeeDetails() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const pageRef  = useRef(null);
  const user     = useAuthStore(s => s.user);

  const { data, loading, error, refetch } = useFetch(
    () => employeesApi.getById(id),
    [id]
  );

  const [editMode,  setEditMode]  = useState(false);
  const [forma,     setForma]     = useState(null);
  const [greske,    setGreske]    = useState({});
  const [apiGreska, setApiGreska] = useState(null);
  const [saljem,    setSaljem]    = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  function startEdit() {
    const z = data.data;
    setForma({
      ime:           z.ime ?? '',
      prezime:       z.prezime ?? '',
      email:         z.email ?? '',
      telefon:       z.telefon ?? '',
      adresa:        z.adresa ?? '',
      datumRodjenja: z.datumRodjenja ?? '',
      pol:           z.pol ?? '',
      aktivan:       z.aktivan ?? true,
      pozicija:      z.pozicija ?? '',
      departman:     z.departman ?? '',
    });
    setGreske({});
    setApiGreska(null);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setForma(null);
    setGreske({});
    setApiGreska(null);
  }

  function updateField(key, value) {
    setForma(prev => ({ ...prev, [key]: value }));
    if (greske[key]) setGreske(prev => ({ ...prev, [key]: null }));
  }

  function validate() {
    const n = {};
    const g = (k, e) => { if (e) n[k] = e; };
    g('ime',      jeObavezno(forma.ime));
    g('prezime',  jeObavezno(forma.prezime));
    g('email',    jeObavezno(forma.email) ?? jeValidanEmail(forma.email));
    g('pozicija', jeObavezno(forma.pozicija));
    g('departman',jeObavezno(forma.departman));
    if (forma.telefon && jeValidanTelefon(forma.telefon)) {
      n.telefon = jeValidanTelefon(forma.telefon);
    }
    setGreske(n);
    return Object.keys(n).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaljem(true);
    setApiGreska(null);
    try {
      await employeesApi.update(id, forma);
      setEditMode(false);
      refetch();
    } catch (err) {
      setApiGreska(err.error ?? 'Greška pri čuvanju.');
    } finally {
      setSaljem(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovog zaposlenog?')) return;
    try {
      await employeesApi.remove(id);
      navigate('/employees');
    } catch (err) {
      setApiGreska(err.error ?? 'Greška pri brisanju.');
    }
  }

  if (loading) return <><Navbar /><Spinner /></>;
  if (error)   return <><Navbar /><Alert tip="greska" poruka={error.error ?? 'Greška.'} /></>;
  if (!data?.data) return <><Navbar /><Alert tip="greska" poruka="Zaposleni nije pronađen." /></>;

  const z = data.data;

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <Link to="/employees" className={styles.breadcrumbLink}>Zaposleni</Link>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbActive}>{z.ime} {z.prezime}</span>
          </div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>{z.ime} {z.prezime}</h1>
              <p className={styles.pageDesc}>{z.pozicija} — {z.departman}</p>
            </div>
            {user?.jeAdmin && !editMode && (
              <div className={styles.headerActions}>
                <button className={styles.btnPrimary} onClick={startEdit}>
                  Izmeni
                </button>
                <button className={styles.btnDanger} onClick={handleDelete}>
                  Obriši
                </button>
              </div>
            )}
          </div>
        </div>

        {apiGreska && <Alert tip="greska" poruka={apiGreska} />}

        <div className={`page-anim ${styles.detailCard}`}>
          {editMode ? (
            <form onSubmit={handleSave} noValidate>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Lični podaci</div>
                <div className={styles.fieldGrid}>
                  <Field label="Ime" required error={greske.ime}>
                    <input type="text" value={forma.ime} onChange={e => updateField('ime', e.target.value)} className={forma.ime ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Prezime" required error={greske.prezime}>
                    <input type="text" value={forma.prezime} onChange={e => updateField('prezime', e.target.value)} className={forma.prezime ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Email" required error={greske.email}>
                    <input type="email" value={forma.email} onChange={e => updateField('email', e.target.value)} className={forma.email ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Telefon" error={greske.telefon}>
                    <input type="tel" value={forma.telefon} onChange={e => updateField('telefon', e.target.value)} className={forma.telefon ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Adresa">
                    <input type="text" value={forma.adresa} onChange={e => updateField('adresa', e.target.value)} className={forma.adresa ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Datum rođenja">
                    <input type="date" value={forma.datumRodjenja} onChange={e => updateField('datumRodjenja', e.target.value)} className={forma.datumRodjenja ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Pol">
                    <select value={forma.pol} onChange={e => updateField('pol', e.target.value)} className={forma.pol ? styles.hasValue : ''}>
                      <option value="">Izaberite...</option>
                      {POL_OPCIJE.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Radno mesto</div>
                <div className={styles.fieldGrid}>
                  <Field label="Pozicija" required error={greske.pozicija}>
                    <input type="text" value={forma.pozicija} onChange={e => updateField('pozicija', e.target.value)} className={forma.pozicija ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Departman" required error={greske.departman}>
                    <input type="text" value={forma.departman} onChange={e => updateField('departman', e.target.value)} className={forma.departman ? styles.hasValue : ''} />
                  </Field>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnGhost} onClick={cancelEdit}>Otkaži</button>
                <button type="submit" disabled={saljem} className={styles.btnPrimary}>
                  {saljem ? 'Čuvanje...' : 'Sačuvaj izmene'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Lični podaci</div>
                <div className={styles.fieldGrid}>
                  <ViewField label="Ime" value={z.ime} />
                  <ViewField label="Prezime" value={z.prezime} />
                  <ViewField label="Email" value={z.email} />
                  <ViewField label="Telefon" value={z.telefon || '—'} />
                  <ViewField label="Adresa" value={z.adresa || '—'} />
                  <ViewField label="Datum rođenja" value={z.datumRodjenja || '—'} />
                  <ViewField label="Pol" value={z.pol || '—'} />
                  <div>
                    <div className={styles.fieldLabel}>Status</div>
                    <span className={`${styles.badge} ${z.aktivan ? styles.badgeActive : styles.badgeInactive}`}>
                      {z.aktivan ? 'Aktivan' : 'Neaktivan'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Radno mesto</div>
                <div className={styles.fieldGrid}>
                  <ViewField label="Pozicija" value={z.pozicija} />
                  <ViewField label="Departman" value={z.departman} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ViewField({ label, value }) {
  return (
    <div>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue}>{value}</div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div className={styles.field}>
      <label>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      {children}
      {error && <span className={styles.greska}>{error}</span>}
    </div>
  );
}
