import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import Navbar from '../../components/layout/Navbar';
import ClientHeader from '../../components/layout/ClientHeader';
import Spinner from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { accountsApi } from '../../api/endpoints/accounts';
import { otcApi } from '../../api/endpoints/otc';
import OfferModal from './components/OfferModal';
import PeerOfferModal from './components/PeerOfferModal';
import PeerNegotiationModal from './components/PeerNegotiationModal';
import styles from './OtcPortalPage.module.css';
import { useSearchParams } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import Toast from '../../components/ui/Toast';
import { diffOffers, summarizeEvents } from './utils/otcNotifications';
import { peerOtcApi, getBankName, isSelfPeer } from '../../api/endpoints/peerOtc';

const TAB = {
  DOSTUPNE: 'DOSTUPNE',
  AKTIVNE:  'AKTIVNE',
  SKLOPLJENI: 'SKLOPLJENI',
};

function isExpired(settlementDate) {
  if (!settlementDate) return false;
  return new Date(settlementDate) < new Date();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('sr-RS');
}

function extractArray(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.content)) return res.content;
  return [];
}

function normalizeAccount(a, i) {
  return {
    raw: a,
    number: a.AccountNumber ?? a.accountNumber ?? a.account_number ?? a.number ?? '',
    name: a.Name ?? a.name ?? `Račun ${i + 1}`,
    balance: a.Balance ?? a.balance ?? a.AvailableBalance ?? a.available_balance ?? 0,
    currency: a.Currency?.Code ?? a.currency?.code ?? a.currency ?? '',
  };
}

function getPartyId(user) {
  if (!user) return null;
  return user?.identity_type === 'client'
    ? (user?.client_id ?? user?.id)
    : (user?.employee_id ?? user?.id);
}

function isClientUser(user) {
  return user?.identity_type === 'client';
}

function getExpectedOwnerType(user) {
  return isClientUser(user) ? 'CLIENT' : 'ACTUARY';
}

