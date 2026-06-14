import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import gsap from 'gsap';

import { investmentFundsApi } from '../../api/endpoints/investmentFunds';
import { accountsApi } from '../../api/endpoints/accounts';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';

import ClientHeader from '../../components/layout/ClientHeader';
import Navbar from '../../components/layout/Navbar';
import Alert from '../../components/ui/Alert';
import LineChart from '../../components/ui/LineChart';

import styles from './FundDetailsPage.module.css';
import { getErrorMessage } from '../../utils/apiError';
import { computeMetrics, fmtPct, fmtRatio, MIN_SNAPSHOTS } from '../../utils/fundMetrics';

import { securitiesApi } from '../../api/endpoints/securities';

export default function FundDetailsPage() {
  useEffect(() => { document.title = 'RAFBank | Detalji fonda'; }, []);
  const { id } = useParams();
  const pageRef = useRef(null);

  const user = useAuthStore((s) => s.user);
  const perms = usePermissions();

  const isSupervisor =
    (perms?.isSupervisor ?? false) ||
    Boolean(perms?.can?.('admin.all')) ||
    Boolean(perms?.can?.('investment.fund.manage'));

  const isClient = user?.identity_type === 'client';

  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [feedback, setFeedback] = useState(null);

    // Na vrh komponente, gde su ostali state-ovi
  const [modalType, setModalType] = useState('invest');

  // invest modal
  const [investOpen, setInvestOpen] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [investAccountNumber, setInvestAccountNumber] = useState('');
  const [investSubmitting, setInvestSubmitting] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [allFundsHistory, setAllFundsHistory] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(false);
// --- STATE (kao SellOrderModal) ---
const [sellOpen, setSellOpen] = useState(false);
const [sellShowConfirm, setSellShowConfirm] = useState(false);

const [sellDraft, setSellDraft] = useState(null); 
// shape:
// {
//   ticker, amount, listingId,
//   qty, orderType, limitValue, stopValue,
//   margin, allOrNone
// }

const ORDER_TYPES = [
  { value: 'MARKET',     label: 'Market' },
  { value: 'LIMIT',      label: 'Limit' },
  { value: 'STOP',       label: 'Stop' },
  { value: 'STOP_LIMIT', label: 'Stop Limit' },
];

function pickListingId(asset) {
  return (
    asset?.listing_id ??
    asset?.listingId ??
    asset?.security_listing_id ??
    asset?.securityListingId ??
    asset?.security_id ??
    asset?.securityId ??
    asset?.asset_id ??
    asset?.assetId ??
    asset?.hartija_id ??
    asset?.hartijaId ??
    asset?.id ??
    null
  );
}

// fallback kada holdings nemaju id (radi samo ako listings endpoint vraća taj ticker u listi)
async function resolveListingIdByTicker(ticker) {
  if (!ticker) return null;
  const T = String(ticker).toUpperCase();

  const pickList = (payload) => {
    // securitiesApi.get* već mapira u niz, ali ostavljamo fallback
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.content)) return payload.content;
    return [];
  };

  const findTicker = (list) =>
    pickList(list).find(x => String(x.ticker).toUpperCase() === T);

  const tryGetter = async (getter) => {
    // 1) bez parametara
    try {
      const found0 = findTicker(await getter({}));
      if (found0) return found0.id ?? found0.listing_id ?? null;
    } catch { /* ignore */ }

    // 2) probaj “uobičajene” parametre (backend često prihvata neku od ovih šema)
    const variants = [
      { ticker: T },
      { q: T },
      { search: T },
      { query: T },
      { symbol: T },

      // paginacija varijante
      { page: 0, size: 1000 },
      { page: 0, size: 5000 },
      { page: 1, page_size: 1000 },
      { page: 1, page_size: 5000 },

      // kombinacije
      { q: T, page: 0, size: 2000 },
      { search: T, page: 0, size: 2000 },
      { ticker: T, page: 0, size: 2000 },
      { q: T, page: 1, page_size: 2000 },
      { search: T, page: 1, page_size: 2000 },
      { ticker: T, page: 1, page_size: 2000 },
    ];

    for (const params of variants) {
      try {
        const found = findTicker(await getter(params));
        if (found) return found.id ?? found.listing_id ?? null;
      } catch { /* ignore */ }
    }

    return null;
  };

  // futures prvo (ZCJ26 liči na futures)
  return (
    await tryGetter((p) => securitiesApi.getFutures(p)) ||
    await tryGetter((p) => securitiesApi.getStocks(p)) ||
    await tryGetter((p) => securitiesApi.getOptions(p)) ||
    await tryGetter((p) => securitiesApi.getForex(p)) ||
    null
  );
}

