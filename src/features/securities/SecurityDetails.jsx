import { useRef, useLayoutEffect, useState, useMemo } from 'react';
import gsap from 'gsap';
import OptionTable from './OptionTable';
import styles from './SecurityDetails.module.css';

const PERIODS = ['1D', '1W', '1M', '1Y', '5Y'];

const TYPE_LABELS = { STOCK: 'Akcija', FUTURES: 'Futures', FOREX: 'Forex par' };

function fmt(n, d = 2) {
  if (n == null) return '—';
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('sr-RS');
}

// Tiny SVG sparkline/chart
function PriceChart({ data, positive }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 600, h = 120;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 10) - 5;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const fillPts = `0,${h} ${polyline} ${w},${h}`;
  const color = positive ? '#10b981' : '#ef4444';
  const fill  = positive ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.08)';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={styles.chartSvg}>
      <polygon points={fillPts} fill={fill} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function SecurityDetails({ security, isEmployee, onAction, onRefresh }) {
  const ref = useRef(null);
  const [period, setPeriod] = useState('1D');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useLayoutEffect(() => {
    if (!security) return;
    const ctx = gsap.context(() => {
      gsap.from('.sd-anim', {
        opacity: 0, y: 16, duration: 0.38,
        stagger: 0.06, ease: 'power2.out',
      });
    }, ref);
    return () => ctx.revert();
  }, [security?.id]);

  const chartData = useMemo(
    () => security?.priceHistory?.[period] ?? [],
    [security, period]
  );

  const positive = (security?.change ?? 0) >= 0;

  async function handleRefresh() {
    if (!security || isRefreshing) return;
    setIsRefreshing(true);

    try {
      if (onRefresh) {
        await onRefresh(security);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    } catch (err) {
      console.error('Security refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }

  if (!security) {
    return (
      <div className={styles.placeholder}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--tx-3)" strokeWidth="1.2">
          <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6"/>
          <path d="M15 5v14a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V5"/>
          <path d="M3 19h18"/>
        </svg>
        <p>Izaberite hartiju za detalje.</p>
      </div>
    );
  }

  const { ticker, name, type, exchange, price, change, changePercent,
          currency, bid, ask, volume, maintenanceMargin, initialMarginCost,
          settlementDate, options } = security;

  const actionLabel = isEmployee ? 'Kreiraj nalog' : 'Kupi';

  return (
    <div ref={ref} className={styles.container}>
      {/* Header */}
      <header className={`sd-anim ${styles.header}`}>
        <div>
          <div className={styles.tickerRow}>
            <span className={styles.ticker}>{ticker}</span>
            <span className={styles.typeBadge}>{TYPE_LABELS[type] ?? type}</span>
            <span className={styles.exchangeBadge}>{exchange}</span>
          </div>
          <p className={styles.secName}>{name}</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.priceBlock}>
            <span className={styles.currentPrice}>{fmt(price)} <span className={styles.priceCurrency}>{currency}</span></span>
            <span className={positive ? styles.up : styles.down}>
              {positive ? '+' : ''}{fmt(change)} ({positive ? '+' : ''}{fmt(changePercent)}%)
            </span>
          </div>
          <div className={styles.headerBtns}>
            <button className={styles.actionBtn} onClick={() => onAction(security)}>
              {actionLabel}
            </button>
            <button
              className={styles.refreshBtn}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              {isRefreshing ? 'Osvežavanje...' : 'Osveži'}
            </button>
          </div>
        </div>
      </header>

      {/* Chart */}
      <section className={`sd-anim ${styles.chartSection}`}>
        <div className={styles.periodTabs}>
          {PERIODS.map(p => (
            <button
              key={p}
              className={`${styles.periodBtn} ${period === p ? styles.periodActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className={styles.chartWrapper}>
          <PriceChart data={chartData} positive={positive} />
          <div className={styles.chartOverlay}>
            <span className={styles.chartHigh}>H: {fmt(Math.max(...(chartData.map(d => d.v))))}</span>
            <span className={styles.chartLow}>L: {fmt(Math.min(...(chartData.map(d => d.v))))}</span>
          </div>
        </div>
      </section>

      {/* Data grid */}
      <section className={`sd-anim ${styles.dataGrid}`}>
        <div className={styles.dataCard}>
          <span>Bid</span>
          <strong>{fmt(bid)}</strong>
        </div>
        <div className={styles.dataCard}>
          <span>Ask</span>
          <strong>{fmt(ask)}</strong>
        </div>
        <div className={styles.dataCard}>
          <span>Volumen</span>
          <strong>{new Intl.NumberFormat('sr-RS').format(volume)}</strong>
        </div>
        <div className={styles.dataCard}>
          <span>Maint. Margin</span>
          <strong>{type === 'FOREX' ? `${(maintenanceMargin * 100).toFixed(0)}%` : fmt(maintenanceMargin)}</strong>
        </div>
        <div className={styles.dataCard}>
          <span>Init. Margin Cost</span>
          <strong>{fmt(initialMarginCost)} {currency}</strong>
        </div>
        {settlementDate && (
          <div className={styles.dataCard}>
            <span>Settlement Date</span>
            <strong>{formatDate(settlementDate)}</strong>
          </div>
        )}
      </section>

      {/* Options — only for STOCK */}
      {type === 'STOCK' && options && options.length > 0 && (
        <section className={`sd-anim ${styles.optionsSection}`}>
          <h3 className={styles.sectionTitle}>Opcije</h3>
          <OptionTable
            options={options}
            currentPrice={price}
            canExercise={isEmployee}
          />
        </section>
      )}
    </div>
  );
}
