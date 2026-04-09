import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './FiltersPanel.module.css';

const DEFAULT_FILTERS = {
  exchange: '',
  priceMin: '', priceMax: '',
  bidMin: '', bidMax: '',
  askMin: '', askMax: '',
  volumeMin: '', volumeMax: '',
  settlementDateFrom: '',
  settlementDateTo: '',
};

export default function FiltersPanel({ activeTab, filters, onChange, onReset }) {
  const [open, setOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  function handleChange(key, value) {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  }

  const [validationError, setValidationError] = useState('');

  function validateRanges(f) {
    const ranges = [
      ['priceMin', 'priceMax', 'Cena'],
      ['bidMin', 'bidMax', 'Bid'],
      ['askMin', 'askMax', 'Ask'],
      ['volumeMin', 'volumeMax', 'Volumen'],
    ];
    for (const [minKey, maxKey, label] of ranges) {
      if (f[minKey] !== '' && f[maxKey] !== '' && Number(f[minKey]) > Number(f[maxKey])) {
        return `${label}: minimalna vrednost ne može biti veća od maksimalne.`;
      }
    }
    if (f.settlementDateFrom && f.settlementDateTo && f.settlementDateFrom > f.settlementDateTo) {
      return 'Datum od ne može biti posle datuma do.';
    }
    return '';
  }

  function handleApply() {
    const err = validateRanges(tempFilters);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError('');
    onChange(tempFilters);
    setOpen(false);
  }

  function handleReset() {
    setTempFilters(DEFAULT_FILTERS);
    onReset();
    setOpen(false);
  }

  function handleClose() {
    setTempFilters(filters);
    setOpen(false);
  }

  function handleOpen() {
    setTempFilters(filters);
    setOpen(true);
  }

  const activeCount = Object.values(filters).filter(v => v !== '').length;

  // Portal renders at document.body — fully escapes any stacking context
  const modal = open && createPortal(
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            <h2 className={styles.modalTitle}>Filteri hartija</h2>
            {activeCount > 0 && (
              <span className={styles.activePill}>{activeCount} aktivan</span>
            )}
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Zatvori">✕</button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Berza (prefix)</p>
            <input
              className={styles.input}
              placeholder="npr. NASDAQ, CME..."
              value={tempFilters.exchange}
              onChange={e => handleChange('exchange', e.target.value)}
            />
          </div>

          <div className={styles.rangeGroup}>
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Cena</p>
              <div className={styles.rangeRow}>
                <input className={styles.input} type="number" placeholder="Min" value={tempFilters.priceMin} onChange={e => handleChange('priceMin', e.target.value)} />
                <span className={styles.dash}>—</span>
                <input className={styles.input} type="number" placeholder="Max" value={tempFilters.priceMax} onChange={e => handleChange('priceMax', e.target.value)} />
              </div>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Bid</p>
              <div className={styles.rangeRow}>
                <input className={styles.input} type="number" placeholder="Min" value={tempFilters.bidMin} onChange={e => handleChange('bidMin', e.target.value)} />
                <span className={styles.dash}>—</span>
                <input className={styles.input} type="number" placeholder="Max" value={tempFilters.bidMax} onChange={e => handleChange('bidMax', e.target.value)} />
              </div>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Ask</p>
              <div className={styles.rangeRow}>
                <input className={styles.input} type="number" placeholder="Min" value={tempFilters.askMin} onChange={e => handleChange('askMin', e.target.value)} />
                <span className={styles.dash}>—</span>
                <input className={styles.input} type="number" placeholder="Max" value={tempFilters.askMax} onChange={e => handleChange('askMax', e.target.value)} />
              </div>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Volumen</p>
              <div className={styles.rangeRow}>
                <input className={styles.input} type="number" placeholder="Min" value={tempFilters.volumeMin} onChange={e => handleChange('volumeMin', e.target.value)} />
                <span className={styles.dash}>—</span>
                <input className={styles.input} type="number" placeholder="Max" value={tempFilters.volumeMax} onChange={e => handleChange('volumeMax', e.target.value)} />
              </div>
            </div>
          </div>

          {(activeTab === 'FUTURES' || activeTab === 'OPTIONS') && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Settlement Date (opseg)</p>
              <div className={styles.rangeRow}>
                <input
                  className={styles.input}
                  type="date"
                  placeholder="Od"
                  value={tempFilters.settlementDateFrom}
                  onChange={e => handleChange('settlementDateFrom', e.target.value)}
                />
                <span className={styles.dash}>—</span>
                <input
                  className={styles.input}
                  type="date"
                  placeholder="Do"
                  value={tempFilters.settlementDateTo}
                  onChange={e => handleChange('settlementDateTo', e.target.value)}
                />
              </div>
            </div>
          )}

          {validationError && (
            <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, margin: 0 }}>
              {validationError}
            </p>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.resetBtn} onClick={handleReset}>Resetuj sve</button>
          <div className={styles.footerRight}>
            <button className={styles.cancelBtn} onClick={handleClose}>Zatvori</button>
            <button className={styles.applyBtn} onClick={handleApply}>Primeni filtere</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.toggleBtn} ${activeCount > 0 ? styles.hasFilters : ''}`}
        onClick={handleOpen}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
        Filteri
        {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
      </button>

      {modal}
    </div>
  );
}

export { DEFAULT_FILTERS };