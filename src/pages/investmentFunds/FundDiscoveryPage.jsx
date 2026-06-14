import { useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import gsap                          from 'gsap';
import { useDebounce }               from '../../hooks/useDebounce';
import { useAuthStore }              from '../../store/authStore';
import { usePermissions }            from '../../hooks/usePermissions';
import { investmentFundsApi }        from '../../api/endpoints/investmentFunds';
import Navbar                        from '../../components/layout/Navbar';
import ClientHeader                  from '../../components/layout/ClientHeader';
import Spinner                       from '../../components/ui/Spinner';
import Alert                         from '../../components/ui/Alert';
import FundTable                     from '../../features/investmentFunds/FundTable';
import FundFilters                   from '../../features/investmentFunds/FundFilters';
import InvestModal                   from '../../features/investmentFunds/InvestModal';
import styles                        from './FundDiscoveryPage.module.css';
import { computeMetrics, MIN_SNAPSHOTS } from '../../utils/fundMetrics';

function normalizeFund(f) {
  const performanceHistory = f.performance_history ?? f.performanceHistory ?? [];
  const metrics = computeMetrics(performanceHistory);
  return {
    id:                f.id                 ?? f.fund_id        ?? f.fundId,
    name:              f.name               ?? f.fund_name      ?? f.fundName      ?? '—',
    description:       f.description        ?? f.desc           ?? '—',
    totalValue:        f.totalValue         ?? f.total_value    ?? f.totalNetAssetValue ?? f.total_net_asset_value ?? f.fund_value ?? 0,
    profit:            f.profit             ?? f.total_profit   ?? f.totalProfit   ?? 0,
    minimumInvestment: f.minimumInvestment  ?? f.minimum_contribution ?? f.minContribution ?? f.min_contribution ?? 0,
    managerId:         f.managerId          ?? f.manager_id,
    performanceHistory,
    annualReturn:        metrics.annualReturn,
    rewardToVariability: metrics.rewardToVariability,
    maxDrawdown:         metrics.maxDrawdown,
    volatility:          metrics.volatility,
  };
}

function sortFunds(funds, sortBy) {
  if (!sortBy) return funds;
  const lastU = sortBy.lastIndexOf('_');
  const col = sortBy.slice(0, lastU);
  const dir = sortBy.slice(lastU + 1);
  return [...funds].sort((a, b) => {
    let av, bv;
    switch (col) {
      case 'name':         av = (a.name ?? '').toLowerCase(); bv = (b.name ?? '').toLowerCase(); break;
      case 'totalValue':   av = a.totalValue ?? 0;            bv = b.totalValue ?? 0;            break;
      case 'profit':       av = a.profit ?? 0;                bv = b.profit ?? 0;                break;
      case 'minContrib':   av = a.minimumInvestment ?? 0;     bv = b.minimumInvestment ?? 0;     break;
      case 'annualReturn': av = a.annualReturn;               bv = b.annualReturn;               break;
      case 'rewardToVar':  av = a.rewardToVariability;        bv = b.rewardToVariability;        break;
      case 'maxDrawdown':  av = a.maxDrawdown;                bv = b.maxDrawdown;                break;
      case 'volatility':   av = a.volatility;                 bv = b.volatility;                 break;
      default: return 0;
    }
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === 'asc' ? av - bv : bv - av;
  });
}

const CACHE_KEY = 'rafbank_funds';

function loadCache() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; }
}

function saveCache(list) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

function mergeFunds(base, incoming) {
  const map = new Map(base.map(f => [String(f.id), f]));
  incoming.forEach(f => { if (f.id != null) map.set(String(f.id), f); });
  return [...map.values()];
}

