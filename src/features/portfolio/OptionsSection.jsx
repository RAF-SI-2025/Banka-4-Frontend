import { useState, useEffect } from 'react';
import { portfolioApi } from '../../api/endpoints/portfolio';
import { accountsApi } from '../../api/endpoints/accounts';
import styles from './PortfolioTable.module.css';

function ExerciseModal({ option, onClose, onSuccess, actId }) {
  const [accounts, setAccounts]           = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading]             = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError]                 = useState('');

  useEffect(() => {
    accountsApi.getBankAccounts()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setAccounts(list);
      })
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, []);

  async function handleConfirm() {
    if (!selectedAccount) { setError('Izaberite račun.'); return; }
    try {
      setLoading(true);
      setError('');
      await portfolioApi.exerciseActuaryOption(actId, option.id ?? option.asset_id, selectedAccount);
      onSuccess(option.ticker);
    } catch (err) {
      setError(err?.message ?? 'Greška pri iskorišćavanju opcije. Proverite da li je opcija in-the-money.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Exercise opcije</h3>
            <p className={styles.modalSubtitle}>{option.ticker} — Strike: ${option.strike}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label>Račun za plaćanje <span style={{ color: 'var(--red, red)' }}>*</span></label>
            {loadingAccounts ? (
              <select disabled><option>Učitavanje računa...</option></select>
            ) : (
              <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
                <option value="">Izaberite račun...</option>
                {accounts.map((a, i) => {
                  const num  = a.AccountNumber ?? a.account_number ?? a.accountNumber ?? a.number ?? '';
                  const name = a.Name ?? a.name ?? `Račun ${i + 1}`;
                  const bal  = a.Balance ?? a.balance ?? a.AvailableBalance ?? a.available_balance;
                  const cur  = a.Currency?.Code ?? a.currency ?? '';
                  return (
                    <option key={num || i} value={num}>
                      {name}{num ? ` — ${num}` : ''}
                      {bal != null ? ` (${Number(bal).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}${cur ? ` ${cur}` : ''})` : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {error && <p className={styles.errorText}>{error}</p>}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn ?? styles.btnGhost} onClick={onClose} disabled={loading}>
            Otkaži
          </button>
          <button
            className={styles.exerciseBtn}
            onClick={handleConfirm}
            disabled={loading || !selectedAccount || loadingAccounts}
          >
            {loading ? 'Obrada...' : 'Potvrdi Exercise'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OptionsSection({ assets = [], canExercise, actId }) {
  const [exerciseModal, setExerciseModal] = useState(null);
  const [successMsg, setSuccessMsg]       = useState('');

  function isExpired(settlementDate) {
    return new Date() > new Date(settlementDate);
  }

  function handleSuccess(ticker) {
    setExerciseModal(null);
    setSuccessMsg(`Opcija ${ticker} je uspešno iskorišćena!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  }

  return (
    <>
      {successMsg && (
        <div className={styles.successBanner ?? styles.successMsg} style={{ padding: '10px 16px', marginBottom: 12, background: 'var(--green-bg, #0d2b1a)', color: 'var(--green, #4ade80)', borderRadius: 8 }}>
          ✓ {successMsg}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>TIKERI</th>
              <th>TIP</th>
              <th>UDARNA CENA</th>
              <th>TRENUTNA CENA</th>
              <th>ISTEK</th>
              <th>STATUS</th>
              {canExercise && <th style={{ textAlign: 'right' }}>AKCIJE</th>}
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={canExercise ? 7 : 6} style={{ textAlign: 'center', padding: '32px', color: 'var(--tx-3)' }}>
                  Trenutno nema dostupnih opcija.
                </td>
              </tr>
            ) : (
              assets.map((opt) => {
                const expired    = isExpired(opt.settlement);
                const canExerciseThis = canExercise && opt.status === 'ITM' && !expired;

                return (
                  <tr key={opt.id ?? opt.asset_id} className={expired ? styles.expiredRow : ''}>
                    <td className={styles.ticker}>{opt.ticker}</td>
                    <td>{opt.optionType ?? opt.option_type ?? 'CALL'}</td>
                    <td>${opt.strike}</td>
                    <td>${opt.current ?? opt.price}</td>
                    <td className={expired ? styles.neg : ''}>
                      {opt.settlement} {expired && '(Isteklo)'}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${opt.status === 'ITM' ? styles.itm : styles.otm}`}>
                        {opt.status}
                      </span>
                    </td>
                    {canExercise && (
                      <td style={{ textAlign: 'right' }}>
                        {canExerciseThis ? (
                          <button
                            className={styles.exerciseBtn}
                            onClick={() => setExerciseModal(opt)}
                          >
                            EXERCISE
                          </button>
                        ) : (
                          <span className={styles.naText}>N/A</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {exerciseModal && (
        <ExerciseModal
          option={exerciseModal}
          actId={actId}
          onClose={() => setExerciseModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
