import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import gsap                          from 'gsap';
import { useAuthStore }              from '../../store/authStore';
import { investmentFundsApi }        from '../../api/endpoints/investmentFunds';
import Navbar                        from '../../components/layout/Navbar';
import ClientHeader                  from '../../components/layout/ClientHeader';
import Spinner                       from '../../components/ui/Spinner';
import Alert                         from '../../components/ui/Alert';
import InvestModal                   from '../../features/investmentFunds/InvestModal';
import styles                        from './FundDetailPage.module.css';

function formatRsd(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeFund(f) {
  return {
    id:               f.id                  ?? f.fund_id       ?? f.fundId,
    name:             f.name                ?? f.fund_name     ?? f.fundName     ?? '—',
    description:      f.description         ?? f.desc          ?? '—',
    totalValue:       f.totalValue          ?? f.total_value   ?? f.totalNetAssetValue ?? f.total_net_asset_value ?? 0,
    profit:           f.profit              ?? f.total_profit  ?? f.totalProfit  ?? 0,
    minimumInvestment: f.minimumInvestment  ?? f.minimum_contribution ?? f.minContribution ?? f.min_contribution ?? 0,
    managerId:        f.managerId           ?? f.manager_id,
  };
}

function loadFundFromCache(fundId) {
  try {
    const list = JSON.parse(sessionStorage.getItem('rafbank_funds') || '[]');
    return list.find(f => String(f.id) === String(fundId)) ?? null;
  } catch { return null; }
}

export default function FundDetailPage() {
  useEffect(() => { document.title = 'RAFBank | Detalji fonda'; }, []);
  const { fundId }  = useParams();
  const location    = useLocation();
  const pageRef     = useRef(null);
  const user        = useAuthStore(s => s.user);
  const isClient    = user?.identity_type === 'client';

  const fallback    = location.state?.fund ?? loadFundFromCache(fundId);

  const [fund,       setFund]       = useState(fallback ?? null);
  const [loading,    setLoading]    = useState(!fallback);
  const [showInvest, setShowInvest] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [investErr,  setInvestErr]  = useState(null);

  useEffect(() => {
    investmentFundsApi.getFundDetails(fundId)
      .then(res => {
        const body = res?.data ?? res;
        setFund(normalizeFund(body));
      })
      .catch(() => {
        // Silently fall back to cached/state data — detail endpoint not yet deployed
      })
      .finally(() => setLoading(false));
  }, [fundId]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity: 0, y: 20, duration: 0.4, stagger: 0.08, ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  async function handleInvest(fId, payload) {
    await investmentFundsApi.investInFund(fId, payload);
    setShowInvest(false);
    setSuccessMsg('Investicija je uspešno realizovana.');
    setTimeout(() => setSuccessMsg(null), 5000);
  }

  const profitPositive = (fund?.profit ?? 0) >= 0;

  return (
    <div ref={pageRef} className={styles.stranica}>
      {isClient ? <ClientHeader activeNav="fondovi" /> : <Navbar />}

      <main className={styles.sadrzaj}>

        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <Link to="/investment-funds" className={styles.breadcrumbLink}>
              Investicioni fondovi
            </Link>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbAktivna}>
              {fund?.name ?? 'Detalji fonda'}
            </span>
          </div>
          <Link to="/investment-funds" className={styles.btnBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Nazad na fondove
          </Link>
        </div>

        {successMsg && (
          <div className="page-anim" style={{ marginBottom: 16 }}>
            <Alert tip="uspeh" poruka={successMsg} />
          </div>
        )}
        {investErr && !successMsg && (
          <div className="page-anim" style={{ marginBottom: 16 }}>
            <Alert tip="greska" poruka={investErr} />
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : fund ? (
          <>
            <div className={`page-anim ${styles.header}`}>
              <div>
                <h1 className={styles.pageTitle}>{fund.name}</h1>
                <p className={styles.pageDesc}>{fund.description}</p>
              </div>
              {isClient && (
                <button
                  className={styles.btnInvest}
                  onClick={() => { setInvestErr(null); setShowInvest(true); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                  Investiraj
                </button>
              )}
            </div>

            <div className={`page-anim ${styles.statsGrid}`}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Ukupna vrednost</span>
                <span className={styles.statValue}>{formatRsd(fund.totalValue)} RSD</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Profit</span>
                <span className={`${styles.statValue} ${profitPositive ? styles.profitPos : styles.profitNeg}`}>
                  {profitPositive ? '+' : ''}{formatRsd(fund.profit)} RSD
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Minimalni ulog</span>
                <span className={styles.statValue}>{formatRsd(fund.minimumInvestment)} RSD</span>
              </div>
            </div>
          </>
        ) : null}

      </main>

      {showInvest && fund && (
        <InvestModal
          fund={fund}
          onClose={() => setShowInvest(false)}
          onConfirm={handleInvest}
        />
      )}
    </div>
  );
}
