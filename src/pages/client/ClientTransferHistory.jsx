import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { useNavigate }  from 'react-router-dom';
import gsap             from 'gsap';
import { useAuthStore } from '../../store/authStore';
import { transfersApi } from '../../api/endpoints/transfers';
import { useFetch }     from '../../hooks/useFetch';
import Spinner          from '../../components/ui/Spinner';
import ClientHeader     from '../../components/layout/ClientHeader';
import styles           from './ClientTransferHistory.module.css';

function formatAmount(amount, currency = '') {
  const formatted = new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount ?? 0));
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
  );
}

function shortAccount(num) {
  if (!num) return '—';
  return `••••${String(num).slice(-4)}`;
}

export default function ClientTransferHistory() {
  useEffect(() => { document.title = 'RAFBank | Istorija transfera'; }, []);
  const pageRef  = useRef(null);
  const navigate = useNavigate();
  const clientId = useAuthStore(s => s.user?.client_id ?? s.user?.id);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, loading, error } = useFetch(
    () => transfersApi.getHistory(clientId, { page, page_size: PAGE_SIZE }),
    [clientId, page]
  );

  const rawTransfers = data?.data ?? (Array.isArray(data) ? data : []);
  const totalPages   = data?.total_pages ?? 0;

  const transfers = [...rawTransfers].sort((a, b) =>
    new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)
  );

  // GSAP entry animacija — ista kao na ostalim klijentskim stranicama
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.th-anim', { opacity: 0, y: 20, duration: 0.45, ease: 'power2.out', stagger: 0.07 });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className={styles.page}>
      <ClientHeader activeNav="transfers" />

      <div className={styles.content}>
        <div className={`th-anim ${styles.pageHead}`}>
          <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>← Nazad</button>
          <div>
            <h1 className={styles.pageTitle}>Istorija transfera</h1>
            <p className={styles.pageSub}>Svi vaši transferi, sortirani od najnovijeg ka najstarijem.</p>
          </div>
        </div>

        <div className={`th-anim ${styles.tableCard}`}>
          {loading ? (
            <div className={styles.spinnerWrap}><Spinner /></div>
          ) : error ? (
            <div className={styles.empty}>Greška pri učitavanju transfera.</div>
          ) : transfers.length === 0 ? (
            <div className={styles.empty}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--tx-3)" strokeWidth="1.5">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              <p>Nema transfera za prikaz.</p>
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Datum i vreme</th>
                      <th>Sa računa</th>
                      <th>Na račun</th>
                      <th style={{ textAlign: 'right' }}>Poslato</th>
                      <th style={{ textAlign: 'right' }}>Primljeno</th>
                      <th style={{ textAlign: 'right' }}>Provizija</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((tx) => (
                      <tr key={tx.transfer_id ?? tx.transaction_id}>
                        <td className={styles.tdDate}>{formatDateTime(tx.created_at)}</td>
                        <td className={styles.tdAccount}>{shortAccount(tx.from_account_number)}</td>
                        <td className={styles.tdAccount}>{shortAccount(tx.to_account_number)}</td>
                        <td className={styles.debit} style={{ textAlign: 'right' }}>
                          -{formatAmount(tx.initial_amount)}
                        </td>
                        <td className={styles.credit} style={{ textAlign: 'right' }}>
                          +{formatAmount(tx.final_amount)}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--tx-3)', fontSize: 12 }}>
                          {formatAmount(tx.commission)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prethodna</button>
                  <span className={styles.pageNum}>Strana {page} od {totalPages}</span>
                  <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sledeća →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
