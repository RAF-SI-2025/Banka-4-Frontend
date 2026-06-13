import { useState, useRef, useLayoutEffect, useCallback, useMemo, useEffect } from 'react';
import gsap                from 'gsap';
import { actuariesApi }   from '../../api/endpoints/actuaries';
import Navbar             from '../../components/layout/Navbar';
import Spinner            from '../../components/ui/Spinner';
import Alert              from '../../components/ui/Alert';
import ActuaryFilters     from '../../features/actuaries/ActuaryFilters';
import ActuaryTable       from '../../features/actuaries/ActuaryTable';
import LimitModal         from '../../features/actuaries/LimitModal';
import limitStyles        from '../../features/actuaries/LimitModal.module.css';
import styles             from './ActuariesPage.module.css';

const EMPTY_FILTERS = { email: '', first_name: '', last_name: '', position: '' };

export default function ActuariesPage() {
  useEffect(() => { document.title = 'RAFBank | Aktuari'; }, []);
  const pageRef = useRef(null);

  const [allActuaries, setAllActuaries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const [feedback, setFeedback] = useState(null);

  // Limit modal state
  const [limitOpen,    setLimitOpen]    = useState(false);
  const [limitLoading, setLimitLoading] = useState(false);
  const [selectedActuary, setSelectedActuary] = useState(null);

  // Auto-dismiss feedback after 5 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Reset confirmation modal state
  const [resetTarget,  setResetTarget]  = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const load = useCallback((params = {}) => {
    setLoading(true);
    setFetchError(null);
    // Don't send 'position' to the backend — it's a derived field (is_supervisor/is_agent)
    const { position: _pos, ...apiParams } = params;
    const queryParams = { page: 1, page_size: 100, ...apiParams };
    actuariesApi.getAll(queryParams)
      .then(res => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        setAllActuaries(list);
      })
      .catch(err => setFetchError(err?.response?.data?.error ?? err?.message ?? 'Greška pri učitavanju aktuara.'))
      .finally(() => setLoading(false));
  }, []);

  // Client-side position filter
  const actuaries = useMemo(() => {
    const pos = filters.position.trim().toLowerCase();
    if (!pos) return allActuaries;
    return allActuaries.filter(a => {
      const label = a.is_supervisor ? 'supervizor' : a.is_agent ? 'agent' : '';
      return label.includes(pos);
    });
  }, [allActuaries, filters.position]);

  // Initial load
  useLayoutEffect(() => {
    load();
  }, [load]);

  // Animate on mount
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', { opacity: 0, y: 20, duration: 0.45, stagger: 0.07, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    const params = Object.fromEntries(
      Object.entries(newFilters).filter(([, v]) => v.trim() !== '')
    );
    load(params);
  }

  function handleOpenChangeLimit(actuary) {
    setSelectedActuary(actuary);
    setLimitOpen(true);
  }

  async function handleConfirmLimit(newLimit) {
    setLimitLoading(true);
    try {
      await actuariesApi.changeLimit(selectedActuary.id, newLimit);
      setAllActuaries(prev =>
        prev.map(a => a.id === selectedActuary.id ? { ...a, limit: newLimit } : a)
      );
      setFeedback({ type: 'uspeh', text: 'Limit je uspešno promenjen.' });
      setLimitOpen(false);
    } catch (err) {
      setFeedback({ type: 'greska', text: err?.response?.data?.error ?? err?.message ?? 'Greška pri promeni limita.' });
    } finally {
      setLimitLoading(false);
    }
  }

  function handleResetUsedLimit(actuary) {
    setResetTarget(actuary);
  }

  async function handleConfirmReset() {
    setResetLoading(true);
    try {
      await actuariesApi.resetUsedLimit(resetTarget.id);
      setAllActuaries(prev =>
        prev.map(a => a.id === resetTarget.id ? { ...a, used_limit: 0 } : a)
      );
      setFeedback({ type: 'uspeh', text: `Iskorišćen limit za ${resetTarget.first_name} ${resetTarget.last_name} je resetovan.` });
      setResetTarget(null);
    } catch (err) {
      setFeedback({ type: 'greska', text: err?.response?.data?.error ?? err?.message ?? 'Greška pri resetovanju limita.' });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />
      <main className={styles.sadrzaj}>

        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Admin</span><span className={styles.sep}>›</span>
            <span className={styles.current}>Aktuari</span>
          </div>
          <h1 className={styles.title}>Aktuari</h1>
          <p className={styles.desc}>
            Pregled i upravljanje aktuarima — postavljanje limita i resetovanje iskorišćenih iznosa.
          </p>
        </div>

        <section className="page-anim">
          <ActuaryFilters filters={filters} onFilterChange={handleFilterChange} />
        </section>

        <section className="page-anim">
          {feedback && <Alert tip={feedback.type} poruka={feedback.text} />}

          {loading && <Spinner />}

          {!loading && fetchError && (
            <Alert tip="greska" poruka={fetchError} />
          )}

          {!loading && !fetchError && (
            <ActuaryTable
              actuaries={actuaries}
              onChangeLimit={handleOpenChangeLimit}
              onResetUsedLimit={handleResetUsedLimit}
            />
          )}
        </section>

      </main>

      <LimitModal
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        onConfirm={handleConfirmLimit}
        actuary={selectedActuary}
        loading={limitLoading}
      />

      {resetTarget && (
        <div className={limitStyles.backdrop} onClick={() => setResetTarget(null)}>
          <div className={limitStyles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={limitStyles.title}>Resetuj used limit</h3>
            <p className={limitStyles.subtitle}>
              {resetTarget.first_name} {resetTarget.last_name}
            </p>
            <div className={limitStyles.divider} />
            <p style={{ fontSize: 14, color: 'var(--tx-2)', margin: '0 0 20px' }}>
              Da li ste sigurni da želite da resetujete iskorišćen limit?
            </p>
            <div className={limitStyles.actions}>
              <button className={limitStyles.btnGhost} onClick={() => setResetTarget(null)} disabled={resetLoading}>
                Otkaži
              </button>
              <button className={limitStyles.btnPrimary} onClick={handleConfirmReset} disabled={resetLoading}>
                {resetLoading ? 'Čuvanje...' : 'Potvrdi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
