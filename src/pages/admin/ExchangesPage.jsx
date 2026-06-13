import { useRef, useLayoutEffect, useState, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import { stockExchangeApi } from '../../api/endpoints/exchange';
import { useFetch } from '../../hooks/useFetch';
import Navbar from '../../components/layout/Navbar';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Pagination from '../../components/ui/Pagination';
import styles from './ExchangesPage.module.css';

const PAGE_SIZE = 12;

function isExchangeOpen(exchange) {
  if (!exchange.open_time || !exchange.close_time) return null;

  const now = new Date();
  const tz = exchange.time_zone ?? 0;

  const utcH = now.getUTCHours() + tz;
  const utcM = now.getUTCMinutes();
  const nowMinutes = ((utcH % 24) + 24) % 24 * 60 + utcM;

  const [oh, om] = exchange.open_time.split(':').map(Number);
  const [ch, cm] = exchange.close_time.split(':').map(Number);
  const openMin  = oh * 60 + (om || 0);
  const closeMin = ch * 60 + (cm || 0);

  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;

  return nowMinutes >= openMin && nowMinutes < closeMin;
}

export default function ExchangesPage() {
  useEffect(() => { document.title = 'RAFBank | Kursna lista'; }, []);
  const ref = useRef(null);
  const [toggling, setToggling] = useState(null);
  const [exchanges, setExchanges] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetcher = useCallback(
    () => stockExchangeApi.getAll({ page, page_size: PAGE_SIZE }),
    [page]
  );
  const { data: rawData, loading, error } = useFetch(fetcher, [page]);

  useEffect(() => {
    const list = Array.isArray(rawData) ? rawData : rawData?.data ?? [];
    setExchanges(list);
    if (rawData?.total != null) setTotal(rawData.total);
  }, [rawData]);

  useLayoutEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.from('.exc-anim', { opacity: 0, y: 14, duration: 0.35, stagger: 0.05, ease: 'power2.out' });
    }, ref);
    return () => ctx.revert();
  }, [loading]);

  async function handleToggle(micCode) {
    setToggling(micCode);
    try {
      const updated = await stockExchangeApi.toggle(micCode);
      setExchanges(prev =>
        prev.map(ex => ex.mic_code === micCode ? { ...ex, trading_enabled: updated.trading_enabled } : ex)
      );
    } catch (err) {
      console.error('Toggle error:', err);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div ref={ref} className={styles.page}>
      <Navbar />
      <main className={styles.content}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Administracija</p>
          <h1 className={styles.title}>Lista berzi</h1>
          <p className={styles.subtitle}>Pregled svih berzi, radno vreme i status trgovanja.</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner />
          </div>
        ) : error ? (
          <Alert tip="greska" poruka="Nije moguće učitati listu berzi." />
        ) : exchanges.length === 0 ? (
          <Alert tip="info" poruka="Nema dostupnih berzi." />
        ) : (
          <>
            <div className={styles.grid}>
              {exchanges.map((ex) => {
                const openStatus = isExchangeOpen(ex);
                return (
                  <div key={ex.mic_code} className={`exc-anim ${styles.card}`}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardName}>{ex.name || ex.acronym}</h3>
                        <span className={styles.cardMic}>{ex.mic_code}</span>
                      </div>
                      <div className={styles.statusGroup}>
                        {openStatus === true && (
                          <span className={styles.statusOpen}>Otvorena</span>
                        )}
                        {openStatus === false && (
                          <span className={styles.statusClosed}>Zatvorena</span>
                        )}
                        {openStatus === null && (
                          <span className={styles.statusUnknown}>N/A</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.infoRow}>
                        <span className={styles.label}>Akronim</span>
                        <span className={styles.value}>{ex.acronym || '—'}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.label}>Država</span>
                        <span className={styles.value}>{ex.polity || '—'}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.label}>Valuta</span>
                        <span className={styles.value}>{ex.currency || '—'}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.label}>Radno vreme</span>
                        <span className={styles.value}>
                          {ex.open_time && ex.close_time
                            ? `${ex.open_time} — ${ex.close_time}`
                            : '—'}
                        </span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.label}>Vremenska zona</span>
                        <span className={styles.value}>UTC{ex.time_zone >= 0 ? '+' : ''}{ex.time_zone ?? '—'}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.label}>Primena radnog vremena</span>
                        <span className={`${styles.value} ${ex.trading_enabled ? styles.tradingOn : styles.tradingOff}`}>
                          {ex.trading_enabled ? 'Uključena' : 'Isključena'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <button
                        className={ex.trading_enabled ? styles.disableBtn : styles.enableBtn}
                        onClick={() => handleToggle(ex.mic_code)}
                        disabled={toggling === ex.mic_code}
                      >
                        {toggling === ex.mic_code
                          ? 'Čekajte...'
                          : ex.trading_enabled ? 'Isključi primenu radnog vremena' : 'Uključi primenu radnog vremena'
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </main>
    </div>
  );
}
