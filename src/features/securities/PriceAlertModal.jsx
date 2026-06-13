import { useState, useEffect } from 'react';
import { priceAlertApi } from '../../api/endpoints/priceAlerts';
import { usePriceAlertStore } from '../../store/priceAlertStore';
import styles from './PriceAlertModal.module.css';

function fmt(n, d = 2) {
  if (n == null) return '—';
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

export default function PriceAlertModal({ security, onClose }) {
  const [threshold, setThreshold] = useState('');
  const [condition, setCondition] = useState('ABOVE');
  const [thresholdError, setThresholdError] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const bump = usePriceAlertStore(s => s.bump);

  useEffect(() => {
    setLoadingAlerts(true);
    priceAlertApi.getAll()
      .then(res => {
        const all = Array.isArray(res) ? res : (res?.data ?? []);
        setAlerts(all.filter(a => String(a.listing_id) === String(security.id)));
      })
      .catch(() => setAlerts([]))
      .finally(() => setLoadingAlerts(false));
  }, [security.id]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [loading, onClose]);

  function handleBackdrop(e) {
    if (e.target === e.currentTarget && !loading) onClose();
  }

  function validateThreshold(val) {
    const num = parseFloat(val);
    if (!val || isNaN(num) || num <= 0) return 'Unesite validnu cenu (broj veći od 0).';
    return '';
  }

  function handleThresholdChange(e) {
    setThreshold(e.target.value);
    if (thresholdError) setThresholdError(validateThreshold(e.target.value));
  }

  async function handleSubmit() {
    const err = validateThreshold(threshold);
    if (err) { setThresholdError(err); return; }
    setLoading(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const res = await priceAlertApi.create({
        listing_id: security.id,
        threshold: parseFloat(threshold),
        condition,
      });
      const created = Array.isArray(res) ? res[0] : res;
      if (created?.price_alert_id != null) {
        setAlerts(prev => [...prev, created]);
        bump();
      }
      const price = security.price != null ? parseFloat(security.price) : NaN;
      const thr = parseFloat(threshold);
      let successMsg;
      if (!isNaN(price) && condition === 'ABOVE' && price > thr) {
        successMsg = { variant: 'banner', text: 'Cena je već iznad zadatog praga! Očekujte email obaveštenje.' };
      } else if (!isNaN(price) && condition === 'BELOW' && price < thr) {
        successMsg = { variant: 'banner', text: 'Cena je već ispod zadatog praga! Očekujte email obaveštenje.' };
      } else {
        successMsg = { variant: 'hint', text: 'Upozorenje postavljeno. Bićete obavešteni kada cena dostigne prag.' };
      }
      setSubmitSuccess(successMsg);
      setThreshold('');
      setCondition('ABOVE');
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Greška pri kreiranju upozorenja.';
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(alertId) {
    setDeletingId(alertId);
    try {
      await priceAlertApi.delete(alertId);
      setAlerts(prev => prev.filter(a => a.price_alert_id !== alertId));
      bump();
    } catch {
      setSubmitError('Greška pri brisanju upozorenja. Pokušajte ponovo.');
    } finally {
      setDeletingId(null);
    }
  }

  const canSubmit = !loading && threshold !== '' && !thresholdError;

  return (
    <div className={styles.backdrop} onClick={handleBackdrop}>
      <div className={styles.modal}>
        <div className={styles.iconWrap}>
          <BellIcon />
        </div>

        <h2 className={styles.title}>Postavi upozorenje na cenu</h2>

        <div className={styles.securityChip}>
          <span className={styles.securityTicker}>{security.ticker}</span>
          <span className={styles.securityPrice}>
            Trenutna cena: {fmt(security.price)} {security.currency}
          </span>
        </div>

        {submitError && (
          <div className={styles.errorBanner}>{submitError}</div>
        )}

        {submitSuccess?.variant === 'banner' && (
          <div className={styles.successBanner} data-testid="success-banner">
            {submitSuccess.text}
          </div>
        )}
        {submitSuccess?.variant === 'hint' && (
          <div className={styles.successHint} data-testid="success-hint">
            {submitSuccess.text}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Prag cene</label>
          <input
            className={`${styles.input} ${thresholdError ? styles.inputError : ''}`}
            type="number"
            step="0.01"
            min="0"
            placeholder="Unesite cenu..."
            value={threshold}
            onChange={handleThresholdChange}
            onBlur={() => setThresholdError(validateThreshold(threshold))}
          />
          {thresholdError && <span className={styles.errorMsg}>{thresholdError}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Uslov</label>
          <select
            className={styles.select}
            value={condition}
            onChange={e => setCondition(e.target.value)}
          >
            <option value="ABOVE">Iznad (ABOVE)</option>
            <option value="BELOW">Ispod (BELOW)</option>
          </select>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.btnCancel}
            onClick={onClose}
            disabled={loading}
          >
            Otkaži
          </button>
          <button
            className={styles.btnConfirm}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading && <span className={styles.spinner} />}
            Postavi upozorenje
          </button>
        </div>

        <p className={styles.sectionHeading}>Aktivna upozorenja</p>

        {loadingAlerts ? (
          <p className={styles.loadingAlerts}>Učitavanje...</p>
        ) : alerts.length === 0 ? (
          <p className={styles.emptyAlerts}>Nema aktivnih upozorenja za ovu hartiju.</p>
        ) : (
          <div className={styles.alertList}>
            {alerts.map(alert => (
              <div key={alert.price_alert_id} className={styles.alertRow}>
                <div className={styles.alertInfo}>
                  <span className={styles.alertConditionBadge}>
                    {alert.condition === 'ABOVE' ? 'Iznad' : 'Ispod'}
                  </span>
                  <span className={styles.alertThreshold}>
                    {fmt(alert.threshold)} {security.currency}
                  </span>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(alert.price_alert_id)}
                  disabled={deletingId === alert.price_alert_id}
                  title="Obriši upozorenje"
                  data-testid={`delete-alert-${alert.price_alert_id}`}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