// --- OPEN SELL MODAL (klik "Prodaj") ---
const handleSellHoldings = async (asset) => {
  const amount = Number(asset?.amount ?? asset?.volume ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    setFeedback({ type: 'greska', text: 'Nije validna količina za prodaju (volume/amount).' });
    return;
  }

  let listingId = pickListingId(asset);
  if (!listingId) listingId = await resolveListingIdByTicker(asset?.ticker);

  if (!listingId) {
    setFeedback({
      type: 'greska',
      text: `Interna greška: ListingID nije pronađen za ticker ${asset?.ticker ?? '—'}.`,
    });
    return;
  }

  // inicijalizuj draft kao SellOrderModal
setSellDraft({
  ticker: asset?.ticker ?? '—',
  acquisition_date: asset?.acquisition_date ?? null, // ✅ bitno
  amount,
  listingId,
  qty: '',
  orderType: 'MARKET',
  limitValue: '',
  stopValue: '',
  margin: false,
  allOrNone: false,
});

  setSellShowConfirm(false);
  setSellOpen(true);
};

function needsLimit(orderType) {
  return orderType === 'LIMIT' || orderType === 'STOP_LIMIT';
}
function needsStop(orderType) {
  return orderType === 'STOP' || orderType === 'STOP_LIMIT';
}

function validateSellDraft(d) {
  if (!d) return { ok: false, error: 'Nije izabrana hartija.' };

  const q = Number(d.qty);
  if (!d.qty || Number.isNaN(q) || q <= 0 || !Number.isInteger(q)) {
    return { ok: false, error: 'Količina mora biti pozitivan ceo broj.' };
  }
  if (q > Number(d.amount)) {
    return { ok: false, error: `Nemate dovoljno. Fond poseduje: ${d.amount}.` };
  }

  if (needsLimit(d.orderType)) {
    const lv = Number(d.limitValue);
    if (!d.limitValue || Number.isNaN(lv) || lv <= 0) return { ok: false, error: 'Unesite validnu limit cenu.' };
  }

  if (needsStop(d.orderType)) {
    const sv = Number(d.stopValue);
    if (!d.stopValue || Number.isNaN(sv) || sv <= 0) return { ok: false, error: 'Unesite validnu stop cenu.' };
  }

  return { ok: true, error: '' };
}

// klik "Nastavi" (kao SellOrderModal)
function handleSellProceed(e) {
  e.preventDefault();
  const v = validateSellDraft(sellDraft);
  if (!v.ok) {
    setFeedback({ type: 'greska', text: v.error });
    return;
  }
  setFeedback(null);
  setSellShowConfirm(true);
}

function applyLocalSellToHoldings(prevFund, { ticker, acquisition_date, qty }) {
  if (!prevFund) return prevFund;

  const sold = Number(qty);
  if (!Number.isFinite(sold) || sold <= 0) return prevFund;

  const prevHoldings = Array.isArray(prevFund.holdings) ? prevFund.holdings : [];

  const nextHoldings = prevHoldings
    .map((h) => {
      // Match po ticker + acquisition_date (da ne pogodi pogrešan red ako ima duplikata tickera)
      const sameTicker = String(h?.ticker ?? '') === String(ticker ?? '');
      const sameDate = String(h?.acquisition_date ?? '') === String(acquisition_date ?? '');

      if (!sameTicker || !sameDate) return h;

      const currentVol = Number(h?.volume ?? 0);
      const nextVol = currentVol - sold;

      return {
        ...h,
        volume: nextVol,
      };
    })
    // skloni redove gde je volume <= 0
    .filter((h) => Number(h?.volume ?? 0) > 0);

  return { ...prevFund, holdings: nextHoldings };
}