export default function FundDiscoveryPage() {
  useEffect(() => { document.title = 'RAFBank | Fondovi'; }, []);
  const navigate   = useNavigate();
  const location   = useLocation();
  const pageRef    = useRef(null);
  const user       = useAuthStore(s => s.user);
  const { isSupervisor } = usePermissions();

  const isClient   = user?.identity_type === 'client';

  function buildInitial() {
    const cached = loadCache();
    const newFund = location.state?.newFund ? normalizeFund(location.state.newFund) : null;
    if (!newFund) return cached;
    const merged = mergeFunds(cached, [newFund]);
    saveCache(merged);
    return merged;
  }

  const [funds,       setFunds]       = useState(buildInitial);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState('');
  const [sortBy,      setSortBy]      = useState('');
  const [investFund,  setInvestFund]  = useState(null);
  const [successMsg,  setSuccessMsg]  = useState(location.state?.successMsg ?? null);
  const [investError, setInvestError] = useState(null);

  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => { fetchFunds(); }, []);

  async function fetchFunds() {
    setLoading(true);
    setError(null);
    try {
      const res = await investmentFundsApi.getFunds();
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      if (list.length > 0) {
        const normalized = list.map(normalizeFund);
        const merged = mergeFunds(loadCache(), normalized);
        setFunds(merged);
        saveCache(merged);
        enrichMetrics(merged);
      }
    } catch (err) {
      console.debug('[FundDiscoveryPage] Failed to fetch funds from backend, using cache:', err?.message);
    } finally {
      setLoading(false);
    }
  }

  async function enrichMetrics(fundsList) {
    const toFetch = fundsList.filter(f => f.id != null && (!f.performanceHistory || f.performanceHistory.length < MIN_SNAPSHOTS));
    if (toFetch.length === 0) return;

    const results = await Promise.allSettled(
      toFetch.map(f => investmentFundsApi.getFundDetails(f.id).catch(() => null))
    );

    const updates = new Map();
    results.forEach((result, idx) => {
      if (result.status !== 'fulfilled' || !result.value) return;
      const ph = result.value.performance_history ?? result.value.performanceHistory ?? [];
      if (ph.length >= MIN_SNAPSHOTS) {
        updates.set(String(toFetch[idx].id), { performanceHistory: ph, ...computeMetrics(ph) });
      }
    });

    if (updates.size === 0) return;

    setFunds(prev => {
      const next = prev.map(f => {
        const upd = updates.get(String(f.id));
        return upd ? { ...f, ...upd } : f;
      });
      saveCache(next);
      return next;
    });
  }

  const filteredFunds = useMemo(() => {
    let list = funds;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(f =>
        (f.name ?? '').toLowerCase().includes(q) ||
        (f.description ?? '').toLowerCase().includes(q)
      );
    }
    return sortFunds(list, sortBy);
  }, [funds, debouncedSearch, sortBy]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity: 0, y: 20, duration: 0.4, stagger: 0.08, ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  async function handleInvest(fundId, payload) {
    await investmentFundsApi.investInFund(fundId, payload);
    setInvestFund(null);
    setSuccessMsg('Investicija je uspešno realizovana.');
    setTimeout(() => setSuccessMsg(null), 5000);
    // Notify other parts of the app (portfolio tab) to refresh client funds
    try {
      const clientId = user?.client_id ?? user?.id;
      if (clientId) {
        window.dispatchEvent(new CustomEvent('rafbank:clientFunds:updated', { detail: { clientId } }));
      }
    } catch {
      // ignore
    }
    // Refresh funds list so table reflects updated values immediately
    try {
      await fetchFunds();
    } catch {
      // ignore fetch errors — success message already shown
    }
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      {isClient ? <ClientHeader activeNav="fondovi" /> : <Navbar />}

      <main className={styles.sadrzaj}>

        {/* Header */}
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Investicioni fondovi</span>
          </div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Investicioni fondovi</h1>
              <p className={styles.pageDesc}>
                Pregled svih dostupnih investicionih fondova.
              </p>
            </div>
            {isSupervisor && (
              <Link to="/investment-funds/new" className={styles.btnPrimary}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Kreiraj fond
              </Link>
            )}
          </div>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="page-anim">
            <Alert tip="uspeh" poruka={successMsg} />
          </div>
        )}
        {(error || investError) && !successMsg && (
          <div className="page-anim">
            <Alert tip="greska" poruka={error ?? investError} />
          </div>
        )}

        {/* Filters */}
        <div className="page-anim">
          <FundFilters
            search={search}
            sortBy={sortBy}
            onSearchChange={setSearch}
            onSortChange={setSortBy}
          />
        </div>

        {/* Table */}
        {loading ? (
          <Spinner />
        ) : (
          <div className={`page-anim ${styles.tableCard}`}>
            <FundTable
              funds={filteredFunds}
              loading={false}
              isClient={isClient}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onRowClick={fund => navigate(isClient ? `/client/investment-funds/${fund.id}` : `/investment-funds/${fund.id}`, { state: { fund } })}
              onInvest={fund => { setInvestError(null); setInvestFund(fund); }}
            />
          </div>
        )}

      </main>

      {/* Invest modal */}
      {investFund && (
        <InvestModal
          fund={investFund}
          onClose={() => setInvestFund(null)}
          onConfirm={handleInvest}
        />
      )}
    </div>
  );
}
