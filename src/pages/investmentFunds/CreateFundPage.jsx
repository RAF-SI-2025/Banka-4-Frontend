import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useNavigate, Link }    from 'react-router-dom';
import gsap                     from 'gsap';
import { useAuthStore }         from '../../store/authStore';
import { investmentFundsApi }   from '../../api/endpoints/investmentFunds';
import { actuariesApi }         from '../../api/endpoints/actuaries';
import Navbar                   from '../../components/layout/Navbar';
import Alert                    from '../../components/ui/Alert';
import styles                   from './CreateFundPage.module.css';

export default function CreateFundPage() {
  useEffect(() => { document.title = 'RAFBank | Novi fond'; }, []);
  const navigate  = useNavigate();
  const pageRef   = useRef(null);
  const user      = useAuthStore(s => s.user);

  const [form, setForm] = useState({
    name:                '',
    description:         '',
    minimumInvestment:   '',
    managerId:           String(user?.id ?? ''),
  });

  const [supervisors,  setSupervisors]  = useState([]);
  const [loadingSupers, setLoadingSupers] = useState(true);
  const [errors,       setErrors]       = useState({});
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState(null);

  useEffect(() => {
    actuariesApi.getAll({ page_size: 100 })
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        const supers = list.filter(a => a.is_supervisor === true);
        setSupervisors(supers);
        const me = supers.find(s => s.id === user?.id || s.email === user?.email);
        if (me) setForm(f => ({ ...f, managerId: String(me.id) }));
      })
      .catch(() => {})
      .finally(() => setLoadingSupers(false));
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity: 0, y: 20, duration: 0.4, stagger: 0.08, ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim())                         errs.name              = 'Naziv fonda je obavezan.';
    if (!form.description.trim())                  errs.description       = 'Opis fonda je obavezan.';
    const min = parseFloat(form.minimumInvestment);
    if (!form.minimumInvestment || isNaN(min) || min <= 0)
                                                   errs.minimumInvestment = 'Unesite validan minimalni iznos.';
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        name:                 form.name.trim(),
        description:          form.description.trim(),
        minimum_contribution: parseFloat(form.minimumInvestment),
        manager_id:           Number(form.managerId),
      };
      const body = await investmentFundsApi.createFund(payload);
      navigate('/investment-funds', {
        state: {
          newFund:    body,
          successMsg: `Fond "${payload.name}" je uspešno kreiran.`,
        },
      });
    } catch (err) {
      const msg = typeof err === 'string'
        ? err
        : err?.message ?? err?.error ?? 'Greška pri kreiranju fonda.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>

        {/* Header */}
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <Link to="/investment-funds" className={styles.breadcrumbLink}>Investicioni fondovi</Link>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbAktivna}>Novi fond</span>
          </div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Kreiranje investicionog fonda</h1>
              <p className={styles.pageDesc}>
                Popunite podatke za novi investicioni fond.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="page-anim" style={{ marginBottom: 16 }}>
            <Alert tip="greska" poruka={submitError} />
          </div>
        )}

        {/* Form card */}
        <div className={`page-anim ${styles.formCard}`}>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Podaci o fondu</h2>

            {/* Naziv */}
            <div className={styles.field}>
              <label className={styles.label}>
                Naziv fonda <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                type="text"
                placeholder="npr. Globalni rast"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                disabled={submitting}
              />
              {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
            </div>

            {/* Opis */}
            <div className={styles.field}>
              <label className={styles.label}>
                Kratak opis <span className={styles.required}>*</span>
              </label>
              <textarea
                className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                placeholder="Kratki opis investicione strategije i ciljeva fonda..."
                rows={4}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                disabled={submitting}
              />
              {errors.description && <span className={styles.errorMsg}>{errors.description}</span>}
            </div>

            {/* Min iznos */}
            <div className={styles.field}>
              <label className={styles.label}>
                Minimalni iznos ulaganja (RSD) <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${errors.minimumInvestment ? styles.inputError : ''}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="npr. 10000"
                value={form.minimumInvestment}
                onChange={e => set('minimumInvestment', e.target.value)}
                disabled={submitting}
              />
              {errors.minimumInvestment && (
                <span className={styles.errorMsg}>{errors.minimumInvestment}</span>
              )}
            </div>

            {/* Menadžer */}
            <div className={styles.field}>
              <label className={styles.label}>Menadžer fonda</label>
              {loadingSupers ? (
                <div className={styles.input} style={{ color: 'var(--tx-3)', cursor: 'default' }}>
                  Učitavanje...
                </div>
              ) : supervisors.length === 0 ? (
                <input
                  className={styles.input}
                  type="text"
                  value={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.email || '—'}
                  readOnly
                  disabled
                />
              ) : (
                <select
                  className={styles.input}
                  value={form.managerId}
                  onChange={e => set('managerId', e.target.value)}
                  disabled={submitting}
                >
                  {supervisors.map(s => (
                    <option key={s.id} value={String(s.id)}>
                      {`${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || s.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

          </div>

          {/* Actions */}
          <div className={styles.formActions}>
            <Link to="/investment-funds" className={styles.btnCancel}>
              Otkaži
            </Link>
            <button
              className={styles.btnSubmit}
              onClick={handleSubmit}
              disabled={submitting || loadingSupers}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner} />
                  Kreiranje...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Kreiraj fond
                </>
              )}
            </button>
          </div>

        </div>

      </main>
    </div>
  );
}