// klik "Potvrdi prodaju" (kao SellOrderModal)
async function confirmSellForFund() {
  if (!sellDraft) return;

  try {
    setLoading(true);
    setFeedback(null);

    await securitiesApi.sell({
      fundId, // POST /api/orders/invest
      listingId: sellDraft.listingId,
      quantity: Number(sellDraft.qty),
      orderType: sellDraft.orderType,
      limitValue: needsLimit(sellDraft.orderType) ? Number(sellDraft.limitValue) : 0,
      stopValue:  needsStop(sellDraft.orderType)  ? Number(sellDraft.stopValue)  : 0,
      margin: !!sellDraft.margin,
      allOrNone: !!sellDraft.allOrNone,
    });
    setFund(prev =>
      applyLocalSellToHoldings(prev, {
        ticker: sellDraft.ticker,
        acquisition_date: sellDraft.acquisition_date,
        qty: sellDraft.qty,
      })
    );
    setFeedback({ type: 'uspeh', text: `✓ Sell order je kreiran i čeka odobrenje.` });

    setSellOpen(false);
    setSellShowConfirm(false);
    setSellDraft(null);

    const updatedFund = await investmentFundsApi.getFundDetails(id);
    setFund((prev) => ({
      ...(updatedFund ?? {}),
      account_number: updatedFund?.account_number ?? updatedFund?.accountNumber ?? prev?.account_number ?? prev?.accountNumber,
    }));
  } catch (err) {
    setFeedback({ type: 'greska', text: getErrorMessage(err, 'Greška pri slanju SELL naloga.') });
    setSellShowConfirm(false);
  } finally {
    setLoading(false);
  }
}

