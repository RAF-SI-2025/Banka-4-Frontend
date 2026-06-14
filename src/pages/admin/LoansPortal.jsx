import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import gsap                                   from 'gsap';
import { useFetch }                           from '../../hooks/useFetch';
import { loansApi }                           from '../../api/endpoints/loans';
import Navbar                                 from '../../components/layout/Navbar';
import Spinner                                from '../../components/ui/Spinner';
import Alert                                  from '../../components/ui/Alert';
import LoanRequestsTable                      from '../../features/loans/LoanRequestsTable';
import LoanRateSection                        from '../../features/loans/LoanRateSection';
import styles                                 from './LoansPortal.module.css';

export default function LoansPortal() {
  useEffect(() => { document.title = 'RAFBank | Portal kredita'; }, []);
  const pageRef = useRef(null);

  const { data, loading, error, refetch } = useFetch(() => loansApi.getRequests());
  const requests = data?.data ?? [];

  const [actionId,      setActionId]      = useState(null);
  const [actionError,   setActionError]   = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  async function handleApprove(id) {
    setActionId(id);
    setActionError(null);
    setActionSuccess(null);
    try {
      // Backend: kreira Loan, generiše anuitetni plan, prebacuje sredstva,
      // loguje u admin_audit_trail
      await loansApi.approve(id);
      setActionSuccess('Zahtev odobren. Kredit je kreiran i sredstva su prebačena na račun klijenta.');
      refetch();
    } catch (err) {
      setActionError(err?.response?.data?.error ?? err?.message ?? 'Greška pri odobravanju.');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id) {
    setActionId(id);
    setActionError(null);
    setActionSuccess(null);
    try {
      await loansApi.reject(id);
      setActionSuccess('Kreditni zahtev je odbijen.');
      refetch();
    } catch (err) {
      setActionError(err?.response?.data?.error ?? err?.message ?? 'Greška pri odbijanju.');
    } finally {
      setActionId(null);
    }
  }

  const [rateSaving,  setRateSaving]  = useState(false);
  const [rateError,   setRateError]   = useState(null);
  const [rateSuccess, setRateSuccess] = useState(null);

  async function handleRateUpdate(referenceRate) {
    setRateSaving(true);
    setRateError(null);
    setRateSuccess(null);
    try {
      await loansApi.updateRate({ reference_rate: referenceRate });
      setRateSuccess(`Referentna stopa ažurirana na ${referenceRate}%. Svi varijabilni krediti su ažurirani.`);
    } catch (err) {
      setRateError(err?.response?.data?.error ?? err?.message ?? 'Greška pri ažuriranju stope.');
    } finally {
      setRateSaving(false);
    }
  }

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', { opacity: 0, y: 20, duration: 0.45, stagger: 0.07, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />
      <main className={styles.sadrzaj}>

        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Admin</span><span className={styles.sep}>›</span>
            <span className={styles.current}>Portal za kredite</span>
          </div>
          <h1 className={styles.title}>Portal za kredite</h1>
          <p className={styles.desc}>
            Obrada kreditnih zahteva i upravljanje varijabilnim kamatnim stopama.
          </p>
        </div>

        <section className="page-anim">
          <div className={styles.sectionHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" width="15" height="15">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            A. Kreditni zahtevi
          </div>

          {actionSuccess && <Alert tip="uspeh"  poruka={actionSuccess} />}
          {actionError   && <Alert tip="greska" poruka={actionError} />}

          {loading && <Spinner />}
          {!loading && error && (
            <Alert tip="greska" poruka={error?.response?.data?.error ?? 'Greška pri učitavanju zahteva.'} />
          )}
          {!loading && !error && (
            <LoanRequestsTable
              requests={requests}
              onApprove={handleApprove}
              onReject={handleReject}
              actionId={actionId}
            />
          )}
        </section>

        <section className="page-anim">
          <div className={styles.sectionHeader}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" width="15" height="15">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            B. Upravljanje varijabilnim stopama
          </div>

          <LoanRateSection
            onUpdate={handleRateUpdate}
            saving={rateSaving}
            saveError={rateError}
            saveSuccess={rateSuccess}
          />
        </section>

      </main>
    </div>
  );
}
