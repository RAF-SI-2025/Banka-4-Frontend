import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { loansApi } from '../../api/endpoints/loans';
import { clientsApi } from '../../api/endpoints/clients';
import LoanList           from '../../features/loans/LoanList';
import LoanDetails        from '../../features/loans/LoanDetails';
import LoanRequestsTable  from '../../features/loans/LoanRequestsTable';
import Spinner from '../../components/ui/Spinner';
import Alert   from '../../components/ui/Alert';
import styles from './Loans.module.css';
import Navbar from "../../components/layout/Navbar.jsx";

export default function Loans() {
  useEffect(() => { document.title = 'RAFBank | Krediti'; }, []);
  const pageRef = useRef(null);
  const [tab, setTab] = useState('active'); // 'active' | 'requests'

  // Active loans state
  const [loans, setLoans]               = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [errorLoans, setErrorLoans]     = useState(null);

  // Loan requests state
  const [requests, setRequests]         = useState([]);
  const [loadingReqs, setLoadingReqs]   = useState(true);
  const [errorReqs, setErrorReqs]       = useState(null);
  const [actionId, setActionId]         = useState(null);
  const [actionError, setActionError]   = useState(null);

  useEffect(() => {
    loansApi.getRequests()
      .then(async (res) => {
        const rawRequests = Array.isArray(res) ? res : res?.data ?? [];

        // Fetch all clients and build name map
        const nameMap = {};
        try {
          const clientsRes = await clientsApi.getAll();
          const clientsList = Array.isArray(clientsRes) ? clientsRes : clientsRes?.data ?? [];
          clientsList.forEach(c => {
            nameMap[c.id] = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || `Klijent #${c.id}`;
          });
        } catch {
          // If fetching clients fails, we'll show client IDs instead
        }

        // Attach client names to requests
        const enriched = rawRequests.map(r => ({
          ...r,
          _clientName: nameMap[r.client_id] ?? `Klijent #${r.client_id}`,
        }));

        // Split into active loans (approved) and pending requests
        const active = enriched.filter(r => r.status === 'APPROVED');
        setLoans(active);
        if (active.length > 0) setSelectedLoan(active[0]);
        setLoadingLoans(false);

        setRequests(enriched);
      })
      .catch(() => {
        setErrorLoans('Nije moguće učitati kredite.');
        setErrorReqs('Nije moguće učitati kreditne zahteve.');
      })
      .finally(() => {
        setLoadingLoans(false);
        setLoadingReqs(false);
      });
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity: 0,
        y: 24,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  async function handleApprove(id) {
    setActionId(id);
    setActionError(null);
    try {
      await loansApi.approve(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    } catch (err) {
      setActionError(err?.error ?? err?.message ?? 'Greška pri odobravanju kredita.');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id) {
    setActionId(id);
    setActionError(null);
    try {
      await loansApi.reject(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
    } catch (err) {
      setActionError(err?.error ?? err?.message ?? 'Greška pri odbijanju kredita.');
    } finally {
      setActionId(null);
    }
  }

  return (
    <div ref={pageRef} className={styles.loansPage}>
      <Navbar />
      <div className={styles.pageContent}>
        <header className={`page-anim ${styles.pageHeader}`}>
          <div className={styles.headerTitle}>
            <h1>Krediti</h1>
            <p>Pregled kredita i kreditnih zahteva</p>
          </div>
        </header>

      {/* Tabs */}
      <div className="page-anim" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)' }}>
        {[
          { key: 'active',   label: 'Aktivni krediti' },
          { key: 'requests', label: 'Kreditni zahtevi' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.6rem 1.4rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--blue)' : '2px solid transparent',
              color: tab === t.key ? 'var(--blue)' : 'var(--tx-2)',
              fontWeight: tab === t.key ? 700 : 400,
              cursor: 'pointer',
              marginBottom: '-2px',
              fontSize: '0.95rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={`page-anim ${styles.contentArea}`}>
        {tab === 'active' && (
          loadingLoans ? (
            <div className={styles.center}><Spinner /></div>
          ) : errorLoans ? (
            <div className={styles.center}><Alert type="error" message={errorLoans} /></div>
          ) : (
            <div className={styles.layout}>
              <aside className={styles.masterSide}>
                <LoanList loans={loans} selectedId={selectedLoan?.id} onSelectLoan={setSelectedLoan} />
              </aside>
              <main className={styles.detailSide}>
                {selectedLoan ? (
                  <LoanDetails loan={selectedLoan} />
                ) : loans.length > 0 ? (
                  <div className={styles.emptyState}><p>Izaberite kredit sa leve strane.</p></div>
                ) : null}
              </main>
            </div>
          )
        )}

        {tab === 'requests' && (
          loadingReqs ? (
            <div className={styles.center}><Spinner /></div>
          ) : errorReqs ? (
            <div className={styles.center}><Alert type="error" message={errorReqs} /></div>
          ) : (
            <>
              {actionError && <div style={{marginBottom: '16px'}}><Alert tip="greska" poruka={actionError} /></div>}
              <LoanRequestsTable
                requests={requests}
                onApprove={handleApprove}
                onReject={handleReject}
                actionId={actionId}
              />
            </>
          )
        )}
      </div>
      </div>
    </div>
  );
}
