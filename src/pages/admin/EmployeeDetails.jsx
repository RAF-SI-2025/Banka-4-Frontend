import { useState, useRef, useLayoutEffect, useEffect }  from 'react';
import { useParams, Link }                      from 'react-router-dom';
import gsap                                    from 'gsap';
import { useFetch }                            from '../../hooks/useFetch';
import { employeesApi }                        from '../../api/endpoints/employees';
import { jeObavezno, jeValidanEmail, jeValidanTelefon } from '../../utils/helpers';
import { usePermissions }                       from '../../hooks/usePermissions';
import Navbar                                  from '../../components/layout/Navbar';
import Spinner                                 from '../../components/ui/Spinner';
import Alert                                   from '../../components/ui/Alert';
import styles                                  from './EmployeeDetails.module.css';

const GENDER_OPTIONS = ['M', 'F'];
const ALL_PERMISSIONS = [
  { value: 'employee.view',   label: 'Pregled zaposlenih' },
  { value: 'employee.create', label: 'Kreiranje zaposlenih' },
  { value: 'employee.update', label: 'Izmena zaposlenih' },
  { value: 'employee.delete', label: 'Brisanje zaposlenih' },
  { value: 'client.view',     label: 'Pregled klijenata' },
  { value: 'client.update',   label: 'Izmena klijenata' },
];

