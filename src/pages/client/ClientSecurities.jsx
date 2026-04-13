import { useRef, useLayoutEffect, useState, useMemo, useCallback } from 'react';
import gsap from 'gsap';
import { useAuthStore } from '../../store/authStore';
import { securitiesApi } from '../../api/endpoints/securities';
import { useFetch } from '../../hooks/useFetch';
import SecurityTabs from '../../features/securities/SecurityTabs';
import SecuritiesTable from '../../features/securities/SecuritiesTable';
import SecurityDetails from '../../features/securities/SecurityDetails';
import FiltersPanel, { DEFAULT_FILTERS } from '../../features/securities/FiltersPanel';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Navbar from '../../components/layout/Navbar';
import styles from './ClientSubPage.module.css';
import secStyles from './ClientSecurities.module.css';
import { clientApi } from '../../api/endpoints/client';
import { accountsApi } from '../../api/endpoints/accounts';
import { loansApi } from '../../api/endpoints/loans';


function applyFilters(list, filters, search) {
  return list.filter(sec => {
    if (search) {
      const q = search.toLowerCase();
      if (!sec.ticker?.toLowerCase().includes(q) && !sec.name?.toLowerCase().includes(q)) return false;
    }
    if (filters.exchange && !sec.exchange?.toLowerCase().startsWith(filters.exchange.toLowerCase())) return false;
    if (filters.priceMin !== '' && sec.price < Number(filters.priceMin)) return false;
    if (filters.priceMax !== '' && sec.price > Number(filters.priceMax)) return false;
    if (filters.bidMin   !== '' && sec.bid   < Number(filters.bidMin))   return false;
    if (filters.bidMax   !== '' && sec.bid   > Number(filters.bidMax))   return false;
    if (filters.askMin   !== '' && sec.ask   < Number(filters.askMin))   return false;
    if (filters.askMax   !== '' && sec.ask   > Number(filters.askMax))   return false;
    if (filters.volumeMin !== '' && sec.volume < Number(filters.volumeMin)) return false;
    if (filters.volumeMax !== '' && sec.volume > Number(filters.volumeMax)) return false;
    if (filters.settlementDateFrom && sec.settlementDate && sec.settlementDate < filters.settlementDateFrom) return false;
    if (filters.settlementDateTo   && sec.settlementDate && sec.settlementDate > filters.settlementDateTo)   return false;
    return true;
  });
}

function applySort(list, sortBy, sortDir) {
  if (!sortBy) return list;
  return [...list].sort((a, b) => {
    const av = a[sortBy] ?? 0;
    const bv = b[sortBy] ?? 0;
    return sortDir === 'asc' ? av - bv : bv - av;
  });
}


const ORDER_TYPES = [
  { value: 'MARKET', label: 'Market' },
  { value: 'LIMIT',  label: 'Limit' },
  { value: 'STOP',   label: 'Stop' },
  { value: 'STOP_LIMIT', label: 'Stop Limit' },
];

