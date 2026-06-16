import { useState } from 'react';
import { getBankName } from '../../../api/endpoints/peerOtc';
import styles from '../OtcPortalPage.module.css';

const CURRENCIES = ['RSD', 'EUR', 'USD', 'CHF', 'JPY', 'AUD', 'CAD', 'GBP'];

export default function PeerOfferModal({ open, ticker, sellerId, accounts, onClose, onSubmit }) {
  const [form, setForm] = useState({
    amount: '',
    pricePerStock: '',
    priceCurrency: 'EUR',
    premium: '',
    premiumCurrency: 'EUR',
    settlementDate: '',
    accountNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.amount || Number(form.amount) < 1) {
      setError('Količina mora biti najmanje 1.');
      return;
    }
    if (!form.pricePerStock || Number(form.pricePerStock) <= 0) {
      setError('Cena po akciji mora biti pozitivna.');
      return;
    }
    if (!form.premium || Number(form.premium) < 0) {
      setError('Premija mora biti nenegativan broj.');
      return;
    }
    if (!form.settlementDate) {
      setError('Datum poravnanja je obavezan.');
      return;
    }
    if (!form.accountNumber) {
      setError('Izaberite račun za poravnanje.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit({
        sellerId,
        ticker,
        amount: Number(form.amount),
        pricePerStock: Number(form.pricePerStock),
        priceCurrency: form.priceCurrency,
        premium: Number(form.premium),
        premiumCurrency: form.premiumCurrency,
        settlementDate: `${form.settlementDate}T00:00:00Z`,
        accountNumber: form.accountNumber,
      });
    } catch (err) {
      setError(err?.message ?? 'Greška pri slanju ponude.');
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Pošalji ponudu — {ticker}</h3>
          <button className={styles.closeIconButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          {error && <p className={styles.errorText}>{error}</p>}

          <div className={styles.summaryGrid}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Ticker:</span>
              <strong>{ticker}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Banka prodavca:</span>
              <strong>{getBankName(sellerId?.routingNumber)}</strong>
            </div>
          </div>

          <div className={styles.field}>
            <label>Količina <span className={styles.required}>*</span></label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label>Cena po akciji <span className={styles.required}>*</span></label>
            <div className={styles.inputWithCurrency}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.pricePerStock}
                onChange={e => set('pricePerStock', e.target.value)}
                disabled={loading}
              />
              <select
                value={form.priceCurrency}
                onChange={e => set('priceCurrency', e.target.value)}
                disabled={loading}
                className={styles.currencySelect}
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Premija <span className={styles.required}>*</span></label>
            <div className={styles.inputWithCurrency}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.premium}
                onChange={e => set('premium', e.target.value)}
                disabled={loading}
              />
              <select
                value={form.premiumCurrency}
                onChange={e => set('premiumCurrency', e.target.value)}
                disabled={loading}
                className={styles.currencySelect}
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Datum poravnanja <span className={styles.required}>*</span></label>
            <input
              type="date"
              value={form.settlementDate}
              onChange={e => set('settlementDate', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label>Vaš račun <span className={styles.required}>*</span></label>
            {accounts.length > 0 ? (
              <select
                value={form.accountNumber}
                onChange={e => set('accountNumber', e.target.value)}
                disabled={loading}
              >
                <option value="">Izaberite račun...</option>
                {accounts.map((a, i) => (
                  <option key={a.number || i} value={a.number}>
                    {a.name}{a.number ? ` — ${a.number}` : ''}
                    {a.balance != null
                      ? ` (${Number(a.balance).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}${a.currency ? ` ${a.currency}` : ''})`
                      : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Unesite broj računa..."
                value={form.accountNumber}
                onChange={e => set('accountNumber', e.target.value)}
                disabled={loading}
              />
            )}
          </div>

          <div className={styles.formActions}>
            <button className={styles.btnGhost} onClick={onClose} disabled={loading}>Otkaži</button>
            <button className={styles.btnPrimary} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Slanje...' : 'Pošalji ponudu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
