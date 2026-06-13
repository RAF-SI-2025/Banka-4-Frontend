import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import Navbar from '../../components/layout/Navbar';
import { otcApi } from '../../api/endpoints/otc';
import { useAuthStore } from '../../store/authStore';
import styles from './OtcPonudePage.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('sr-RS');
}

function getDeviation(offer) {
  const market = offer.market_price ?? offer.listing_price ?? offer.reference_price;
  if (!market || !offer.price_per_stock) return null;
  return Math.abs((offer.price_per_stock - market) / market) * 100;
}

function getRowClass(offer) {
  const dev = getDeviation(offer);
  if (dev === null) return '';
  if (dev <= 5)  return styles.rowGreen;
  if (dev <= 20) return styles.rowYellow;
  return styles.rowRed;
}

export default function OtcPonudePage() {
  useEffect(() => { document.title = 'RAFBank | OTC Ponude'; }, []);
  const pageRef = useRef(null);
  const user    = useAuthStore(s => s.user);

  const [offers, setOffers]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [fetchError, setFetchError]       = useState(null);

  const [selected, setSelected]           = useState(null);
  const [modalMode, setModalMode]         = useState('view');
  const [counterForm, setCounterForm]     = useState({ amount: '', price_per_stock: '', settlement_date: '', premium: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => { loadOffers(); }, []);

  async function loadOffers() {
    try {
      setLoading(true);
      setFetchError(null);
      const res  = await otcApi.getMyNegotiations();
      const list = Array.isArray(res) ? res : (res?.content ?? res?.data ?? []);
      setOffers(list);
    } catch {
      setFetchError('Greška pri učitavanju ponuda.');
    } finally {
      setLoading(false);
    }
  }

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', { opacity: 0, y: 20, duration: 0.4, stagger: 0.08, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, [offers]);

  function openModal(offer) {
    setSelected(offer);
    setModalMode('view');
    setActionError(null);
    setActionSuccess(null);
    setCounterForm({
      amount:          offer.amount          ?? '',
      price_per_stock: offer.price_per_stock  ?? '',
      settlement_date: offer.settlement_date  ? offer.settlement_date.slice(0, 10) : '',
      premium:         offer.premium          ?? '',
    });
  }

  function closeModal() {
    setSelected(null);
    setModalMode('view');
    setActionError(null);
    setActionSuccess(null);
  }

  async function handleAccept() {
    try {
      setActionLoading(true);
      setActionError(null);
      await otcApi.acceptOffer(selected.otc_offer_id);
      setActionSuccess('Ponuda je uspešno prihvaćena.');
      await loadOffers();
      setTimeout(closeModal, 1500);
    } catch {
      setActionError('Greška pri prihvatanju ponude.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    try {
      setActionLoading(true);
      setActionError(null);
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
    try {
      setActionLoading(true);
      setActionError(null);
      await otcApi.sendCounterOffer(selected.otc_offer_id, {
        amount:          Number(counterForm.amount),
        price_per_stock: Number(counterForm.price_per_stock),
        settlement_date: counterForm.settlement_date,
        premium:         Number(counterForm.premium),
      });
      setActionSuccess('Kontraponuda je uspešno poslata.');
      await loadOffers();
      setTimeout(closeModal, 1500);
    } catch {
      setActionError('Greška pri slanju kontraponude.');
    } finally {
      setActionLoading(false);
    }
  }

  function getCounterparty(offer) {
    if (!user) return '-';
    const myId = user.id ?? user.sub;
    if (Number(offer.buyer_id) === Number(myId))  return `Prodavac (ID: ${offer.seller_id})`;
    if (Number(offer.seller_id) === Number(myId)) return `Kupac (ID: ${offer.buyer_id})`;
    return `ID: ${offer.buyer_id} / ${offer.seller_id}`;
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>OTC Ponude i Ugovori</div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Aktivne ponude</h1>
              <p className={styles.pageDesc}>Pregled svih aktivnih OTC pregovora ulogovanog korisnika.</p>
            </div>
          </div>
        </div>

        <div className={`page-anim ${styles.tableCard}`}>
          <div className={styles.cardHeader}>
            <h3>Aktivni pregovori</h3>
            <div className={styles.legend}>
              <span className={styles.legendGreen}>≤5% odstupanje</span>
              <span className={styles.legendYellow}>5–20% odstupanje</span>
              <span className={styles.legendRed}>&gt;20% odstupanje</span>
            </div>
          </div>

          <div className={styles.tableWrap}>
            {loading && <div className={styles.emptyState}>Učitavanje...</div>}
            {!loading && fetchError && <div className={styles.errorState}>{fetchError}</div>}
            {!loading && !fetchError && offers.length === 0 && (
              <div className={styles.emptyState}>Nema aktivnih ponuda.</div>
            )}
            {!loading && !fetchError && offers.length > 0 && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Stock</th>
                    <th>Amount</th>
                    <th>Price per stock</th>
                    <th>Settlement Date</th>
                    <th>Premium</th>
                    <th>Last Modified</th>
                    <th>Modified By</th>
                    <th>Pregovara sa</th>
                    <th style={{ textAlign: 'right' }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map(offer => (
                    <tr
                      key={offer.otc_offer_id}
                      className={`${styles.tableRow} ${getRowClass(offer)}`}
                      onClick={() => openModal(offer)}
                    >
                      <td className={styles.idCell}>#{offer.otc_offer_id}</td>
                      <td className={styles.ticker}>{offer.ticker || offer.stock_name || '-'}</td>
                      <td>{offer.amount ?? '-'}</td>
                      <td className={styles.price}>
                        {offer.price_per_stock != null ? `$${Number(offer.price_per_stock).toFixed(2)}` : '-'}
                      </td>
                      <td>{formatDate(offer.settlement_date)}</td>
                      <td>
                        {offer.premium != null ? `$${Number(offer.premium).toFixed(2)}` : '-'}
                      </td>
                      <td>{formatDate(offer.last_modified)}</td>
                      <td>{offer.modified_by ?? '-'}</td>
                      <td className={styles.counterparty}>{getCounterparty(offer)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={styles.detailBtn}
                          onClick={e => { e.stopPropagation(); openModal(offer); }}
                        >
                          Detalji
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {selected && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Ponuda #{selected.otc_offer_id} — {selected.ticker || selected.stock_name || '-'}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>✕</button>
            </div>

            {actionSuccess && <div className={styles.successAlert}>{actionSuccess}</div>}
            {actionError   && <div className={styles.errorAlert}>{actionError}</div>}

            {modalMode === 'view' && (
              <>
                <div className={styles.modalBody}>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Stock</span>
                      <span>{selected.ticker || selected.stock_name || '-'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Amount</span>
                      <span>{selected.amount ?? '-'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Price per stock</span>
                      <span>{selected.price_per_stock != null ? `$${Number(selected.price_per_stock).toFixed(2)}` : '-'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Premium</span>
                      <span>{selected.premium != null ? `$${Number(selected.premium).toFixed(2)}` : '-'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Settlement Date</span>
                      <span>{formatDate(selected.settlement_date)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Last Modified</span>
                      <span>{formatDate(selected.last_modified)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Modified By</span>
                      <span>{selected.modified_by ?? '-'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Pregovara sa</span>
                      <span>{getCounterparty(selected)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Status</span>
                      <span>{selected.status ?? '-'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Buyer account</span>
                      <span>{selected.buyer_account_number || '-'}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.acceptBtn}  disabled={actionLoading} onClick={handleAccept}>
                    Prihvati ponudu
                  </button>
                  <button className={styles.counterBtn} disabled={actionLoading} onClick={() => setModalMode('counter')}>
                    Posalji kontraponudu
                  </button>
                  <button className={styles.cancelBtn}  disabled={actionLoading} onClick={handleReject}>
                    Odustani od pregovora
                  </button>
                </div>
              </>
            )}

            {modalMode === 'counter' && (
              <>
                <div className={styles.modalBody}>
                  <h4 className={styles.formTitle}>Nova kontraponuda</h4>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Amount</label>
                      <input
                        type="number"
                        className={styles.formInput}
                        value={counterForm.amount}
                        onChange={e => setCounterForm(p => ({ ...p, amount: e.target.value }))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Price per stock</label>
                      <input
                        type="number"
                        className={styles.formInput}
                        value={counterForm.price_per_stock}
                        onChange={e => setCounterForm(p => ({ ...p, price_per_stock: e.target.value }))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Settlement Date</label>
                      <input
                        type="date"
                        className={styles.formInput}
                        value={counterForm.settlement_date}
                        onChange={e => setCounterForm(p => ({ ...p, settlement_date: e.target.value }))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Premium</label>
                      <input
                        type="number"
                        className={styles.formInput}
                        value={counterForm.premium}
                        onChange={e => setCounterForm(p => ({ ...p, premium: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.acceptBtn} disabled={actionLoading} onClick={handleCounter}>
                    Posalji kontraponudu
                  </button>
                  <button className={styles.removeBtn} disabled={actionLoading} onClick={() => setModalMode('view')}>
                    Nazad
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
