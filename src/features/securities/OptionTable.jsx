import { useState, useMemo } from 'react';
import styles from './OptionTable.module.css';
import React from "react";
import Toast from '../../components/ui/Toast';

function fmt(n, d = 2) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

function fmtVol(n) {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function OptionTable({ options, currentPrice, canExercise }) {
  const [selectedExpiry, setSelectedExpiry] = useState(options[0]?.settlementDate ?? null);
  const [strikeCount, setStrikeCount] = useState(4);
  const [toastMsg, setToastMsg] = useState(null);

  const expiryGroup = useMemo(
    () => options.find(g => g.settlementDate === selectedExpiry),
    [options, selectedExpiry]
  );

  const allStrikes = expiryGroup?.strikes ?? [];

  const sharedIdx = useMemo(() => {
    const idx = allStrikes.findIndex(s => s.strike >= currentPrice);
    if (idx === -1) return allStrikes.length; 
    return idx;
  }, [allStrikes, currentPrice]);

  const visibleStrikes = useMemo(() => {
    if (!allStrikes.length) return [];

    const above = allStrikes.slice(0, sharedIdx);  
    const below = allStrikes.slice(sharedIdx);     

    const visAbove = above.slice(-strikeCount);    
    const visBelow = below.slice(0, strikeCount);  

    return [...visAbove, ...visBelow];
  }, [allStrikes, sharedIdx, strikeCount]);

  const now = new Date();
  const canExerciseOption = (strike) =>
    canExercise &&
    new Date(selectedExpiry) > now &&
    strike.call?.last > 0; // placeholder ITM check

  if (!options || options.length === 0) {
    return (
      <div className={styles.empty}>
        Nema dostupnih opcija za ovu akciju.
      </div>
    );
  }

  const firstBelowStrike = visibleStrikes.find(s => s.strike >= currentPrice);

  return (
    <div className={styles.wrapper}>
      {/* Expiry date selector */}
      <div className={styles.toolbar}>
        <div className={styles.expiryTabs}>
          {options.map(g => {
            const days = daysUntil(g.settlementDate);
            const expired = days === 0;
            return (
              <button
                key={g.settlementDate}
                className={`${styles.expiryTab} ${selectedExpiry === g.settlementDate ? styles.expiryActive : ''} ${expired ? styles.expired : ''}`}
                onClick={() => setSelectedExpiry(g.settlementDate)}
              >
                {g.settlementDate ? new Date(g.settlementDate).toLocaleDateString('sr-RS') : '—'}
                <span className={styles.daysLeft}>{expired ? 'Expired' : `${days}d`}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.strikeControl}>
          <label>Strikes ±</label>
          <select
            className={styles.strikeSelect}
            value={strikeCount}
            onChange={e => setStrikeCount(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value={999}>Svi</option>
          </select>
        </div>
      </div>

      {/* Shared price banner */}
      <div className={styles.sharedPriceBanner}>
        <span>Tržišna cena akcije (Shared Price)</span>
        <strong>${fmt(currentPrice)}</strong>
      </div>

      {/* Options table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th colSpan={6} className={`${styles.th} ${styles.callsHeader}`}>CALLS</th>
              <th className={`${styles.th} ${styles.strikeHeader}`}>STRIKE</th>
              <th colSpan={6} className={`${styles.th} ${styles.putsHeader}`}>PUTS</th>
              {canExercise && <th className={styles.th}></th>}
            </tr>
            <tr>
              {['Last','Theta','Bid','Ask','Vol','OI'].map(h => (
                <th key={`c-${h}`} className={`${styles.th} ${styles.subHeader} ${styles.callCol}`}>{h}</th>
              ))}
              <th className={`${styles.th} ${styles.subHeader} ${styles.strikeHeader}`}>$</th>
              {['Last','Theta','Bid','Ask','Vol','OI'].map(h => (
                <th key={`p-${h}`} className={`${styles.th} ${styles.subHeader} ${styles.putCol}`}>{h}</th>
              ))}
              {canExercise && <th className={styles.th}></th>}
            </tr>
          </thead>
          <tbody>
            {visibleStrikes.map((row) => {
              const isFirstBelow = row === firstBelowStrike;
              const isITMCall  = row.strike < currentPrice;
              const isITMPut   = row.strike > currentPrice;
              const canEx      = canExerciseOption(row);

              return (
                <React.Fragment key={row.strike}>
                  {/* Banner se prikazuje PRE prvog strike-a ispod currentPrice */}
                  {isFirstBelow && (
                    <tr className={styles.sharedRow}>
                      <td colSpan={canExercise ? 14 : 13} className={styles.sharedCell}>
                        ▼ Shared Price: <strong>${fmt(currentPrice)}</strong>
                      </td>
                    </tr>
                  )}
                  <tr className={styles.optionRow}>
                    {/* CALLS */}
                    <td className={`${styles.td} ${isITMCall ? styles.itm : styles.otm}`}>{fmt(row.call?.last)}</td>
                    <td className={`${styles.td} ${isITMCall ? styles.itm : styles.otm}`}>{fmt(row.call?.theta, 4)}</td>
                    <td className={`${styles.td} ${isITMCall ? styles.itm : styles.otm}`}>{fmt(row.call?.bid)}</td>
                    <td className={`${styles.td} ${isITMCall ? styles.itm : styles.otm}`}>{fmt(row.call?.ask)}</td>
                    <td className={`${styles.td} ${isITMCall ? styles.itm : styles.otm}`}>{fmtVol(row.call?.volume)}</td>
                    <td className={`${styles.td} ${isITMCall ? styles.itm : styles.otm}`}>{fmtVol(row.call?.oi)}</td>

                    {/* STRIKE */}
                    <td className={`${styles.td} ${styles.strikeCell}`}>${fmt(row.strike, 0)}</td>

                    {/* PUTS */}
                    <td className={`${styles.td} ${isITMPut ? styles.itm : styles.otm}`}>{fmt(row.put?.last)}</td>
                    <td className={`${styles.td} ${isITMPut ? styles.itm : styles.otm}`}>{fmt(row.put?.theta, 4)}</td>
                    <td className={`${styles.td} ${isITMPut ? styles.itm : styles.otm}`}>{fmt(row.put?.bid)}</td>
                    <td className={`${styles.td} ${isITMPut ? styles.itm : styles.otm}`}>{fmt(row.put?.ask)}</td>
                    <td className={`${styles.td} ${isITMPut ? styles.itm : styles.otm}`}>{fmtVol(row.put?.volume)}</td>
                    <td className={`${styles.td} ${isITMPut ? styles.itm : styles.otm}`}>{fmtVol(row.put?.oi)}</td>

                    {canExercise && (
                      <td className={styles.td}>
                        {canEx && (
                          <button
                            className={styles.exerciseBtn}
                            onClick={() => setToastMsg(`Exercise opcije za strike $${row.strike} — funkcionalnost uskoro dostupna.`)}
                          >
                            Exercise
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItm}>■ In-The-Money (ITM)</span>
        <span className={styles.legendOtm}>■ Out-of-Money (OTM)</span>
      </div>

      <Toast open={!!toastMsg} message={toastMsg} onClose={() => setToastMsg(null)} />
    </div>
  );
}