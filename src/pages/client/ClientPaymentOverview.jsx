import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import gsap from 'gsap';
import { useFetch } from '../../hooks/useFetch';
import { paymentsApi } from '../../api/endpoints/payments';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../../components/ui/Spinner';
import ClientHeader from '../../components/layout/ClientHeader';
import styles from './ClientPaymentOverview.module.css';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
}

function formatAmount(amount, currency = 'RSD') {
  return Number(amount ?? 0).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
}

const STATUS_MAP = {
  'completed':   { cls: 'statusGreen', label: 'Realizovano' },
  'COMPLETED':   { cls: 'statusGreen', label: 'Realizovano' },
  'SUCCESS':     { cls: 'statusGreen', label: 'Realizovano' },
  'processing':  { cls: 'statusGray',  label: 'U obradi' },
  'pending':     { cls: 'statusGray',  label: 'U obradi' },
  'PENDING':     { cls: 'statusGray',  label: 'U obradi' },
  'IN_PROGRESS': { cls: 'statusGray',  label: 'U obradi' },
  'failed':      { cls: 'statusRed',   label: 'Odbijeno' },
  'rejected':    { cls: 'statusRed',   label: 'Odbijeno' },
  'FAILED':      { cls: 'statusRed',   label: 'Odbijeno' },
  'REJECTED':    { cls: 'statusRed',   label: 'Odbijeno' },
};

function StatusBadge({ status }) {
  const mapped = STATUS_MAP[status] ?? { cls: 'statusGray', label: status ?? '—' };
  return <span className={`${styles.badge} ${styles[mapped.cls]}`}>{mapped.label}</span>;
}

/* ═══════════════════════════════════════════
   TRANSACTION DETAILS MODAL
   ═══════════════════════════════════════════ */
function TransactionModal({ tx, onClose }) {
  if (!tx) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Detalji transakcije</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <InfoRow label="Račun platioca" value={tx.payer_account_number ?? tx.sender_account ?? '—'} />
          <InfoRow label="Račun primaoca" value={tx.recipient_account_number ?? tx.recipient_account ?? '—'} />
          <div className={styles.divider} />
          <InfoRow label="Šifra plaćanja" value={tx.payment_code ?? tx.code ?? '—'} />
          <InfoRow label="Poziv na broj" value={tx.reference_number ?? tx.reference ?? '—'} />
          <InfoRow label="Svrha" value={tx.purpose ?? tx.description ?? '—'} />
          <div className={styles.divider} />
          <InfoRow label="Iznos" value={formatAmount(tx.amount, tx.currency)} highlight />
          <InfoRow label="Provizija" value={formatAmount(tx.fee ?? 0, tx.currency)} />
          <div className={styles.divider} />
          <InfoRow label="Datum i vreme" value={formatDateTime(tx.created_at ?? tx.date ?? tx.execution_timestamp)} />
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Status</span>
            <StatusBadge status={tx.status} />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Zatvori</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <strong className={`${styles.infoValue} ${highlight ? styles.infoHighlight : ''}`}>{value}</strong>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function ClientPaymentOverview() {
  useEffect(() => { document.title = 'RAFBank | Plaćanja'; }, []);
  const pageRef = useRef(null);
  const clientId = useAuthStore(s => s.user?.client_id ?? s.user?.id);

  const [activeTab, setActiveTab] = useState('payments');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedTx, setSelectedTx] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    amountFrom: '',
    amountTo: '',
  });

  const { data, loading, error } = useFetch(
    () => {
      const params = { page, page_size: pageSize };
      if (activeTab === 'exchange') params.type = 'exchange';
      if (activeTab === 'payments') params.type = 'payment';
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.start_date = filters.dateFrom;
      if (filters.dateTo) params.end_date = filters.dateTo;
      if (filters.amountFrom) params.min_amount = filters.amountFrom;
      if (filters.amountTo) params.max_amount = filters.amountTo;
      return paymentsApi.getAll(clientId, params);
    },
    [activeTab, page, filters, clientId]
  );

  const transactions = data?.data ?? [];
  const totalPages = data?.total_pages ?? 0;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.po-anim', { opacity: 0, y: 20, duration: 0.45, stagger: 0.08, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setPage(1);
  }

  return (
    <>
      <ClientHeader activeNav="payments" />
      <div ref={pageRef} className={styles.page}>
      {/* Top bar */}
      <div className={`po-anim ${styles.topBar}`}>
        <div>
          <h1 className={styles.title}>Pregled plaćanja</h1>
          <p className={styles.subtitle}>Istorija svih transakcija i menjačkih poslova</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`po-anim ${styles.tabs}`}>
        <button
          className={`${styles.tab} ${activeTab === 'payments' ? styles.tabActive : ''}`}
          onClick={() => switchTab('payments')}
        >
          Plaćanja
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'exchange' ? styles.tabActive : ''}`}
          onClick={() => switchTab('exchange')}
        >
          Menjačnica
        </button>
      </div>

      {/* Filters */}
      <div className={`po-anim ${styles.filtersCard}`}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label>Status</label>
            <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}>
              <option value="">Svi statusi</option>
              <option value="completed">Realizovano</option>
              <option value="processing">U obradi</option>
              <option value="failed">Odbijeno</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Od datuma</label>
            <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label>Do datuma</label>
            <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label>Min iznos</label>
            <input type="number" min="0" placeholder="0" value={filters.amountFrom} onChange={e => updateFilter('amountFrom', e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label>Max iznos</label>
            <input type="number" min="0" placeholder="∞" value={filters.amountTo} onChange={e => updateFilter('amountTo', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`po-anim ${styles.tableCard}`}>
        {loading ? (
          <div className={styles.loadingWrap}><Spinner /></div>
        ) : error ? (
          <div className={styles.emptyWrap}>Greška pri učitavanju transakcija.</div>
        ) : transactions.length === 0 ? (
          <div className={styles.emptyWrap}>Nema transakcija za prikaz.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Datum i vreme</th>
                    <th>Primalac / Svrha</th>
                    <th style={{ textAlign: 'right' }}>Iznos</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => {
                    const isExchange = tx.type === 'exchange' || activeTab === 'exchange';
                    const displayName = isExchange
                      ? `Menjačnica (${tx.from_currency ?? 'RSD'} → ${tx.to_currency ?? 'EUR'})`
                      : (tx.recipient_name ?? tx.recipient ?? tx.purpose ?? '—');
                    return (
                      <tr key={tx.id ?? tx.payment_id} className={styles.row} onClick={() => setSelectedTx(tx)}>
                        <td className={styles.dateCell}>
                          {formatDateTime(tx.created_at ?? tx.date)}
                        </td>
                        <td>
                          <div className={styles.recipientName}>{displayName}</div>
                          <div className={styles.txType}>
                            {isExchange ? '🔄 Menjačnica' : '💸 Plaćanje'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }} className={styles.amountCell}>
                          {tx.amount < 0 ? '' : '-'}{formatAmount(tx.amount, tx.currency)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <StatusBadge status={tx.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  ← Prethodna
                </button>
                <span className={styles.pageInfo}>Strana {page} od {totalPages}</span>
                <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Sledeća →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
    </>
  );
}