// ─── Confirm Modal (exercise) ─────────────────────────────────────────────────
function ConfirmModal({ contract, accounts, selectedAccount, onAccountChange, onConfirm, onClose, loading, error }) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Iskoristi opciju</h3>
            <p className={styles.modalText}>Ticker: <strong>{contract.ticker}</strong></p>
          </div>
          <button className={styles.closeIconButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Količina:</span>
              <strong>{contract.amount}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Profit:</span>
              <strong className={contract.profit >= 0 ? styles.pos : styles.neg}>
                {contract.profit >= 0 ? '+' : ''}
                {Number(contract.profit ?? 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
              </strong>
            </div>
          </div>

          {contract.profit < 0 && (
            <div className={styles.infoStrip}>
              ⚠️ Trenutni profit je negativan. Svejedno možete iskoristiti opciju.
            </div>
          )}

          <div className={styles.field}>
            <label>Račun za plaćanje <span className={styles.required}>*</span></label>
            <select value={selectedAccount} onChange={e => onAccountChange(e.target.value)}>
              <option value="">Izaberite račun...</option>
              {accounts.map((a, i) => {
                const num = a.AccountNumber ?? a.account_number ?? a.accountNumber ?? a.number ?? '';
                const name = a.Name ?? a.name ?? `Račun ${i + 1}`;
                const bal = a.Balance ?? a.balance ?? a.AvailableBalance ?? a.available_balance;
                const cur = a.Currency?.Code ?? a.currency ?? '';
                return (
                  <option key={num || i} value={num}>
                    {name}{num ? ` — ${num}` : ''}
                    {bal != null ? ` (${Number(bal).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}${cur ? ` ${cur}` : ''})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {error && <p className={styles.errorText}>{error}</p>}
        </div>

        <div className={styles.formActions}>
          <button className={styles.btnGhost} onClick={onClose} disabled={loading}>Otkaži</button>
          <button className={styles.btnPrimary} onClick={onConfirm} disabled={loading || !selectedAccount}>
            {loading ? 'Slanje...' : 'Potvrdi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Dostupne akcije (OTC Portal) ───────────────────────────────────────
function DostupneAkcije() {
  const POLL_INTERVAL = 30_000;

  const user = useAuthStore(s => s.user);
  const partyId = getPartyId(user);
  const isClient = isClientUser(user);

  const [stocks, setStocks] = useState([]);
  const [peerStockRows, setPeerStockRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offerStock, setOfferStock] = useState(null);
  const [peerOfferStock, setPeerOfferStock] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const intervalRef   = useRef(null);
  const abortRef      = useRef(null);
  const offerStockRef = useRef(null);

  // Keep ref in sync so the polling callback reads the latest value without a stale closure
  useEffect(() => { offerStockRef.current = offerStock; }, [offerStock]);

  async function fetchListings(signal) {
    try {
      const res = await otcApi.getPublicListings({}, signal);
      if (signal?.aborted) return;
      const expectedOwnerType = getExpectedOwnerType(user);
      const list = extractArray(res).filter(
        stock => String(stock.owner_type ?? '').toUpperCase() === expectedOwnerType
      );
      setStocks(list);
    } catch (err) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      throw err;
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    function stopPolling() {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    function startPolling() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        if (document.visibilityState !== 'visible') return;
        if (offerStockRef.current !== null) return;
        abortRef.current?.abort();
        const pollCtrl = new AbortController();
        abortRef.current = pollCtrl;
        fetchListings(pollCtrl.signal).catch(() => {});
      }, POLL_INTERVAL);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        if (offerStockRef.current === null) {
          abortRef.current?.abort();
          const visCtrl = new AbortController();
          abortRef.current = visCtrl;
          fetchListings(visCtrl.signal).catch(() => {});
        }
        startPolling();
      } else {
        stopPolling();
      }
    }

    async function initialLoad() {
      try {
        setLoading(true);
        setError('');
        const accsPromise = isClient
          ? (partyId ? accountsApi.getClientAccounts(partyId).catch(() => []) : Promise.resolve([]))
          : accountsApi.getBankAccounts().catch(() => []);
        let peerRes = [];
        try {
          peerRes = await peerOtcApi.getPublicStocks();
        } catch (err) {
          console.warn('[peerOtc] getPublicStocks failed:', err);
        }
        const [, accsRes] = await Promise.all([
          fetchListings(ctrl.signal),
          accsPromise,
        ]);
        if (ctrl.signal.aborted) return;
        setAccounts(extractArray(accsRes).map(normalizeAccount));
        const rows = extractArray(peerRes).flatMap(ps =>
          (ps.sellers ?? []).map(s => ({
            _isPeer: true,
            ticker: ps.stock?.ticker ?? '—',
            name: ps.stock?.ticker ?? '—',
            owner_name: getBankName(s.seller?.routingNumber),
            bank_name: getBankName(s.seller?.routingNumber),
            available_amount: s.amount,
            price: null,
            _sellerId: s.seller,
          }))
        );
        setPeerStockRows(rows);
      } catch (err) {
        if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError('Nije moguće učitati dostupne akcije.');
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }

    initialLoad().then(() => {
      if (document.visibilityState === 'visible') startPolling();
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      abortRef.current?.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [partyId, isClient]);

  async function handleOfferSubmit(payload) {
    await otcApi.createOffer({
      asset_ownership_id: payload.stockId,
      amount: payload.volumeOfStock,
      price_per_stock_rsd: payload.priceOffer,
      settlement_date: payload.settlementDateOffer,
      premium_rsd: payload.premiumOffer,
      buyer_account_number: payload.buyerAccountNumber,
    });

    setOfferStock(null);
    setSuccessMsg(`Ponuda za ${payload.stock} je uspešno poslata!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  }

  async function handlePeerOfferSubmit(payload) {
    await peerOtcApi.createNegotiation(payload);
    setPeerOfferStock(null);
    setSuccessMsg(`Peer ponuda za ${payload.ticker} je uspešno poslata!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  }

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionEyebrow}>OTC Portal</div>
          <h2 className={styles.sectionTitle}>Dostupne akcije za ponudu</h2>
        </div>
      </div>

      {successMsg && (
        <div className={styles.successBanner}>
          ✓ {successMsg}
          <button className={styles.dismissBtn} onClick={() => setSuccessMsg('')}>✕</button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}><Spinner /></div>
      ) : error ? (
        <div className={styles.errorBox}>{error}</div>
      ) : stocks.length === 0 && peerStockRows.length === 0 ? (
        <div className={styles.emptyTable}>Trenutno nema javno dostupnih akcija za vaš OTC segment.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>TICKER</th>
                <th>NAZIV</th>
                <th>VLASNIK</th>
                <th>BANKA PRODAVCA</th>
                <th>DOSTUPNO</th>
                <th>CENA</th>
                <th style={{ textAlign: 'right' }}>AKCIJA</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock, i) => (
                <tr key={stock.asset_ownership_id ?? stock.id ?? i}>
                  <td className={styles.ticker}>{stock.ticker ?? '—'}</td>
                  <td>{stock.name ?? stock.stock_name ?? '—'}</td>
                  <td>{stock.owner_name ?? '—'}</td>
                  <td>{stock.bank_name ?? '—'}</td>
                  <td>{stock.available_amount ?? stock.public_amount ?? stock.amount ?? '—'}</td>
                  <td>{stock.price != null ? `$${Number(stock.price).toFixed(2)}` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={styles.btnPrimary}
                      onClick={() => setOfferStock(stock)}
                    >
                      Pošalji ponudu
                    </button>
                  </td>
                </tr>
              ))}
              {peerStockRows.map((stock, i) => (
                <tr key={`peer-${stock.ticker}-${i}`}>
                  <td className={styles.ticker}>
                    {stock.ticker}
                    <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 999, background: '#3b82f6', color: 'white', verticalAlign: 'middle' }}>
                      PEER
                    </span>
                  </td>
                  <td>{stock.name}</td>
                  <td>{stock.owner_name}</td>
                  <td>{stock.bank_name}</td>
                  <td>{stock.available_amount ?? '—'}</td>
                  <td>—</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={styles.btnPrimary}
                      onClick={() => setPeerOfferStock(stock)}
                    >
                      Pošalji ponudu
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {offerStock && (
        <OfferModal
          open={true}
          stock={offerStock}
          accounts={accounts}
          onClose={() => setOfferStock(null)}
          onSubmit={handleOfferSubmit}
        />
      )}

      {peerOfferStock && (
        <PeerOfferModal
          open={true}
          ticker={peerOfferStock.ticker}
          sellerId={peerOfferStock._sellerId}
          accounts={accounts}
          onClose={() => setPeerOfferStock(null)}
          onSubmit={handlePeerOfferSubmit}
        />
      )}
    </section>
  );
}

// ─── Tab: Aktivne ponude ──────────────────────────────────────────────────────
function AktivnePonude() {
  const user = useAuthStore(s => s.user);
  const partyId = getPartyId(user);
  const isClient = isClientUser(user);

  const [offers, setOffers] = useState([]);
  const [peerOffers, setPeerOffers] = useState([]);
  const [peerSelected, setPeerSelected] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [modalMode, setModalMode] = useState('view');
  const [counterForm, setCounterForm] = useState({
    amount: '',
    price_per_stock_rsd: '',
    settlement_date: '',
    premium_rsd: '',
  });
  const [sellerAccount, setSellerAccount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  
  const [notifCount, setNotifCount] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [toastOpen, setToastOpen] = useState(false);

  const prevOffersRef = useRef([]);
  const _pollingRef = useRef(null);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    loadOffers();

    async function loadAccounts() {
      if (isClient) {
        const res = partyId
          ? await accountsApi.getClientAccounts(partyId).catch(() => [])
          : [];
        setAccounts(extractArray(res).map(normalizeAccount));
      } else {
        const res = await accountsApi.getBankAccounts().catch(() => []);
        setAccounts(extractArray(res).map(normalizeAccount));
      }
    }

    loadAccounts();
  }, [partyId, isClient]);

  async function loadOffers({ silent = false } = {}) {
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      }

      const [res, peerRes] = await Promise.all([
        otcApi.getMyNegotiations(),
        peerOtcApi.getMyNegotiations().catch(() => []),
      ]);
      const list = extractArray(res);

      if (initialLoadDoneRef.current) {
        const events = diffOffers(prevOffersRef.current, list);
        if (events.length > 0) {
          setNotifCount(c => c + events.length);
          setToastMsg(summarizeEvents(events) ?? 'Imate nove OTC promene.');
          setToastOpen(true);
        }
      } else {
        initialLoadDoneRef.current = true;
      }

      prevOffersRef.current = list;
      setOffers(list);
      setPeerOffers(extractArray(peerRes).map(n => ({ ...n, _isPeer: true })));
    } catch {
      if (!silent) setError('Greška pri učitavanju aktivnih ponuda.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function openModal(offer) {
    setNotifCount(0);
    setSelected(offer);
    setModalMode('view');
    setActionError('');
    setActionSuccess('');
    setSellerAccount('');
    setCounterForm({
      amount: offer.amount ?? '',
      price_per_stock_rsd: offer.price_per_stock_rsd ?? '',
      settlement_date: offer.settlement_date ? offer.settlement_date.slice(0, 10) : '',
      premium_rsd: offer.premium_rsd ?? '',
    });
  }

  function closeModal() {
    setSelected(null);
    setModalMode('view');
    setActionError('');
    setActionSuccess('');
  }

  async function handleAccept() {
    if (!sellerAccount) {
      setActionError('Izaberite račun prodavca.');
      return;
    }
    try {
      setActionLoading(true);
      setActionError('');
      await otcApi.acceptOffer(selected.otc_offer_id, { account_number: sellerAccount });
      setActionSuccess('Ponuda je uspešno prihvaćena.');
      await loadOffers();
      setTimeout(closeModal, 1500);
    } catch (err) {
      setActionError(err?.response?.data?.message ?? 'Greška pri prihvatanju ponude.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    try {
      setActionLoading(true);
      setActionError('');
      await otcApi.rejectOffer(selected.otc_offer_id);
      setActionSuccess('Pregovor je uspešno otkazan.');
      await loadOffers();
      setTimeout(closeModal, 1500);
    } catch {
      setActionError('Greška pri otkazivanju pregovora.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCounter() {
    if (!sellerAccount) {
      setActionError('Morate uneti broj računa za kontraponudu.');
      return;
    }
    try {
      setActionLoading(true);
      setActionError('');

      await otcApi.sendCounterOffer(selected.otc_offer_id, {
        account_number: sellerAccount,
        amount: Number(counterForm.amount),
        premium_rsd: Number(counterForm.premium_rsd),
        price_per_stock_rsd: Number(counterForm.price_per_stock_rsd),
        settlement_date: counterForm.settlement_date
          ? `${counterForm.settlement_date}T00:00:00Z`
          : '',
      });

      setActionSuccess('Kontraponuda je uspešno poslata.');
      await loadOffers();
      setTimeout(closeModal, 1500);
    } catch (err) {
      setActionError(err?.response?.data?.message ?? 'Greška pri slanju kontraponude.');
    } finally {
      setActionLoading(false);
    }
  }

  function getDeviationClass(offer) {
    if (offer.current_price == null || offer.price_per_stock_rsd == null) return '';
    const dev = Math.abs((offer.price_per_stock_rsd - offer.current_price) / offer.current_price) * 100;
    if (dev <= 5) return styles.rowGreen;
    if (dev <= 20) return styles.rowYellow;
    return styles.rowRed;
  }

  function getCounterparty(offer) {
    if (!partyId) return '—';
    if (Number(offer.buyer_id) === Number(partyId)) return `Prodavac (ID: ${offer.seller_id})`;
    if (Number(offer.seller_id) === Number(partyId)) return `Kupac (ID: ${offer.buyer_id})`;
    return `ID: ${offer.buyer_id} / ${offer.seller_id}`;
  }

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionEyebrow}>OTC Ponude i Ugovori</div>
          <h2 className={styles.sectionTitle}>
            Aktivne ponude
            {notifCount > 0 && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: '#ef4444',
                  color: 'white',
                  verticalAlign: 'middle',
                }}
                title="Nove promene"
              >
                {notifCount}
              </span>
            )}
          </h2>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}><Spinner /></div>
      ) : error ? (
        <div className={styles.errorBox}>{error}</div>
      ) : offers.length === 0 && peerOffers.length === 0 ? (
        <div className={styles.emptyTable}>Nema aktivnih pregovora.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>STOCK</th>
                <th>AMOUNT</th>
                <th>PRICE</th>
                <th>SETTLEMENT</th>
                <th>PREMIUM</th>
                <th>PREGOVARA SA</th>
                <th style={{ textAlign: 'right' }}>AKCIJE</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(offer => (
                <tr
                  key={offer.otc_offer_id}
                  className={getDeviationClass(offer)}
                  onClick={() => openModal(offer)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>#{offer.otc_offer_id}</td>
                  <td className={styles.ticker}>{offer.ticker ?? offer.stock_name ?? '—'}</td>
                  <td>{offer.amount ?? '—'}</td>
                  <td>{offer.price_per_stock_rsd != null ? `${Number(offer.price_per_stock_rsd).toFixed(2)} RSD` : '—'}</td>
                  <td>{formatDate(offer.settlement_date)}</td>
                  <td>{offer.premium_rsd != null ? `${Number(offer.premium_rsd).toFixed(2)} RSD` : '—'}</td>
                  <td>{getCounterparty(offer)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.btnPrimary} onClick={e => { e.stopPropagation(); openModal(offer); }}>
                      Detalji
                    </button>
                  </td>
                </tr>
              ))}
              {peerOffers.map(neg => {
                const rn = neg.id?.routingNumber;
                const negId = neg.id?.id;
                const offer = neg.offer ?? {};
                const amBuyer = isSelfPeer(offer.buyerId, user);
                const counterparty = amBuyer
                  ? `Prodavac (${getBankName(offer.sellerId?.routingNumber)})`
                  : `Kupac (${getBankName(offer.buyerId?.routingNumber)})`;
                return (
                  <tr
                    key={`peer-${rn}-${negId}`}
                    onClick={() => setPeerSelected(neg)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, background: '#3b82f6', color: 'white', marginRight: 6 }}>PEER</span>
                      {rn}/{negId?.slice(0, 8)}…
                    </td>
                    <td className={styles.ticker}>{offer.stock?.ticker ?? '—'}</td>
                    <td>{offer.amount ?? '—'}</td>
                    <td>{offer.pricePerUnit ? `${Number(offer.pricePerUnit.amount).toFixed(2)} ${offer.pricePerUnit.currency}` : '—'}</td>
                    <td>{formatDate(offer.settlementDate)}</td>
                    <td>{offer.premium ? `${Number(offer.premium.amount).toFixed(2)} ${offer.premium.currency}` : '—'}</td>
                    <td>{counterparty}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className={styles.btnPrimary} onClick={e => { e.stopPropagation(); setPeerSelected(neg); }}>
                        Detalji
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Ponuda #{selected.otc_offer_id} — {selected.ticker ?? selected.stock_name ?? '—'}
              </h3>
              <button className={styles.closeIconButton} onClick={closeModal}>×</button>
            </div>

            <div className={styles.modalBody}>
              {actionSuccess && <div className={styles.successBanner}>{actionSuccess}</div>}
              {actionError && <p className={styles.errorText}>{actionError}</p>}

              {modalMode === 'view' && (
                <>
                  <div className={styles.summaryGrid}>
                    {[
                      ['Stock', selected.ticker ?? selected.stock_name ?? '—'],
                      ['Amount', selected.amount ?? '—'],
                      ['Price per stock', selected.price_per_stock_rsd != null ? `${Number(selected.price_per_stock_rsd).toFixed(2)} RSD` : '—'],
                      ['Premium', selected.premium_rsd != null ? `${Number(selected.premium_rsd).toFixed(2)} RSD` : '—'],
                      ['Settlement', formatDate(selected.settlement_date)],
                      ['Status', selected.status ?? '—'],
                      ['Pregovara sa', getCounterparty(selected)],
                    ].map(([label, value]) => (
                      <div key={label} className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>{label}:</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className={styles.field}>
                    <label>Vaš račun za naplatu <span className={styles.required}>*</span></label>
                    {accounts.length > 0 ? (
                      <select value={sellerAccount} onChange={e => setSellerAccount(e.target.value)}>
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
                        value={sellerAccount}
                        onChange={e => setSellerAccount(e.target.value)}
                      />
                    )}
                  </div>

                  <div className={styles.formActions}>
                    <button className={styles.btnPrimary} disabled={actionLoading} onClick={handleAccept}>
                      Prihvati
                    </button>
                    <button className={styles.btnGhost} disabled={actionLoading} onClick={() => setModalMode('counter')}>
                      Kontraponuda
                    </button>
                    <button className={styles.btnGhost} disabled={actionLoading} onClick={handleReject}>
                      Odustani
                    </button>
                  </div>
                </>
              )}

              {modalMode === 'counter' && (
                <>
                  <div className={styles.fieldGrid2 ?? styles.field}>
                    {[
                      { key: 'amount', label: 'Amount', type: 'number' },
                      { key: 'price_per_stock_rsd', label: 'Price per stock (RSD)', type: 'number' },
                      { key: 'settlement_date', label: 'Settlement Date', type: 'date' },
                      { key: 'premium_rsd', label: 'Premium (RSD)', type: 'number' },
                    ].map(({ key, label, type }) => (
                      <div key={key} className={styles.field}>
                        <label>{label}</label>
                        <input
                          type={type}
                          value={counterForm[key]}
                          onChange={e => setCounterForm(p => ({ ...p, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>

                  <div className={styles.field}>
                    <label>Vaš račun za naplatu <span className={styles.required}>*</span></label>
                    {accounts.length > 0 ? (
                      <select value={sellerAccount} onChange={e => setSellerAccount(e.target.value)}>
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
                        value={sellerAccount}
                        onChange={e => setSellerAccount(e.target.value)}
                      />
                    )}
                  </div>

                  <div className={styles.formActions}>
                    <button className={styles.btnPrimary} disabled={actionLoading} onClick={handleCounter}>
                      Pošalji kontraponudu
                    </button>
                    <button className={styles.btnGhost} disabled={actionLoading} onClick={() => setModalMode('view')}>
                      Nazad
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {peerSelected && (
        <PeerNegotiationModal
          negotiation={peerSelected}
          user={user}
          onClose={() => setPeerSelected(null)}
          onRefresh={() => loadOffers({ silent: true })}
        />
      )}

      <Toast open={toastOpen} message={toastMsg} onClose={() => setToastOpen(false)} />
    </section>
  );
}

// ─── Tab: Sklopljeni ugovori ──────────────────────────────────────────────────
function SklopljeniUgovori() {
  const user = useAuthStore(s => s.user);
  const partyId = getPartyId(user);
  const isClient = isClientUser(user);

  const [options, setOptions] = useState([]);
  const [peerContracts, setPeerContracts] = useState([]);
  const [peerConfirmModal, setPeerConfirmModal] = useState(null);
  const [peerExerciseAccount, setPeerExerciseAccount] = useState('');
  const [peerExerciseLoading, setPeerExerciseLoading] = useState(false);
  const [peerExerciseError, setPeerExerciseError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('valid');
  const [confirmModal, setConfirmModal] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function loadContracts() {
    try {
      setLoading(true);
      setError('');

      const [res, peerRes] = await Promise.all([
        otcApi.getContracts(),
        peerOtcApi.getMyContracts().catch(() => []),
      ]);
      setOptions(extractArray(res));
      setPeerContracts(extractArray(peerRes).map(c => ({ ...c, _isPeer: true })));

      if (isClient) {
        const accsRes = partyId
          ? await accountsApi.getClientAccounts(partyId).catch(() => [])
          : [];
        setAccounts(extractArray(accsRes).map(normalizeAccount));
      } else {
        const accsRes = await accountsApi.getBankAccounts().catch(() => []);
        setAccounts(extractArray(accsRes).map(normalizeAccount));
      }
    } catch {
      setError('Nije moguće učitati podatke. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContracts();
  }, [partyId, isClient]);

  const filtered = options.filter(o => {
    if (o.status === 'EXERCISED') return false;
    return filter === 'expired'
      ? isExpired(o.settlement_date)
      : !isExpired(o.settlement_date);
  });

  const filteredPeer = peerContracts.filter(c => {
    if (c.status === 'EXERCISED') return false;
    return filter === 'expired'
      ? isExpired(c.settlementDate)
      : !isExpired(c.settlementDate);
  });

  function openModal(contract) {
    setConfirmModal(contract);
    setSelectedAccount('');
    setExerciseError('');
  }

  async function handleExercise() {
    if (!confirmModal || !selectedAccount) return;
    try {
      setExerciseLoading(true);
      setExerciseError('');

      const result = await otcApi.exerciseContract(confirmModal.otc_option_contract_id, {
        account_number: selectedAccount,
      });

      if (result?.status === 'FAILED') {
        setExerciseError(result?.last_error ?? 'SAGA izvršavanje nije uspelo.');
        return;
      }

      setSuccessMsg(`Opcija ${confirmModal.ticker} je uspešno iskorišćena!`);
      setConfirmModal(null);
      await loadContracts();
    } catch (err) {
      setExerciseError(err?.message ?? 'Greška pri iskorišćavanju opcije.');
    } finally {
      setExerciseLoading(false);
    }
  }

  async function handlePeerExercise() {
    if (!peerConfirmModal || !peerExerciseAccount) return;
    const rn = peerConfirmModal.id?.routingNumber;
    const id = peerConfirmModal.id?.id;
    try {
      setPeerExerciseLoading(true);
      setPeerExerciseError('');
      await peerOtcApi.exerciseContract(rn, id, peerExerciseAccount);
      setSuccessMsg(`Peer opcija ${peerConfirmModal.ticker} je uspešno iskorišćena!`);
      setPeerConfirmModal(null);
      await loadContracts();
    } catch (err) {
      setPeerExerciseError(err?.message ?? 'Greška pri iskorišćavanju peer opcije.');
    } finally {
      setPeerExerciseLoading(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionEyebrow}>OTC Ponude i Ugovori</div>
          <h2 className={styles.sectionTitle}>Sklopljeni ugovori</h2>
        </div>
      </div>

      {successMsg && (
        <div className={styles.successBanner}>
          ✓ {successMsg}
          <button className={styles.dismissBtn} onClick={() => setSuccessMsg('')}>✕</button>
        </div>
      )}

      <div className={styles.filterRow}>
        <button
          className={`${styles.filterChip} ${filter === 'valid' ? styles.filterChipActive : ''}`}
          onClick={() => setFilter('valid')}
        >
          Važeći ugovori
        </button>
        <button
          className={`${styles.filterChip} ${filter === 'expired' ? styles.filterChipActive : ''}`}
          onClick={() => setFilter('expired')}
        >
          Istekli ugovori
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingState}><Spinner /></div>
      ) : error ? (
        <div className={styles.errorBox}>{error}</div>
      ) : filtered.length === 0 && filteredPeer.length === 0 ? (
        <div className={styles.emptyTable}>
          Nema {filter === 'expired' ? 'isteklih' : 'važećih'} ugovora.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STOCK</th>
                <th>AMOUNT</th>
                <th>STRIKE PRICE</th>
                <th>PREMIUM</th>
                <th>SETTLEMENT DATE</th>
                <th>SELLER INFO</th>
                <th>PROFIT</th>
                {filter === 'valid' && <th>AKCIJA</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(contract => (
                <tr key={contract.otc_option_contract_id} className={isExpired(contract.settlement_date) ? styles.expiredRow : ''}>
                  <td className={styles.ticker}>{contract.ticker}</td>
                  <td>{contract.amount}</td>
                  <td>{contract.strike_price_rsd}</td>
                  <td>{contract.premium_rsd}</td>
                  <td>{formatDate(contract.settlement_date)}</td>
                  <td>Seller #{contract.seller_id}</td>
                  <td className={contract.profit >= 0 ? styles.pos : styles.neg}>
                    {contract.profit >= 0 ? '+' : ''}
                    {Number(contract.profit ?? 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
                  </td>
                  {filter === 'valid' && (
                    <td>
                      {Number(contract.buyer_id) === Number(partyId) && (
                        <button className={styles.btnPrimary} onClick={() => openModal(contract)}>
                          Iskoristi
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredPeer.map(contract => {
                const rn = contract.id?.routingNumber;
                const cId = contract.id?.id;
                const canExercise = isSelfPeer(contract.buyerId, user);
                return (
                  <tr key={`peer-${rn}-${cId}`} className={isExpired(contract.settlementDate) ? styles.expiredRow : ''}>
                    <td className={styles.ticker}>
                      {contract.ticker}
                      <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 999, background: '#3b82f6', color: 'white', verticalAlign: 'middle' }}>
                        PEER
                      </span>
                    </td>
                    <td>{contract.amount}</td>
                    <td>{contract.strikePrice ? `${Number(contract.strikePrice.amount).toFixed(2)} ${contract.strikePrice.currency}` : '—'}</td>
                    <td>{contract.premium ? `${Number(contract.premium.amount).toFixed(2)} ${contract.premium.currency}` : '—'}</td>
                    <td>{formatDate(contract.settlementDate)}</td>
                    <td>Seller {contract.sellerId?.id?.slice(0, 8)}… ({getBankName(contract.sellerId?.routingNumber)})</td>
                    <td>—</td>
                    {filter === 'valid' && (
                      <td>
                        {canExercise && (
                          <button
                            className={styles.btnPrimary}
                            onClick={() => {
                              setPeerConfirmModal(contract);
                              setPeerExerciseAccount('');
                              setPeerExerciseError('');
                            }}
                          >
                            Iskoristi
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          contract={confirmModal}
          accounts={accounts}
          selectedAccount={selectedAccount}
          onAccountChange={setSelectedAccount}
          onConfirm={handleExercise}
          onClose={() => setConfirmModal(null)}
          loading={exerciseLoading}
          error={exerciseError}
        />
      )}

      {peerConfirmModal && (
        <ConfirmModal
          contract={{ ticker: peerConfirmModal.ticker, amount: peerConfirmModal.amount, profit: 0 }}
          accounts={accounts}
          selectedAccount={peerExerciseAccount}
          onAccountChange={setPeerExerciseAccount}
          onConfirm={handlePeerExercise}
          onClose={() => setPeerConfirmModal(null)}
          loading={peerExerciseLoading}
          error={peerExerciseError}
        />
      )}
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OtcPortalPage() {
  useEffect(() => { document.title = 'RAFBank | OTC Portal'; }, []);
  const pageRef = useRef(null);
  const user = useAuthStore(s => s.user);
  const { isSupervisor } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const isClient = user?.identity_type === 'client';
  const initialTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(
    initialTab && TAB[initialTab] ? initialTab : TAB.DOSTUPNE
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TAB[tab] && tab !== activeTab) {
      setTimeout(() => setActiveTab(tab), 0);
    }
  }, [searchParams, activeTab]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const nodes = pageRef.current?.querySelectorAll('.page-anim');
      if (!nodes?.length) return;
      gsap.from(nodes, {
        opacity: 0,
        y: 20,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, [activeTab]);

  const tabLabel = {
    [TAB.DOSTUPNE]: 'Dostupne akcije',
    [TAB.AKTIVNE]: 'Aktivne ponude',
    [TAB.SKLOPLJENI]: 'Sklopljeni ugovori',
  };

  function handleTabChange(tab) {
    setActiveTab(tab);
    setSearchParams({ tab });
  }

  if (!isClient && !isSupervisor) {
    return (
      <div ref={pageRef} className={styles.stranica}>
        <Navbar />
        <main className={styles.sadrzaj}>
          <section className={`page-anim ${styles.card}`}>
            <div className={styles.emptyTable}>
              OTC portal je dostupan samo klijentima i supervizorima.
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      {isClient ? <ClientHeader activeNav="otc" /> : <Navbar />}

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>OTC</span>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbAktivna}>{tabLabel[activeTab]}</span>
          </div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>OTC Ponude i Ugovori</h1>
              <p className={styles.pageDesc}>
                Pregled dostupnih akcija, aktivnih pregovora i zaključenih opcionih ugovora.
              </p>
            </div>
          </div>
        </div>

        <section className={`page-anim ${styles.tabsCard}`}>
          <div className={styles.tabsRow}>
            {Object.entries(tabLabel).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`${styles.tabButton} ${activeTab === key ? styles.tabButtonActive : ''}`}
                onClick={() => handleTabChange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="page-anim">
          {activeTab === TAB.DOSTUPNE && <DostupneAkcije />}
          {activeTab === TAB.AKTIVNE && <AktivnePonude />}
          {activeTab === TAB.SKLOPLJENI && <SklopljeniUgovori />}
        </div>
      </main>
    </div>
  );
}