export default function EmployeeDetails() {
  useEffect(() => { document.title = 'RAFBank | Detalji zaposlenog'; }, []);
  const { id }   = useParams();
  const pageRef  = useRef(null);
  const { can }  = usePermissions();

  const { data, loading, error, refetch } = useFetch(
    () => employeesApi.getById(id),
    [id]
  );

  const [editMode,     setEditMode]     = useState(false);
  const [form,         setForm]         = useState(null);
  const [originalForm, setOriginalForm] = useState(null);
  const [errors,       setErrors]       = useState({});
  const [apiError,     setApiError]     = useState(null);
  const [submitting,   setSubmitting]   = useState(false);

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
    const emp = data;
    const initial = {
      first_name:    emp.first_name ?? '',
      last_name:     emp.last_name ?? '',
      email:         emp.email ?? '',
      phone_number:  emp.phone_number ?? '',
      address:       emp.address ?? '',
      date_of_birth: emp.date_of_birth ? emp.date_of_birth.slice(0, 10) : '',
      gender:        emp.gender ?? '',
      active:        emp.active ?? true,
      position_id:   emp.position_id ?? '',
      department:    emp.department ?? '',
      permissions:   emp.permissions ?? [],
    };
    setForm(initial);
    setOriginalForm(initial);
    setErrors({});
    setApiError(null);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setForm(null);
    setErrors({});
    setApiError(null);
  }

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  }

  function togglePermission(perm) {
    setForm(prev => {
      let perms = prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm];

      // Ako ima create/update/delete za employee, view mora biti uključen
      const needsView = perms.some(p => p.startsWith('employee.') && p !== 'employee.view');
      if (needsView && !perms.includes('employee.view')) {
        perms = [...perms, 'employee.view'];
      }

      return { ...prev, permissions: perms };
    });
  }

  function validate() {
    const e = {};
    const check = (k, err) => { if (err) e[k] = err; };
    check('first_name', jeObavezno(form.first_name));
    check('last_name',  jeObavezno(form.last_name));
    check('email',      jeObavezno(form.email) ?? jeValidanEmail(form.email));
    check('position_id', jeObavezno(form.position_id));
    check('department', jeObavezno(form.department));
    if (form.phone_number && jeValidanTelefon(form.phone_number)) {
      e.phone_number = jeValidanTelefon(form.phone_number);
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validate()) return;

    const diff = {};
    for (const key of Object.keys(form)) {
      if (key === 'permissions') {
        const sorted = [...form.permissions].sort();
        const origSorted = [...originalForm.permissions].sort();
        if (JSON.stringify(sorted) !== JSON.stringify(origSorted)) {
          diff.permissions = form.permissions;
        }
      } else if (form[key] !== originalForm[key]) {
        diff[key] = key === 'position_id' ? Number(form[key]) : form[key];
      }
    }
    if (Object.keys(diff).length === 0) {
      setEditMode(false);
      return;
    }

    setSubmitting(true);
    setApiError(null);
    try {
      await employeesApi.update(id, diff);
      setEditMode(false);
      refetch();
    } catch (err) {
      setApiError(err.error ?? 'Greška pri čuvanju.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Da li ste sigurni da želite da deaktivirate ovog zaposlenog?')) return;
    try {
      await employeesApi.update(id, { active: false });
      refetch();
    } catch (err) {
      setApiError(err.error ?? 'Greška pri deaktivaciji.');
    }
  }

  if (loading) return <><Navbar /><Spinner /></>;
  if (error)   return <><Navbar /><Alert tip="greska" poruka={error.error ?? 'Greška.'} /></>;
  if (!data) return <><Navbar /><Alert tip="greska" poruka="Zaposleni nije pronađen." /></>;

  const emp = data;

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <Link to="/employees" className={styles.breadcrumbLink}>Zaposleni</Link>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbActive}>{emp.first_name} {emp.last_name}</span>
          </div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>{emp.first_name} {emp.last_name}</h1>
              <p className={styles.pageDesc}>ID Pozicije: {emp.position_id} — {emp.department}</p>
            </div>
            {(can('employee.update') || can('employee.delete')) && !editMode && (
              <div className={styles.headerActions}>
                {can('employee.update') && (
                  <button className={styles.btnPrimary} onClick={startEdit}>
                    Izmeni
                  </button>
                )}
                {can('employee.delete') && (
                  <button className={styles.btnDanger} onClick={handleDelete}>
                    Deaktiviraj
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {apiError && <Alert tip="greska" poruka={apiError} />}

        <div className={`page-anim ${styles.detailCard}`}>
          {editMode ? (
            <form onSubmit={handleSave} noValidate>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Lični podaci</div>
                <div className={styles.fieldGrid}>
                  <Field label="Ime" required error={errors.first_name}>
                    <input type="text" value={form.first_name} onChange={e => updateField('first_name', e.target.value)} className={form.first_name ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Prezime" required error={errors.last_name}>
                    <input type="text" value={form.last_name} onChange={e => updateField('last_name', e.target.value)} className={form.last_name ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Email" required error={errors.email}>
                    <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} className={form.email ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Telefon" error={errors.phone_number}>
                    <input type="tel" value={form.phone_number} onChange={e => updateField('phone_number', e.target.value)} className={form.phone_number ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Adresa">
                    <input type="text" value={form.address} onChange={e => updateField('address', e.target.value)} className={form.address ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Datum rođenja">
                    <input type="date" value={form.date_of_birth} onChange={e => updateField('date_of_birth', e.target.value)} className={form.date_of_birth ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Pol">
                    <select value={form.gender} onChange={e => updateField('gender', e.target.value)} className={form.gender ? styles.hasValue : ''}>
                      <option value="">Izaberite...</option>
                      {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o === 'M' ? 'Muški' : 'Ženski'}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Radno mesto</div>
                <div className={styles.fieldGrid}>
                  <Field label="ID Pozicije" required error={errors.position_id}>
                    <input type="number" value={form.position_id} onChange={e => updateField('position_id', e.target.value)} className={form.position_id ? styles.hasValue : ''} />
                  </Field>
                  <Field label="Departman" required error={errors.department}>
                    <input type="text" value={form.department} onChange={e => updateField('department', e.target.value)} className={form.department ? styles.hasValue : ''} />
                  </Field>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Permisije</div>
                <div className={styles.permissionsGrid}>
                  {ALL_PERMISSIONS.map(p => {
                    const viewLocked = p.value === 'employee.view'
                      && form.permissions.some(x => x !== 'employee.view');
                    return (
                      <label key={p.value} className={`${styles.permissionItem} ${viewLocked ? styles.permissionLocked : ''}`}>
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(p.value)}
                          onChange={() => togglePermission(p.value)}
                          disabled={viewLocked}
                        />
                        <span className={styles.permissionLabel}>{p.label}</span>
                        <span className={styles.permissionCode}>{p.value}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnGhost} onClick={cancelEdit}>Otkaži</button>
                <button type="submit" disabled={submitting} className={styles.btnPrimary}>
                  {submitting ? 'Čuvanje...' : 'Sačuvaj izmene'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Lični podaci</div>
                <div className={styles.fieldGrid}>
                  <ViewField label="Ime" value={emp.first_name} />
                  <ViewField label="Prezime" value={emp.last_name} />
                  <ViewField label="Email" value={emp.email} />
                  <ViewField label="Telefon" value={emp.phone_number || '—'} />
                  <ViewField label="Adresa" value={emp.address || '—'} />
                  <ViewField label="Datum rođenja" value={emp.date_of_birth ? emp.date_of_birth.slice(0, 10) : '—'} />
                  <ViewField label="Pol" value={emp.gender === 'M' ? 'Muški' : emp.gender === 'F' ? 'Ženski' : '—'} />
                  <div>
                    <div className={styles.fieldLabel}>Status</div>
                    <span className={`${styles.badge} ${emp.active ? styles.badgeActive : styles.badgeInactive}`}>
                      {emp.active ? 'Aktivan' : 'Neaktivan'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Radno mesto</div>
                <div className={styles.fieldGrid}>
                  <ViewField label="ID Pozicije" value={emp.position_id} />
                  <ViewField label="Departman" value={emp.department} />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Permisije</div>
                <div className={styles.permissionsTags}>
                  {emp.permissions?.length > 0 ? (
                    emp.permissions.map(p => {
                      const info = ALL_PERMISSIONS.find(x => x.value === p);
                      return (
                        <span key={p} className={styles.permissionTag}>{info?.label ?? p}</span>
                      );
                    })
                  ) : (
                    <span className={styles.noPermissions}>Nema dodeljenih permisija</span>
                  )}
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