function OrderModal({ security, activeTab, isEmployee, onClose }) {
  const [qty, setQty] = useState('');
  const [qtyError, setQtyError] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [orderType, setOrderType] = useState('MARKET');
  const [limitValue, setLimitValue] = useState('');
  const [stopValue, setStopValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [afterHours, setAfterHours] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [allOrNone, setAllOrNone] = useState(false);
  const [isMargin, setIsMargin] = useState(false);

  const clientId = useAuthStore(s => s.user?.client_id ?? s.user?.id);
  // Zaposleni koriste bankine račune, klijenti koriste svoje lične račune
  const { data: accountsData } = useFetch(
    () => isEmployee ? accountsApi.getAll() : clientApi.getAccounts(clientId),
    [isEmployee, clientId]
  );
  const accounts = Array.isArray(accountsData) ? accountsData : accountsData?.data ?? [];

  const { data: loansData, loading: loansLoading } = useFetch(
    () => {
      if (!clientId || isEmployee) {
        return Promise.resolve([]);
      }
      return loansApi.getMyLoans(clientId);
    },
    [clientId, isEmployee]
  );

  const loansRaw = Array.isArray(loansData)
    ? loansData
    : loansData?.data ?? [];

  const approvedLoans = loansRaw.filter(
    (loan) => String(loan.status ?? '').toUpperCase() === 'APPROVED'
  );

  const approvedLoanAmount = approvedLoans.reduce((sum, loan) => {
    return sum + Number(loan.amount ?? 0);
  }, 0);

  const loadingLoans = !isEmployee && loansLoading;

  if (!security) return null;

  const label = isEmployee ? 'Kreiraj nalog (tok odobrenja)' : 'Kupi (odmah)';
  const qtyNum = Number(qty) || 0;
  const total = (security.price * qtyNum).toLocaleString('sr-RS', { minimumFractionDigits: 2 });
  const isMarket = orderType === 'MARKET';
  const needsLimit = orderType === 'LIMIT' || orderType === 'STOP_LIMIT';
  const needsStop  = orderType === 'STOP'  || orderType === 'STOP_LIMIT';

  const selectedAccount = accounts.find(a => (a.account_number ?? a.number) === accountNumber);

  function handleQtyChange(e) {
    const raw = e.target.value;
    setQty(raw);
    const n = Number(raw);
    if (raw === '' || isNaN(n)) {
      setQtyError('');
    } else if (n <= 0) {
      setQtyError('Količina mora biti pozitivan broj (veći od 0).');
    } else if (!Number.isInteger(n)) {
      setQtyError('Količina mora biti ceo broj.');
    } else {
      setQtyError('');
    }
  }

  function getRequiredMarginAmount(quantityValue) {
    const qtyNumber = Number(quantityValue || 0);

    const initialMargin =
      Number(security.initialMarginCost ?? security.initial_margin_cost);

    if (!Number.isNaN(initialMargin) && initialMargin > 0) {
      return initialMargin * qtyNumber;
    }

    const maintenanceMargin =
      Number(security.maintenanceMargin ?? security.maintenance_margin);

    if (!Number.isNaN(maintenanceMargin) && maintenanceMargin > 0) {
      return maintenanceMargin * 1.1 * qtyNumber;
    }

    return security.price * qtyNumber;
  }

  function validate() {
    setError('');
    // Block orders on expired futures contracts
    if (security.type === 'FUTURES' && security.settlementDate) {
      if (new Date(security.settlementDate) < new Date()) {
        setError('Nije moguće kreirati order — futures ugovor je istekao.');
        return false;
      }
    }
    if (!accountNumber) { setError('Izaberite račun.'); return false; }

    const n = Number(qty);
    if (!qty || isNaN(n) || n <= 0 || !Number.isInteger(n)) {
      setQtyError('Količina mora biti pozitivan ceo broj (veći od 0).');
      return false;
    }

    if (needsLimit && (!limitValue || Number(limitValue) <= 0)) {
      setError('Unesite validnu limit cenu.'); return false;
    }
    if (needsStop && (!stopValue || Number(stopValue) <= 0)) {
      setError('Unesite validnu stop cenu.'); return false;
    }

    // Provera sredstava
    if (!selectedAccount) {
      const balance = selectedAccount ? Number(selectedAccount.balance ?? selectedAccount.available_balance ?? 0): 0;

      const estimatedTotal = security.price * n;

      if (isMargin) {
        const requiredMarginAmount = getRequiredMarginAmount(n);

        if (!isEmployee) {
          const hasEnoughLoan = approvedLoanAmount >= requiredMarginAmount;
          const hasEnoughCash = balance >= requiredMarginAmount;

          if (!hasEnoughLoan && !hasEnoughCash) {
            setError(
              `Margin order nije dozvoljen. Potrebno je da odobren zajam ili stanje računa pokrije najmanje ${requiredMarginAmount.toLocaleString('sr-RS', {
                minimumFractionDigits: 2,
              })}.`
            );
            return false;
          }
        } else {
          if (balance < requiredMarginAmount) {
            setError(
              `Margin order nije dozvoljen. Zaposleni mora imati dovoljno sredstava na izabranom računu: najmanje ${requiredMarginAmount.toLocaleString('sr-RS', {
                minimumFractionDigits: 2,
              })}.`
            );
            return false;
          }
        }
      } else {
        if (balance < estimatedTotal) {
          setError(
            `Nedovoljno sredstava na računu. Stanje: ${balance.toLocaleString('sr-RS', {
              minimumFractionDigits: 2,
            })}, potrebno: ${estimatedTotal.toLocaleString('sr-RS', {
              minimumFractionDigits: 2,
            })}`
          );
          return false;
        }
      }
    }

    return true;
  }

  function handleProceedToConfirm(e) {
    e.preventDefault();
    if (!validate()) return;
    setShowConfirm(true);
  }

  async function handleConfirmSubmit() {
    setSubmitting(true);
    setError('');

    try {
      const result = await securitiesApi.buy({
        listingId: security.id,
        accountNumber,
        quantity: Number(qty),
        orderType,
        direction: 'BUY',
        limitValue: needsLimit ? Number(limitValue) : 0,
        stopValue: needsStop ? Number(stopValue) : 0,
        allOrNone,
        isMargin,
      });

      setAfterHours(result?.after_hours === true);
      setSubmitted(true);
      setShowConfirm(false);
    } catch (err) {
      setError(err?.message || 'Greška pri kupovini. Pokušajte ponovo.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className={styles.modalHeader}>
          <h3>{isEmployee ? 'Kreiraj nalog' : 'Kupi'} — {security.ticker}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {submitted ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div className={styles.successBanner}>
              {isEmployee
                ? '✓ Order je kreiran i čeka odobrenje.'
                : afterHours
                  ? '✓ Order je kreiran. Izvršiće se kada berza otvori.'
                  : '✓ Order je kreiran i u obradi.'}
            </div>
            {(isEmployee || afterHours) && (
              <p style={{ fontSize: 13, color: 'var(--tx-2)', marginTop: 12 }}>
                {afterHours && !isEmployee
                  ? 'Tržište je zatvoreno. Novac i hartija će biti ažurirani kada berza otvori.'
                  : 'Novac će biti skinut sa računa tek nakon odobrenja.'}
              </p>
            )}
          </div>
        ) : showConfirm ? (
          /* ── Dijalog potvrde ── */
          <div style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx-1)', marginTop: 0, marginBottom: 16 }}>
              Potvrda ordera
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: 'var(--tx-1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tx-2)' }}>Hartija:</span>
                <strong>{security.ticker} — {security.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tx-2)' }}>Broj hartija:</span>
                <strong>{qty}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tx-2)' }}>Tip ordera:</span>
                <strong>{ORDER_TYPES.find(t => t.value === orderType)?.label}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tx-2)' }}>AON:</span>
                <strong>{allOrNone ? 'Da' : 'Ne'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tx-2)' }}>Margin:</span>
                <strong>{isMargin ? 'Da' : 'Ne'}</strong>
              </div>

              {isMargin && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tx-2)' }}>Required margin:</span>
                  <strong>
                    {getRequiredMarginAmount(qty).toLocaleString('sr-RS', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    {security.currency}
                  </strong>
                </div>
              )}

              {isMarket && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tx-2)' }}>Cena:</span>
                  <span style={{ fontStyle: 'italic', color: 'var(--tx-2)' }}>Koristi se tržišna (market) cena</span>
                </div>
              )}
              {needsLimit && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tx-2)' }}>Limit cena:</span>
                  <strong>{Number(limitValue).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} {security.currency}</strong>
                </div>
              )}
              {needsStop && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--tx-2)' }}>Stop cena:</span>
                  <strong>{Number(stopValue).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} {security.currency}</strong>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tx-2)' }}>Približna ukupna cena:</span>
                <strong style={{ fontSize: 16, color: 'var(--accent)' }}>{total} {security.currency}</strong>
              </div>
            </div>

            {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: '12px 0 0' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className={styles.submitBtn}
                style={{ flex: 1, background: 'var(--bg)', color: 'var(--tx-2)', border: '1px solid var(--border)' }}
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                Nazad
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                style={{ flex: 2 }}
                onClick={handleConfirmSubmit}
                disabled={submitting}
              >
                {submitting ? 'Slanje...' : 'Potvrdi'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Forma za kreiranje ── */
          <form className={styles.formCard} style={{ boxShadow: 'none', border: 'none' }} onSubmit={handleProceedToConfirm}>
            <div className={styles.formField}>
              <label>Hartija</label>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                {security.ticker} — {security.name}
              </div>
            </div>

            <div className={styles.formField}>
              <label>Cena po jedinici ({security.currency})</label>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {security.price?.toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className={styles.formField}>
              <label>Tip ordera</label>
              <select
                className={styles.formInput}
                value={orderType}
                onChange={e => setOrderType(e.target.value)}
              >
                {ORDER_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {isMarket && (
                <p style={{ fontSize: 12, color: 'var(--tx-3)', margin: '4px 0 0', fontStyle: 'italic' }}>
                  Koristi se trenutna tržišna (market) cena.
                </p>
              )}
            </div>

            <div className={styles.formField}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={allOrNone}
                  onChange={(e) => setAllOrNone(e.target.checked)}
                />
                All or None (AON)
              </label>
              <p style={{ fontSize: 12, color: 'var(--tx-3)', margin: '4px 0 0' }}>
                Order će biti izvršen samo u celini, ne delimično.
              </p>
            </div>

            <div className={styles.formField}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={isMargin}
                  onChange={(e) => setIsMargin(e.target.checked)}
                />
                Margin
              </label>
              <p style={{ fontSize: 12, color: 'var(--tx-3)', margin: '4px 0 0' }}>
                Margin order koristi odobrene zajmove ako su ispunjeni uslovi.
              </p>

              {!isEmployee && (
                <p style={{ fontSize: 12, color: 'var(--tx-3)', margin: '4px 0 0' }}>
                  {loadingLoans
                    ? 'Učitavanje odobrenih zajmova...'
                    : `Odobren zajam ukupno: ${approvedLoanAmount.toLocaleString('sr-RS', {
                        minimumFractionDigits: 2,
                      })}`}
                </p>
              )}
            </div>

            {needsLimit && (
              <div className={styles.formField}>
                <label>Limit cena ({security.currency})</label>
                <input
                  className={styles.formInput}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Unesite limit cenu..."
                  value={limitValue}
                  onChange={e => setLimitValue(e.target.value)}
                  required
                />
              </div>
            )}

            {needsStop && (
              <div className={styles.formField}>
                <label>Stop cena ({security.currency})</label>
                <input
                  className={styles.formInput}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Unesite stop cenu..."
                  value={stopValue}
                  onChange={e => setStopValue(e.target.value)}
                  required
                />
              </div>
            )}

            <div className={styles.formField}>
              <label>Račun za kupovinu</label>
              <select
                className={styles.formInput}
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                required
              >
                <option value="">Izaberite račun...</option>
                {accounts.map(a => (
                  <option key={a.account_number ?? a.number} value={a.account_number ?? a.number}>
                    {a.name} — {a.account_number ?? a.number}
                    {(a.balance != null) ? ` (${a.balance.toLocaleString('sr-RS', { minimumFractionDigits: 2 })})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label>Količina</label>
              <input
                className={styles.formInput}
                type="number"
                step="1"
                placeholder="Unesite količinu..."
                value={qty}
                onChange={handleQtyChange}
                required
              />
              {qtyError && (
                <p style={{ fontSize: 12, color: 'var(--red)', margin: '4px 0 0', fontWeight: 600 }}>
                  {qtyError}
                </p>
              )}
            </div>

            <div className={styles.formField}>
              <label>Približna ukupna cena ({security.currency})</label>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx-1)' }}>{total}</div>
            </div>

            {isEmployee && (
              <p style={{ fontSize: 12, color: 'var(--tx-3)', margin: 0 }}>
                Order ide na odobrenje. Novac se skida tek nakon odobrenja.
              </p>
            )}

            {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>}

            <button type="submit" className={styles.submitBtn} disabled={submitting || !!qtyError}>
              {submitting ? 'Slanje...' : 'Nastavi'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ClientSecurities() {
  const pageRef = useRef(null);
  const user = useAuthStore(s => s.user);

  const isEmployee    = user?.identity_type === 'employee';
  const canSeeForex   = isEmployee;
  const canSeeOptions = isEmployee;

  const [activeTab, setActiveTab] = useState('STOCK');
  const [selectedSec, setSelectedSec]   = useState(null);
  const [search,      setSearch]         = useState('');
  const [filters,     setFilters]        = useState(DEFAULT_FILTERS);
  const [sortBy,      setSortBy]         = useState('');
  const [sortDir,     setSortDir]        = useState('desc');
  const [orderModal,  setOrderModal]     = useState(null);

 
  const fetcher = useCallback(() => {
    if (activeTab === 'STOCK')   return securitiesApi.getStocks();
    if (activeTab === 'FUTURES') return securitiesApi.getFutures();
    if (activeTab === 'FOREX')   return securitiesApi.getForex();
    if (activeTab === 'OPTIONS') return securitiesApi.getOptions();
    return Promise.resolve([]);
  }, [activeTab]);

  const { data: rawData, loading, error, refetch } = useFetch(fetcher, [activeTab]);

  const securities = Array.isArray(rawData) ? rawData : [];

  const filtered = useMemo(() => applyFilters(securities, filters, search), [securities, filters, search]);
  const sorted   = useMemo(() => applySort(filtered, sortBy, sortDir), [filtered, sortBy, sortDir]);

  //useLayoutEffect(() => {
  //  setSelectedSec(sorted[0] ?? null);
  //}, [activeTab]);   
  useLayoutEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.from('.sec-card', { opacity: 0, y: 18, duration: 0.4, ease: 'power2.out', stagger: 0.06 });
    }, pageRef);
    return () => ctx.revert();
  }, [loading, activeTab]);
/*
  async function handleSelectSecurity(sec) {
    try {
      let details;
      if (activeTab === 'STOCK')   details = await securitiesApi.getStockById(sec.id);
      if (activeTab === 'FUTURES') details = await securitiesApi.getFuturesById(sec.id);
      if (activeTab === 'FOREX')   details = await securitiesApi.getForexById(sec.id);
      setSelectedSec(details ?? sec);
    } catch {
      setSelectedSec(sec);  
    }
  }
*/

  async function handleSelectSecurity(sec) {
    setSelectedSec(sec);
    try {
      let details;
      if (activeTab === 'STOCK')   details = await securitiesApi.getStockById(sec.id);
      if (activeTab === 'FUTURES') details = await securitiesApi.getFuturesById(sec.id);
      if (activeTab === 'FOREX')   details = await securitiesApi.getForexById(sec.id);
      if (details) setSelectedSec(details);
    } catch {
      // fallback to list data
    }
  }
  
  async function handleRefresh(sec) {
    await handleSelectSecurity(sec);
  }

  function handleSort(col) {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    setSelectedSec(null);
    setFilters(DEFAULT_FILTERS);
    setSearch('');
    setSortBy('');
    setSortDir('desc');
  }

  const actionConfig = {
    label:   isEmployee ? 'Kreiraj nalog' : 'Kupi',
    handler: sec => setOrderModal(sec),
  };

  return (
    <div ref={pageRef} className={secStyles.pageContainer}>
      <Navbar />

      <main className={secStyles.pageContent}>
        <div className={styles.pageHeader}>
          <p className={styles.pageEyebrow}>Tržište</p>
          <h1 className={styles.pageTitle}>Hartije od vrednosti</h1>
          <p className={styles.pageSubtitle}>
            Pregled dostupnih hartija, filtriranje, analiza i kupovina / kreiranje ordera.
          </p>
        </div>

        <div className={`sec-card ${secStyles.controlRow}`}>
          <SecurityTabs
            activeTab={activeTab}
            onChange={handleTabChange}
            canSeeForex={canSeeForex}
            canSeeOptions={canSeeOptions}
          />

          <div className={secStyles.searchWrap}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={secStyles.searchIcon}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={secStyles.searchInput}
              placeholder="Pretraži ticker ili naziv..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <FiltersPanel
            activeTab={activeTab}
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        </div>

        {/* ── Sadržaj ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner />
          </div>
        ) : error ? (
          <Alert type="error" message="Nije moguće učitati hartije od vrednosti." />
        ) : (
          <div className={`sec-card ${secStyles.layout}`}>
            <div className={secStyles.tablePane}>
              <SecuritiesTable
                securities={sorted}
                selectedId={selectedSec?.id}
                onSelect={handleSelectSecurity}
                onAction={actionConfig}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </div>

            <div className={secStyles.detailPane}>
              {selectedSec
                ? <SecurityDetails
                    security={selectedSec}
                    isEmployee={isEmployee}
                    onAction={sec => setOrderModal(sec)}
                    onRefresh={handleRefresh}
                  />
                : <p style={{ color: 'var(--tx-3)', padding: '2rem' }}>Izaberite hartiju za detalje.</p>
              }
            </div>
          </div>
        )}
      </main>

      {orderModal && (
        <OrderModal
          security={orderModal}
          activeTab={activeTab}
          isEmployee={isEmployee}
          onClose={() => setOrderModal(null)}
        />
      )}
    </div>
  );
}