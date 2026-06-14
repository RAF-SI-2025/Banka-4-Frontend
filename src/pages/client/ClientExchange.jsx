import { useRef, useLayoutEffect, useState, useMemo, useEffect } from 'react';
import gsap from 'gsap';
import { exchangeApi } from '../../api/endpoints/exchange';
import { useFetch } from '../../hooks/useFetch';
import Spinner from '../../components/ui/Spinner';
import ClientHeader from '../../components/layout/ClientHeader';
import styles from './ClientSubPage.module.css';

const FLAG_EMOJI = {
  RSD: '🇷🇸', EUR: '🇪🇺', CHF: '🇨🇭', USD: '🇺🇸', GBP: '🇬🇧',
  JPY: '🇯🇵', CAD: '🇨🇦', AUD: '🇦🇺',
};

export default function ClientExchange() {
  useEffect(() => { document.title = 'RAFBank | Menjačnica'; }, []);
  const pageRef = useRef(null);
  const { data: ratesData, loading } = useFetch(() => exchangeApi.getRates(), []);
  const rates = Array.isArray(ratesData?.rates) ? ratesData.rates
    : Array.isArray(ratesData) ? ratesData : [];

  const currencies = useMemo(() => {
    const codes = ['RSD', ...rates.map(r => r.code ?? r.currency)];
    return [...new Set(codes)];
  }, [rates]);

  const [amount, setAmount] = useState(1);
  const [fromCurrency, setFromCurrency] = useState('EUR');
  const [toCurrency, setToCurrency] = useState('RSD');

  // Real-time dynamic calculation
  const result = useMemo(() => {
    if (!rates.length || !amount || amount <= 0) return 0;
    function toRSD(cur, val) {
      if (cur === 'RSD') return val;
      const r = rates.find(x => (x.code ?? x.currency) === cur);
      return r ? val * (r.buy ?? r.buy_rate ?? 0) : 0;
    }
    function fromRSD(cur, val) {
      if (cur === 'RSD') return val;
      const r = rates.find(x => (x.code ?? x.currency) === cur);
      const sell = r?.sell ?? r?.sell_rate ?? 0;
      return sell > 0 ? val / sell : 0;
    }
    return fromRSD(toCurrency, toRSD(fromCurrency, amount));
  }, [amount, fromCurrency, toCurrency, rates]);

  useLayoutEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.from('.sub-card', { opacity: 0, y: 20, duration: 0.45, ease: 'power2.out', stagger: 0.07 });
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  if (loading) return <Spinner />;

  return (
    <>
      <ClientHeader activeNav="exchange" />
      <div ref={pageRef} className={styles.page}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>Menjačnica</h1>
      </div>

      {/* Kursna lista */}
      <div className={`sub-card ${styles.card}`} style={{ display: 'block' }}>
        <h2 className={styles.sectionTitle}>Kursna lista</h2>
        <table className={styles.ratesTable}>
          <thead>
            <tr>
              <th>Valuta</th>
              <th>Kupovni kurs</th>
              <th>Srednji kurs</th>
              <th>Prodajni kurs</th>
            </tr>
          </thead>
          <tbody>
            {rates.map(r => {
              const code = r.code ?? r.currency;
              const buy = r.buy ?? r.buy_rate;
              const sell = r.sell ?? r.sell_rate;
              const mid = r.mid ?? ((buy + sell) / 2);
              return (
                <tr key={code}>
                  <td>
                    <span style={{ marginRight: 8 }}>{FLAG_EMOJI[code] ?? '🏳️'}</span>
                    <strong>{code}</strong>
                  </td>
                  <td>{buy != null ? buy.toFixed(2) : '—'} RSD</td>
                  <td style={{ color: 'var(--blue)', fontWeight: 600 }}>{mid != null ? mid.toFixed(4) : '—'} RSD</td>
                  <td>{sell != null ? sell.toFixed(2) : '—'} RSD</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Kalkulator — proveri ekvivalentnost */}
      <div className={`sub-card ${styles.card} ${styles.formCard}`}>
        <h2 className={styles.sectionTitle}>Kalkulator valuta</h2>
        <p style={{ fontSize: 13, color: 'var(--tx-3)', margin: '-0.5rem 0 0.5rem' }}>
          Proveri ekvivalentnost — rezultat se ažurira u realnom vremenu.
        </p>

        <div className={styles.formField}>
          <label>Iznos</label>
          <input
            type="number"
            min="0.01"
            step="any"
            placeholder="0.00"
            className={styles.formInput}
            value={amount}
            onChange={e => setAmount(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className={styles.formField} style={{ flex: 1 }}>
            <label>Iz valute</label>
            <select className={styles.formInput} value={fromCurrency} onChange={e => setFromCurrency(e.target.value)}>
              {currencies.map(c => (
                <option key={c} value={c}>{FLAG_EMOJI[c] ?? ''} {c}</option>
              ))}
            </select>
          </div>
          <div className={styles.formField} style={{ flex: 1 }}>
            <label>U valutu</label>
            <select className={styles.formInput} value={toCurrency} onChange={e => setToCurrency(e.target.value)}>
              {currencies.map(c => (
                <option key={c} value={c}>{FLAG_EMOJI[c] ?? ''} {c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.calcResult} style={{ textAlign: 'center', fontSize: 20, padding: '1rem' }}>
          {result.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span style={{ marginLeft: 6, fontWeight: 700 }}>{toCurrency}</span>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx-3)', margin: 0 }}>
          {amount > 0 ? `${amount.toLocaleString('sr-RS')} ${fromCurrency}` : '—'}
        </p>
      </div>
    </div>
    </>
  );
}
