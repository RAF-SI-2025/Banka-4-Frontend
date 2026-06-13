import { useState, useRef, useEffect } from 'react';
import { priceAlertApi } from '../../api/endpoints/priceAlerts';
import { usePriceAlertStore } from '../../store/priceAlertStore';
import styles from './PriceAlertsWidget.module.css';

function fmt(n, d = 2) {
  if (n == null) return '—';
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

export default function PriceAlertsWidget() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(false);
  const version = usePriceAlertStore(s => s.version);
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    priceAlertApi.getAll()
      .then(res => {
        if (cancelled) return;
        const all = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setAlerts(all);
      })
      .catch(() => {
        if (cancelled) return;
        setAlerts([]);
        setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [version]);

  useEffect(() => {
    if (!open) return;
    function outside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  async function handleDelete(alertId) {
    setDeletingId(alertId);
    setDeleteError(false);
    try {
      await priceAlertApi.delete(alertId);
      setAlerts(prev => prev.filter(a => a.price_alert_id !== alertId));
    } catch {
      setDeleteError(true);
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = alerts.length;

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Moja upozorenja na cenu"
      >
        <BellIcon />
        {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Moja upozorenja</span>
          </div>

          {fetchError && (
            <p className={styles.errorMsg}>Greška pri učitavanju upozorenja.</p>
          )}
          {deleteError && (
            <p className={styles.errorMsg}>Greška pri brisanju. Pokušajte ponovo.</p>
          )}
          {loading ? (
            <p className={styles.loadingMsg}>Učitavanje...</p>
          ) : !fetchError && alerts.length === 0 ? (
            <p className={styles.emptyMsg}>Nema aktivnih upozorenja na cenu.</p>
          ) : !fetchError ? (
            <div className={styles.alertList}>
              {alerts.map(alert => (
                <div key={alert.price_alert_id} className={styles.alertRow}>
                  <div className={styles.alertMeta}>
                    <span className={styles.alertTicker}>{alert.ticker}</span>
                    <div className={styles.alertDetail}>
                      <span className={styles.alertConditionBadge}>
                        {alert.condition === 'ABOVE' ? 'Iznad' : 'Ispod'}
                      </span>
                      <span className={styles.alertThreshold}>
                        {fmt(alert.threshold)}
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(alert.price_alert_id)}
                    disabled={deletingId === alert.price_alert_id}
                    title="Obriši upozorenje"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
