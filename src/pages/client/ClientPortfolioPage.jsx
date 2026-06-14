import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { useAuthStore } from '../../store/authStore';
import { portfolioApi } from '../../api/endpoints/portfolio';
import { otcApi } from '../../api/endpoints/otc';
import ClientHeader from '../../components/layout/ClientHeader';
import PortfolioTable from '../../features/portfolio/PortfolioTable';
import SellOrderModal from '../../features/portfolio/SellOrderModal';
import ProfitSummary from '../../features/portfolio/ProfitSummary';
import TaxSummary from '../../features/portfolio/TaxSummary';
import Tabs from '../../features/portfolio/Tabs';
import ClientFundsTab from '../../features/portfolio/ClientFundsTab';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import styles from './ClientPortfolioPage.module.css';
import DividendHistoryModal from '../../features/portfolio/DividendHistoryModal';

export default function ClientPortfolioPage() {
  useEffect(() => { document.title = 'RAFBank | Moj Portfolio'; }, []);
  const pageRef = useRef(null);

  const [portfolio, setPortfolio] = useState({ stocks: [], tax: { taxPaid: 0, taxUnpaid: 0 } });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [sellModal, setSellModal] = useState(null);
  const [dividendModalAsset, setDividendModalAsset] = useState(null);
  const [activeTab, setActiveTab] = useState('securities');
  const [publishError, setPublishError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState('');

  const user = useAuthStore(s => s.user);
  const initFromStorage = useAuthStore(s => s.initFromStorage);

  useEffect(() => {
    if (!user) initFromStorage();
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        setError(null);
        const clientId = user.client_id ?? user.clientId ?? user.identity_id ?? user.identityId ?? user.id;
        
        // DEBUG: Log what we're requesting
        console.log('[ClientPortfolioPage] Loading portfolio for:', {
          userId: user.id,
          clientId: user.client_id,
          resolvedClientId: clientId,
          userRole: user.role,
          userEmail: user.email
        });
        
        const res = await portfolioApi.getClientPortfolio(clientId);
        const rawData = res?.data || res;
        const allAssets = Array.isArray(rawData) ? rawData : (rawData?.assets ?? []);
        setPortfolio({
          stocks: allAssets.filter(a => a.type?.toUpperCase() !== 'OPTION'),
          tax: rawData?.tax ?? { taxPaid: 0, taxUnpaid: 0 },
        });
      } catch (err) {
        console.error('[ClientPortfolioPage] Error loading portfolio:', {
          status: err?.response?.status,
          message: err?.response?.data?.message || err?.message,
          url: err?.response?.config?.url,
          fullError: err
        });
        
        // Handle 403 Forbidden - user may not be authorized for this resource
        if (err?.response?.status === 403) {
          setError('Nemate pristup portfoliju. Molimo pokušajte ponovo ili kontaktirajte podršku.');
        } else {
          setError('Nije moguće učitati podatke portfolija.');
        }
        
        // Still set default empty portfolio so page doesn't crash
        setPortfolio({ stocks: [], tax: { taxPaid: 0, taxUnpaid: 0 } });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.id]);

  useLayoutEffect(() => {
    if (!loading && portfolio) {
      const ctx = gsap.context(() => {
        gsap.from('.page-anim', { opacity: 0, y: 20, duration: 0.4, stagger: 0.1, ease: 'power2.out' });
      }, pageRef);
      return () => ctx.revert();
    }
  }, [loading, portfolio]);

  const clientId = user?.client_id ?? user?.clientId ?? user?.identity_id ?? user?.identityId ?? user?.id;

  if (!user) return null;

  return (
    <div ref={pageRef} className={styles.stranica}>
      <ClientHeader activeNav="portfolio" />

      {sellModal && (
        <SellOrderModal
          asset={sellModal}
          clientId={clientId}
          onClose={() => setSellModal(null)}
          onSuccess={() => setSellModal(null)}
        />
      )}

      <DividendHistoryModal
        open={!!dividendModalAsset}
        asset={dividendModalAsset}
        clientId={clientId}
        onClose={() => setDividendModalAsset(null)}
      />

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}><span>Moj nalog</span></div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Moj Portfolio</h1>
              <p className={styles.pageDesc}>Pregled vaših akcija i poresko stanje u realnom vremenu.</p>
            </div>
            {!loading && !error && <TaxSummary stats={portfolio.tax} />}
          </div>
        </div>

        {loading ? (
          <div className={styles.center}><Spinner /></div>
        ) : error ? (
          <div className={styles.center}><Alert tip="greska" poruka={error} /></div>
        ) : (
          <>
            <div className="page-anim">
              <ProfitSummary assets={portfolio.stocks} />
            </div>

            <div className="page-anim">
              <Tabs
                tabs={[
                  { id: 'securities', label: 'Moje hartije' },
                  { id: 'funds', label: 'Moji fondovi' }
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>

            {activeTab === 'securities' && (
              <>
                <div className={`page-anim ${styles.tableCard}`}>
                  <div className={styles.cardHeader}>
                    <h3>Moje akcije (Stocks)</h3>
                  </div>
                  {publishError && (
                    <div style={{ padding: '8px 24px', color: 'var(--red, red)', fontSize: 13 }}>
                      {publishError}
                    </div>
                  )}
                  {publishSuccess && (
                    <div style={{ padding: '8px 24px', color: 'var(--green, #16a34a)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      ✓ {publishSuccess}
                      <button
                        onClick={() => setPublishSuccess('')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14, lineHeight: 1 }}
                      >✕</button>
                    </div>
                  )}
                  <PortfolioTable
                    assets={portfolio.stocks}
                    isAdmin={true}
                    onSell={asset => setSellModal(asset)}
                    onViewDividends={asset => setDividendModalAsset(asset)}
                    onPublish={async (asset, qty) => {
                      const ownershipId = asset.ownership_id ?? asset.asset_ownership_id ?? asset.ownershipId ?? asset.id;
                      if (!ownershipId) { setPublishError('Nije pronađen ownershipId.'); return; }
                      try {
                        setPublishError('');
                        setPublishSuccess('');
                        await otcApi.publishClientAsset(clientId, ownershipId, qty);
                        setPublishSuccess(`Hartija ${asset.ticker ?? ''} je uspešno objavljena na OTC portalu.`);
                        setTimeout(() => setPublishSuccess(''), 5000);
                      } catch (err) {
                        setPublishError(err?.response?.data?.message ?? err?.message ?? 'Greška pri objavljivanju na OTC portal.');
                      }
                    }}
                  />
                </div>

                <div className="page-anim" style={{ marginTop: '32px', paddingBottom: '40px' }}>
                  <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                      Za prodaju određenih akcija kliknite na dugme <strong>SELL</strong>.
                      Sredstva će biti prebačena na vaš račun tek nakon odobrenja.
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'funds' && (
              <div className="page-anim">
                <ClientFundsTab clientId={clientId} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