// Za supervizora: Direktna uplata/povlačenje na račun fonda
const handleSupervisorFundAction = async (type) => {
  const action = type === 'deposit' ? 'uplatu' : 'povlačenje';
  const apiCall = type === 'deposit' 
    ? investmentFundsApi.depositToFund 
    : investmentFundsApi.withdrawFromFund;

  try {
    setInvestSubmitting(true);
    await apiCall(fundId, { amount: investAmount });
    setFeedback({ type: 'uspeh', text: `Uspešno ste izvršili ${action}.` });
  } catch (err) {
    setFeedback({ type: 'greska', text: getErrorMessage(err, `Greška pri operaciji: ${action}.`) });
  } finally {
    setInvestSubmitting(false);
  }
};

  const HeaderComponent = isClient ? ClientHeader : Navbar;
  const headerProps = isClient ? { activeNav: 'funds' } : {};

  // Load fund details (Swagger: GET /api/investment-funds/{fundId})
  useEffect(() => {
    let alive = true;

    async function loadFund() {
      try {
        setLoading(true);
        setError('');

        const payload = await investmentFundsApi.getFundDetails(id);
        if (!alive) return;

        setFund(payload); // interceptor should return object directly

        // Some API variants return `account_number` only on the funds list endpoint
        // If details response is missing it, try to fetch the list and copy it across
        const hasAccount = payload?.account_number ?? payload?.accountNumber;
        if (!hasAccount) {
          try {
            const fundsRes = await investmentFundsApi.getFunds();
            const list = Array.isArray(fundsRes)
              ? fundsRes
              : Array.isArray(fundsRes?.data)
              ? fundsRes.data
              : Array.isArray(fundsRes?.content)
              ? fundsRes.content
              : [];

            if (!alive) return;
            const match = list.find((f) => {
              const fid = f?.fund_id ?? f?.id ?? f?.fundId;
              const target = payload?.fund_id ?? payload?.id ?? id;
              return String(fid) === String(target);
            });
            if (match && (match.account_number ?? match.accountNumber)) {
              setFund((prev) => ({ ...(prev ?? {}), account_number: match.account_number ?? match.accountNumber }));
            }
          } catch {
            // ignore; this is only a best-effort fallback
          }
        }
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setError(getErrorMessage(e, 'Greška pri učitavanju fonda.'));
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (id) loadFund();
    return () => {
      alive = false;
    };
  }, [id]);

  // Load client accounts for invest
  useEffect(() => {
    if (!isClient) return;

    let alive = true;
    const clientId = user?.client_id ?? user?.identity_id ?? user?.id;
    if (!clientId) return;

    const loadAccounts = async () => {
      try {
        setAccountsLoading(true);
        const payload = await accountsApi.getClientAccounts(clientId);

        const list =
          Array.isArray(payload) ? payload :
          Array.isArray(payload?.data) ? payload.data :
          Array.isArray(payload?.content) ? payload.content :
          [];

        if (!alive) return;

        setAccounts(list);
        const first = list?.[0];
        if (first?.account_number) setInvestAccountNumber(String(first.account_number));
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setAccounts([]);
      } finally {
        if (alive) setAccountsLoading(false);
      }
    };

    loadAccounts();
    return () => { alive = false; };
  }, [isClient, user]);

  useEffect(() => {
    const myHistory = Array.isArray(fund?.performance_history) ? fund.performance_history : [];
    if (myHistory.length < MIN_SNAPSHOTS) return;

    let alive = true;
    async function loadAllFunds() {
      try {
        setChartsLoading(true);
        const res = await investmentFundsApi.getFunds();
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        const others = list.filter(f => {
          const fid = f.id ?? f.fund_id ?? f.fundId;
          return String(fid) !== String(id);
        });
        const detailResults = await Promise.allSettled(
          others.map(f => {
            const ph = f.performance_history ?? f.performanceHistory;
            if (Array.isArray(ph) && ph.length >= MIN_SNAPSHOTS) return Promise.resolve(ph);
            const fid = f.id ?? f.fund_id ?? f.fundId;
            if (!fid) return Promise.resolve([]);
            return investmentFundsApi.getFundDetails(fid)
              .then(d => d?.performance_history ?? d?.performanceHistory ?? [])
              .catch(() => []);
          })
        );
        if (!alive) return;
        setAllFundsHistory(
          detailResults
            .filter(r => r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length >= MIN_SNAPSHOTS)
            .map(r => r.value)
        );
      } catch {
        // ignore — comparison chart simply won't show
      } finally {
        if (alive) setChartsLoading(false);
      }
    }
    loadAllFunds();
    return () => { alive = false; };
  }, [id, fund?.performance_history?.length]);

  const metrics = useMemo(
    () => computeMetrics(Array.isArray(fund?.performance_history) ? fund.performance_history : []),
    [fund]
  );

  const chartData = useMemo(() => {
    const history = Array.isArray(fund?.performance_history) ? fund.performance_history : [];
    const sorted = [...history]
      .filter(p => p.value != null && Number(p.value) > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sorted.length < 2) return { fund: [], avg: [] };

    const firstVal = Number(sorted[0].value);
    const fundSeries = sorted.map(p => ({ date: p.date, value: (Number(p.value) / firstVal) * 100 }));

    if (allFundsHistory.length === 0) return { fund: fundSeries, avg: [] };

    const avgSeries = sorted.map(p => {
      const t = new Date(p.date).getTime();
      const indexed = [];
      for (const h of allFundsHistory) {
        const hs = [...h]
          .filter(hp => hp.value != null && Number(hp.value) > 0)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        if (hs.length === 0) continue;
        const fv = Number(hs[0].value);
        if (!fv) continue;
        let closest = hs[0];
        for (const hp of hs) {
          if (Math.abs(new Date(hp.date).getTime() - t) < Math.abs(new Date(closest.date).getTime() - t)) {
            closest = hp;
          }
        }
        indexed.push((Number(closest.value) / fv) * 100);
      }
      if (indexed.length === 0) return null;
      return { date: p.date, value: indexed.reduce((a, b) => a + b, 0) / indexed.length };
    }).filter(Boolean);

    return { fund: fundSeries, avg: avgSeries };
  }, [fund, allFundsHistory]);

  useLayoutEffect(() => {
    if (loading || !fund) return;
    const ctx = gsap.context(() => {
      const nodes = pageRef.current?.querySelectorAll('.page-anim') ?? [];
      if (!nodes.length) return;
      gsap.from(nodes, { opacity: 0, y: 20, duration: 0.45, stagger: 0.08, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, [loading, fund]);

  const holdings = useMemo(() => Array.isArray(fund?.holdings) ? fund.holdings : [], [fund]);
  const performance = useMemo(() => Array.isArray(fund?.performance_history) ? fund.performance_history : [], [fund]);

  const fundId = fund?.id ?? id;

  async function handleInvestSubmit(e) {
  e.preventDefault();
  const amount = Number(investAmount);
  if (!investAccountNumber) {
    setFeedback({ type: 'greska', text: 'Izaberite račun.' });
    return;
  }

  // Client-side minimum investment validation to prevent sending request
  const minInvestment = Number(fund?.min_investment ?? fund?.minInvestment ?? 0);
  if (modalType === 'invest' && minInvestment > 0 && (Number.isNaN(amount) || amount < minInvestment)) {
    setFeedback({ type: 'greska', text: `Minimalni ulog je ${formatRSD(minInvestment)}` });
    return;
  }

  try {
    setInvestSubmitting(true);
    setFeedback(null);

    const payload = {
      amount,
      account_number: String(investAccountNumber),
    };

    if (modalType === 'invest') {
      await investmentFundsApi.investInFund(fundId, payload);
      setFeedback({ type: 'uspeh', text: 'Investicija uspešna!' });
      // Refresh fund details so UI reflects new balances immediately
      try {
        const updated = await investmentFundsApi.getFundDetails(fundId);
        setFund((prev) => ({
          ...(updated ?? {}),
          account_number: updated?.account_number ?? updated?.accountNumber ?? prev?.account_number ?? prev?.accountNumber,
        }));
      } catch {
        // best-effort: ignore refresh error
      }
      try {
        const clientId = user?.client_id ?? user?.id;
        if (clientId) window.dispatchEvent(new CustomEvent('rafbank:clientFunds:updated', { detail: { clientId } }));
      } catch { /* ignore */ }
    } else {
      // Withdraw from fund: check backend response — it may complete immediately
      const resp = await investmentFundsApi.withdrawFromFund(fundId, payload);
      const status = resp?.status ?? resp?.data?.status ?? null;

      if (status && String(status).toUpperCase() === 'COMPLETED') {
        setFeedback({ type: 'uspeh', text: 'Uspešno izvršeno povlačenje.' });
        try {
          const updated = await investmentFundsApi.getFundDetails(fundId);
          setFund((prev) => ({
            ...(updated ?? {}),
            account_number: updated?.account_number ?? updated?.accountNumber ?? prev?.account_number ?? prev?.accountNumber,
          }));
        } catch {
          // ignore refresh errors
        }
      } else {
        setFeedback({ type: 'uspeh', text: 'Zahtev za povlačenje poslat!' });
      }

      try {
        const clientId = user?.client_id ?? user?.id;
        if (clientId) window.dispatchEvent(new CustomEvent('rafbank:clientFunds:updated', { detail: { clientId } }));
      } catch { /* ignore */ }
    }

    setInvestOpen(false);
    setInvestAmount('');
  } catch (err) {
    setFeedback({ type: 'greska', text: getErrorMessage(err, 'Akcija nije uspela.') });
  } finally {
    setInvestSubmitting(false);
  }
}

  if (loading) {
    return (
      <div className={styles.page}>
        <HeaderComponent {...headerProps} />
        <div className={styles.loadingState}>Učitavanje...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <HeaderComponent {...headerProps} />
        <main className={styles.content}>
          <Alert tip="greska" poruka={error} />
        </main>
      </div>
    );
  }

  if (!fund) return null;

  return (
    <div ref={pageRef} className={styles.page}>
      <HeaderComponent {...headerProps} />

      <main className={styles.content}>
        <div className={`page-anim ${styles.breadcrumb}`}>
          <button
            className={styles.breadcrumbLink}
            style={{
    cursor: 'default',
    pointerEvents: 'none',
  }}

          >
            Investicioni fondovi
          </button>
          <span className={styles.breadcrumbSep}>›</span>
          <span>{fund.name ?? 'Fond'}</span>
        </div>

        <div className={`page-anim ${styles.pageHeader}`}>
          <div>
            <h1 className={styles.pageTitle}>{fund.name ?? 'Fond'}</h1>
            {(fund.description ?? '') && <p className={styles.pageDesc}>{fund.description}</p>}
          </div>
          {isSupervisor && <span className={styles.supervisorBadge}>Supervisor</span>}
        </div>

        {feedback && (
          <div className="page-anim" style={{ marginBottom: 20 }}>
            <Alert tip={feedback.type} poruka={feedback.text} />
          </div>
        )}

        <section className={`page-anim ${styles.statsGrid}`}>
          <InfoCard label="Menadžer" value={fund.manager ?? '—'} />
          <InfoCard label="Minimalni ulog" value={formatRSD(fund.min_investment)} />
          <InfoCard label="Likvidnost" value={formatRSD(fund.account_balance)} />
          <InfoCard label="Račun" value={fund?.account_number ?? fund?.accountNumber ?? '—'} />
          <InfoCard label="Vrednost fonda" value={formatRSD(fund.fund_value)} />
          <InfoCard label="Profit" value={formatRSD(fund.profit)} />
        </section>

        {/* Metrics */}
        {metrics.annualReturn != null && (
          <section className={`page-anim ${styles.metricsGrid}`}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Godišnji prinos</span>
              <span className={`${styles.metricValue} ${metrics.annualReturn >= 0 ? styles.profitPos : styles.profitNeg}`}>
                {fmtPct(metrics.annualReturn)}
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Reward/Variability</span>
              <span className={`${styles.metricValue} ${(metrics.rewardToVariability ?? 0) >= 0 ? styles.profitPos : styles.profitNeg}`}>
                {fmtRatio(metrics.rewardToVariability)}
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Max Drawdown</span>
              <span className={`${styles.metricValue} ${styles.profitNeg}`}>
                {fmtPct(metrics.maxDrawdown)}
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Volatilnost</span>
              <span className={styles.metricValue}>{fmtPct(metrics.volatility)}</span>
            </div>
          </section>
        )}

        {/* Historical value chart */}
        {performance.length >= MIN_SNAPSHOTS && (
          <section className={`page-anim ${styles.card}`}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardEyebrow}>Grafikon</div>
                <h2 className={styles.cardTitle}>Istorijska vrednost fonda</h2>
              </div>
            </div>
            <div className={styles.chartWrap}>
              <LineChart
                series={[{ label: fund.name ?? 'Fond', color: 'var(--blue)', data: performance.map(p => ({ date: p.date, value: p.value })) }]}
                height={220}
              />
            </div>
          </section>
        )}

        {/* Comparison chart */}
        {chartData.fund.length >= 2 && (
          <section className={`page-anim ${styles.card}`}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardEyebrow}>Poređenje</div>
                <h2 className={styles.cardTitle}>Prinos vs. prosek svih fondova (baza = 100)</h2>
              </div>
            </div>
            {chartsLoading ? (
              <div className={styles.chartLoading}>Učitavanje podataka za poređenje...</div>
            ) : (
              <div className={styles.chartWrap}>
                <LineChart
                  series={[
                    { label: fund.name ?? 'Fond', color: 'var(--blue)', data: chartData.fund },
                    ...(chartData.avg.length >= 2
                      ? [{ label: 'Prosek fondova', color: '#f59e0b', dashed: true, data: chartData.avg }]
                      : []),
                  ]}
                  height={220}
                />
              </div>
            )}
          </section>
        )}

        {/* Holdings table */}
        <section className={`page-anim ${styles.card}`}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardEyebrow}>Hartije</div>
              <h2 className={styles.cardTitle}>Sastav fonda</h2>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Volume</th>
                  <th>InitialMarginCost</th>
                  <th>AcquisitionDate</th>
                  {isSupervisor && <th>Akcija</th>}
                </tr>
              </thead>
              <tbody>
                {holdings.length === 0 ? (
                  <tr>
                    <td colSpan={isSupervisor ? 7 : 6} className={styles.emptyTable}>
                      Nema hartija u fondu.
                    </td>
                  </tr>
                ) : (
                  holdings.map((h, idx) => (
                    <tr key={`${h.ticker}-${h.acquisition_date}-${idx}`}>
                      <td>{h.ticker ?? '—'}</td>
                      <td>{formatRSD(h.price)}</td>
                      <td>{formatNumber(h.change)}</td>
                      <td>{formatNumber(h.volume)}</td>
                      <td>{formatRSD(h.initial_margin_cost)}</td>
                      <td>{formatDate(h.acquisition_date)}</td>
                      {isSupervisor && (
                        <td>
                          <button
                            className={styles.btnPrimary}
                            onClick={() => handleSellHoldings(h)}
                          >
                            Prodaj
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Performance */}
        <section className={`page-anim ${styles.card}`}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardEyebrow}>Performanse</div>
              <h2 className={styles.cardTitle}>Istorijski prikaz</h2>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Liquid assets</th>
                  <th>Value</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {performance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyTable}>
                      Nema podataka o performansama.
                    </td>
                  </tr>
                ) : (
                  performance.map((p, idx) => (
                    <tr key={`${p.date}-${idx}`}>
                      <td>{formatDate(p.date)}</td>
                      <td>{formatRSD(p.liquid_assets)}</td>
                      <td>{formatRSD(p.value)}</td>
                      <td>{formatRSD(p.profit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

{/* Actions */}
<section className={`page-anim ${styles.actionSection}`}>
  {isClient && (
    <>
      <button 
        className={styles.btnPrimary} 
        onClick={() => {
          setModalType('invest'); // Kažeš: želim da investiram
          setInvestOpen(true);
        }}
      >
        Investiraj
      </button>

      <button 
        className={styles.btnGhost} 
        onClick={() => {
          setModalType('withdraw'); // Kažeš: želim da povučem pare
          setInvestOpen(true);
        }}
      >
        Povuci sredstva
      </button>
    </>
  )}

  {isSupervisor && (
    <>
      <button className={styles.btnPrimary} onClick={() => handleSupervisorFundAction('deposit')}>
        Uplata u fond
      </button>
      <button className={styles.btnGhost} onClick={() => handleSupervisorFundAction('withdraw')}>
        Povlačenje iz fonda
      </button>
    </>
  )}
</section>
      </main>
{sellOpen && sellDraft && (
  <div className={styles.modalBackdrop} onClick={() => { setSellOpen(false); setSellShowConfirm(false); }}>
    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <div>
          <h3 className={styles.modalTitle}>Prodaj — {sellDraft.ticker}</h3>
          <p className={styles.modalText}>Fond poseduje: <strong>{sellDraft.amount}</strong> kom</p>
        </div>
        <button className={styles.closeBtn} onClick={() => { setSellOpen(false); setSellShowConfirm(false); }}>×</button>
      </div>

      {sellShowConfirm ? (
        <>
          <div className={styles.modalBody}>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Potvrda prodaje</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tx-2)' }}>Hartija:</span>
                <strong>{sellDraft.ticker}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tx-2)' }}>Količina:</span>
                <strong>{sellDraft.qty}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tx-2)' }}>Tip ordera:</span>
                <strong>{ORDER_TYPES.find(t => t.value === sellDraft.orderType)?.label}</strong>
              </div>

              {(sellDraft.orderType === 'LIMIT' || sellDraft.orderType === 'STOP_LIMIT') && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tx-2)' }}>Limit cena:</span>
                  <strong>{Number(sellDraft.limitValue).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}</strong>
                </div>
              )}

              {(sellDraft.orderType === 'STOP' || sellDraft.orderType === 'STOP_LIMIT') && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tx-2)' }}>Stop cena:</span>
                  <strong>{Number(sellDraft.stopValue).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}</strong>
                </div>
              )}

              {sellDraft.allOrNone && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tx-2)' }}>All or None:</span><strong>Da</strong>
                </div>
              )}
              {sellDraft.margin && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tx-2)' }}>Margin:</span><strong>Da</strong>
                </div>
              )}
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setSellShowConfirm(false)}
              disabled={loading}
            >
              Nazad
            </button>

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={confirmSellForFund}
              disabled={loading}
              style={{ background: '#ef4444' }}
            >
              {loading ? 'Slanje...' : 'Potvrdi prodaju'}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSellProceed} className={styles.modalBody}>
          <div className={styles.field}>
            <label>Tip ordera</label>
            <select
              value={sellDraft.orderType}
              onChange={(e) => setSellDraft(s => ({ ...s, orderType: e.target.value }))}
            >
              {ORDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {(sellDraft.orderType === 'LIMIT' || sellDraft.orderType === 'STOP_LIMIT') && (
            <div className={styles.field}>
              <label>Limit cena</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={sellDraft.limitValue}
                onChange={(e) => setSellDraft(s => ({ ...s, limitValue: e.target.value }))}
                required
              />
            </div>
          )}

          {(sellDraft.orderType === 'STOP' || sellDraft.orderType === 'STOP_LIMIT') && (
            <div className={styles.field}>
              <label>Stop cena</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={sellDraft.stopValue}
                onChange={(e) => setSellDraft(s => ({ ...s, stopValue: e.target.value }))}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label>Količina</label>
            <input
              type="number"
              step="1"
              min="1"
              max={sellDraft.amount}
              placeholder={`Max: ${sellDraft.amount}`}
              value={sellDraft.qty}
              onChange={(e) => setSellDraft(s => ({ ...s, qty: e.target.value }))}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!sellDraft.margin}
                onChange={(e) => setSellDraft(s => ({ ...s, margin: e.target.checked }))}
              />
              Margin
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!sellDraft.allOrNone}
                onChange={(e) => setSellDraft(s => ({ ...s, allOrNone: e.target.checked }))}
              />
              All or None
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} style={{ background: '#ef4444' }} disabled={loading}>
              Nastavi
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
)}
{/* Invest modal */}
{investOpen && (
  <div className={styles.modalBackdrop} onClick={() => setInvestOpen(false)}>
    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <div>
          {/* DINAMIČKI NASLOV */}
          <h3 className={styles.modalTitle}>
            {modalType === 'invest' ? 'Investiraj u fond' : 'Povuci sredstva iz fonda'}
          </h3>
          <p className={styles.modalText}>
            Fond: <strong>{fund.name}</strong>
          </p>
        </div>
        <button className={styles.closeBtn} onClick={() => setInvestOpen(false)}>×</button>
      </div>

      <form onSubmit={handleInvestSubmit} className={styles.modalBody}>
        <div className={styles.field}>
          <label>Račun *</label>
          <select
            value={investAccountNumber}
            onChange={(e) => setInvestAccountNumber(e.target.value)}
            required
            disabled={accountsLoading || accounts.length === 0}
          >
            {accountsLoading ? (
              <option value="">Učitavanje računa...</option>
            ) : accounts.length === 0 ? (
              <option value="">Nema dostupnih računa</option>
            ) : (
              accounts.map((acc) => (
                <option key={acc.account_number} value={acc.account_number}>
                  {acc.name ?? 'Račun'} — {acc.account_number}
                </option>
              ))
            )}
          </select>
        </div>

        <div className={styles.field}>
          <label>Iznos (RSD) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Unesite iznos..."
            value={investAmount}
            onChange={(e) => setInvestAmount(e.target.value)}
            required
          />
        </div>

        <div className={styles.formActions}>
          <button 
            type="button" 
            className={styles.btnGhost} 
            onClick={() => setInvestOpen(false)} 
            disabled={investSubmitting}
          >
            Otkaži
          </button>
          <button 
            type="submit" 
            className={styles.btnPrimary} 
            disabled={investSubmitting}
          >
            {/* DINAMIČKI TEKST NA DUGMETU */}
            {investSubmitting 
              ? 'Slanje...' 
              : (modalType === 'invest' ? 'Potvrdi investiciju' : 'Potvrdi povlačenje')
            }
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className={styles.infoCard}>
      <span className={styles.infoLabel}>{label}</span>
      <strong className={styles.infoValue}>{value}</strong>
    </div>
  );
}

function formatRSD(value) {
  if (value == null || value === '—') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)} RSD`;
}

function formatNumber(value) {
  if (value == null) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('sr-RS').format(num);
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('sr-RS');
}