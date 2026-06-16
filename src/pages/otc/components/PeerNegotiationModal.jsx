import { useState, useEffect } from 'react';
import { peerOtcApi, isMyTurnPeer, getPeerCounterparty, peerCounterpartyLabel } from '../../../api/endpoints/peerOtc';
import styles from '../OtcPortalPage.module.css';

const CURRENCIES = ['RSD', 'EUR', 'USD', 'CHF', 'JPY', 'AUD', 'CAD', 'GBP'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('sr-RS');
}

export default function PeerNegotiationModal({ negotiation, user, onClose, onRefresh }) {
  const [mode, setMode] = useState('view');
  const [counterForm, setCounterForm] = useState({
    amount: negotiation.offer?.amount ?? '',
    pricePerStock: negotiation.offer?.pricePerUnit?.amount ?? '',
    priceCurrency: negotiation.offer?.pricePerUnit?.currency ?? 'EUR',
    premium: negotiation.offer?.premium?.amount ?? '',
    premiumCurrency: negotiation.offer?.premium?.currency ?? 'EUR',
    settlementDate: negotiation.offer?.settlementDate
      ? negotiation.offer.settlementDate.slice(0, 10)
      : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [counterpartyInfo, setCounterpartyInfo] = useState(null);

  const { id, status, offer } = negotiation;
  const rn = id?.routingNumber;
  const negId = id?.id;
  const isOngoing = status === 'ongoing';
  const myTurn = isMyTurnPeer(offer, user);
  const { role, foreignBankId } = getPeerCounterparty(offer);

  useEffect(() => {
    if (!foreignBankId?.routingNumber || !foreignBankId?.id) return;
    peerOtcApi.getPeerUser(foreignBankId.routingNumber, foreignBankId.id)
      .then(res => setCounterpartyInfo(res))
      .catch(() => {});
  }, []);

  function setField(key, value) {
    setCounterForm(prev => ({ ...prev, [key]: value }));
  }

  function getCounterpartyLabel() {
    return peerCounterpartyLabel(role, counterpartyInfo, foreignBankId);
  }

  async function handleAccept() {
    try {
      setLoading(true);
      setError('');
      await peerOtcApi.acceptNegotiation(rn, negId);
      setSuccess('Ponuda je uspešno prihvaćena.');
      await onRefresh();
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err?.message ?? 'Greška pri prihvatanju ponude.');
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdraw() {
    try {
      setLoading(true);
      setError('');
      await peerOtcApi.withdrawNegotiation(rn, negId);
      setSuccess('Povukli ste se iz pregovora.');
      await onRefresh();
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err?.message ?? 'Greška pri povlačenju iz pregovora.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCounter() {
    if (!counterForm.amount || Number(counterForm.amount) < 1) {
      setError('Količina mora biti najmanje 1.');
      return;
    }
    if (!counterForm.pricePerStock || Number(counterForm.pricePerStock) <= 0) {
      setError('Cena po akciji mora biti pozitivna.');
      return;
    }
    if (!counterForm.settlementDate) {
      setError('Datum poravnanja je obavezan.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await peerOtcApi.counterNegotiation(rn, negId, {
        amount: Number(counterForm.amount),
        pricePerStock: Number(counterForm.pricePerStock),
        priceCurrency: counterForm.priceCurrency,
        premium: Number(counterForm.premium) || 0,
        premiumCurrency: counterForm.premiumCurrency,
        settlementDate: `${counterForm.settlementDate}T00:00:00Z`,
      });
      setSuccess('Kontraponuda je uspešno poslata.');
      await onRefresh();
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err?.message ?? 'Greška pri slanju kontraponude.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            Peer pregovor — {offer?.stock?.ticker ?? '—'}
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 999,
                background: '#3b82f6',
                color: 'white',
                verticalAlign: 'middle',
              }}
            >
              PEER
            </span>
          </h3>
          <button className={styles.closeIconButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          {success && <div className={styles.successBanner}>{success}</div>}
          {error && <p className={styles.errorText}>{error}</p>}

          {mode === 'view' && (
            <>
              <div className={styles.summaryGrid}>
                {[
                  ['Ticker', offer?.stock?.ticker ?? '—'],
                  ['Količina', offer?.amount ?? '—'],
                  ['Cena po akciji', offer?.pricePerUnit ? `${Number(offer.pricePerUnit.amount).toFixed(2)} ${offer.pricePerUnit.currency}` : '—'],
                  ['Premija', offer?.premium ? `${Number(offer.premium.amount).toFixed(2)} ${offer.premium.currency}` : '—'],
                  ['Datum poravnanja', formatDate(offer?.settlementDate)],
                  ['Status', status ?? '—'],
                  ['Red', isOngoing ? (myTurn ? 'Vaš red' : 'Čekanje na protivnika') : '—'],
                  ['Pregovara sa', getCounterpartyLabel()],
                ].map(([label, value]) => (
                  <div key={label} className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>{label}:</span>
                    <strong
                      style={label === 'Red' && isOngoing
                        ? { color: myTurn ? '#16a34a' : '#64748b' }
                        : undefined}
                    >
                      {value}
                    </strong>
                  </div>
                ))}
              </div>

              {isOngoing && (
                <div className={styles.formActions}>
                  {myTurn && (
                    <>
                      <button className={styles.btnPrimary} onClick={handleAccept} disabled={loading}>
                        Prihvati
                      </button>
                      <button className={styles.btnGhost} onClick={() => { setMode('counter'); setError(''); }} disabled={loading}>
                        Kontraponuda
                      </button>
                    </>
                  )}
                  <button
                    className={styles.btnGhost}
                    onClick={handleWithdraw}
                    disabled={loading}
                    style={{ color: '#ef4444' }}
                  >
                    Povuci se
                  </button>
                </div>
              )}
            </>
          )}

          {mode === 'counter' && (
            <>
              <div className={styles.field}>
                <label>Količina <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={counterForm.amount}
                  onChange={e => setField('amount', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label>Cena po akciji <span className={styles.required}>*</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ flex: 1 }}
                    value={counterForm.pricePerStock}
                    onChange={e => setField('pricePerStock', e.target.value)}
                    disabled={loading}
                  />
                  <select
                    value={counterForm.priceCurrency}
                    onChange={e => setField('priceCurrency', e.target.value)}
                    disabled={loading}
                    style={{ width: 80 }}
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label>Premija</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ flex: 1 }}
                    value={counterForm.premium}
                    onChange={e => setField('premium', e.target.value)}
                    disabled={loading}
                  />
                  <select
                    value={counterForm.premiumCurrency}
                    onChange={e => setField('premiumCurrency', e.target.value)}
                    disabled={loading}
                    style={{ width: 80 }}
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label>Datum poravnanja <span className={styles.required}>*</span></label>
                <input
                  type="date"
                  value={counterForm.settlementDate}
                  onChange={e => setField('settlementDate', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.formActions}>
                <button className={styles.btnPrimary} onClick={handleCounter} disabled={loading}>
                  {loading ? 'Slanje...' : 'Pošalji kontraponudu'}
                </button>
                <button className={styles.btnGhost} onClick={() => { setMode('view'); setError(''); }} disabled={loading}>
                  Nazad
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
