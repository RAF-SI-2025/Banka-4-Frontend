import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import Alert from '../../components/ui/Alert';
import CardVisual from '../../features/cards/CardVisual';
import CardDetailsPanel from '../../features/cards/CardDetailsPanel';
import CardRequestModal from '../../features/cards/CardRequestModal';
import TwoFactorModal from '../../features/cards/TwoFactorModal';
import { cardsApi } from '../../api/endpoints/cards';
import { clientsApi } from '../../api/endpoints/clients';
import { clientApi } from '../../api/endpoints/client';
import { useAuthStore } from '../../store/authStore';
import {
  CARD_STATUS,
  PORTAL_TYPE,
  formatDate,
  formatLimit,
  getAllowedActions,
  normalizeCard,
} from '../../utils/cardHelpers';
import styles from './CardsPage.module.css';
import Navbar from '../../components/layout/Navbar';
import ClientHeader from '../../components/layout/ClientHeader';

const VIEW_MODE = {
  OVERVIEW: 'overview',
  DETAILS: 'details',
};

export default function CardsPage({ portalType = PORTAL_TYPE.CLIENT }) {
  useEffect(() => { document.title = 'RAFBank | Kartice'; }, []);
  const pageRef = useRef(null);
  const user = useAuthStore((s) => s.user);

  const [cards, setCards] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState(VIEW_MODE.OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [submitting2FA, setSubmitting2FA] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [cardActionLoadingId, setCardActionLoadingId] = useState(null);

  // Admin: client selection
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [_loadingClients, setLoadingClients] = useState(false);

  const isAdmin = portalType === PORTAL_TYPE.ADMIN;

  // Load clients for admin
  useEffect(() => {
    if (!isAdmin) return;
    setLoadingClients(true);
    clientsApi.getAll()
      .then(res => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        setClients(list);
      })
      .catch(() => {})
      .finally(() => setLoadingClients(false));
  }, [isAdmin]);

  // Determine which client ID to use
  const activeClientId = isAdmin ? selectedClientId : user?.id;

  // Load accounts when client is selected
  useEffect(() => {
    if (!activeClientId) { setAccounts([]); return; }
    clientApi.getAccounts(activeClientId)
      .then(res => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        setAccounts(list);
      })
      .catch(() => setAccounts([]));
  }, [activeClientId]);

  // Load cards for all accounts of the active client
  useEffect(() => {
    if (!activeClientId || accounts.length === 0) {
      setCards([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all(
      accounts.map(acc => {
        const accNum = acc.account_number ?? acc.number;
        return cardsApi.getByAccount(activeClientId, accNum)
          .then(res => {
            const cardsList = res?.cards ?? (Array.isArray(res) ? res : res?.data ?? []);
            return cardsList.map(c => normalizeCard({ ...c, account_number: c.account_number ?? accNum, account_name: c.account_name ?? acc.name }));
          })
          .catch(() => []);
      })
    ).then(results => {
      if (!mounted) return;
      const allCards = results.flat();
      setCards(allCards);
      setSelectedIndex(0);
    }).finally(() => {
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, [activeClientId, accounts]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const nodes = pageRef.current?.querySelectorAll('.page-anim');
      if (!nodes?.length) return;
      gsap.from(nodes, {
        opacity: 0, y: 20, duration: 0.45, stagger: 0.08, ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, [viewMode, activeClientId]);

  const selectedCard = useMemo(() => {
    if (cards.length === 0) return null;
    return cards[selectedIndex] ?? cards[0] ?? null;
  }, [cards, selectedIndex]);

  // Check if all accounts have hit their card limit (for disabling "Zatraži novu")
  const allAccountsMaxed = useMemo(() => {
    if (accounts.length === 0) return false;
    return accounts.every(acc => {
      const num = acc.account_number ?? acc.number;
      const type = (acc.account_type ?? acc.type ?? '').toUpperCase();
      const isBiz = type.includes('BUSINESS') || type.includes('POSLOVNI') || !!acc.company_name;
      if (isBiz) return false; // business accounts allow per-person cards
      const accCards = cards.filter(c => c.accountNumber === num);
      return accCards.length >= 2;
    });
  }, [accounts, cards]);

  function moveSelection(direction) {
    setSelectedIndex((prev) => {
      if (cards.length === 0) return 0;
      if (direction === 'prev') return prev === 0 ? cards.length - 1 : prev - 1;
      return prev === cards.length - 1 ? 0 : prev + 1;
    });
  }

  function openDetails() { setViewMode(VIEW_MODE.DETAILS); }
  function goBackToOverview() { setViewMode(VIEW_MODE.OVERVIEW); }
  function openRequestModal() { setRequestModalOpen(true); }

  async function handleRequestContinue(formData) {
    const payload = { account_number: formData.accountNumber };
    if (formData.authorizedPerson) {
      payload.authorized_person = formData.authorizedPerson;
    }
    try {
      await cardsApi.request(payload);
    } catch (err) {
      setFeedback({ type: 'greska', text: err?.message || 'Slanje zahteva nije uspelo.' });
      return;
    }
    setPendingRequest(formData);
    setRequestModalOpen(false);
    setTwoFactorOpen(true);
  }

  async function handleConfirm2FA(code) {
    if (!pendingRequest) return;
    setSubmitting2FA(true);
    try {
      await cardsApi.confirmRequest({
        account_number: pendingRequest.accountNumber,
        confirmation_code: code,
      });
      // Reload cards for that account
      const accNum = pendingRequest.accountNumber;
      const newCards = await cardsApi.getByAccount(activeClientId, accNum)
        .then(res => {
          const cardsList = res?.cards ?? (Array.isArray(res) ? res : res?.data ?? []);
          return cardsList.map(c => normalizeCard({ ...c, account_number: c.account_number ?? accNum }));
        })
        .catch(() => []);

      setCards(prev => {
        const withoutAccount = prev.filter(c => c.accountNumber !== accNum);
        return [...withoutAccount, ...newCards];
      });
      setTwoFactorOpen(false);
      setPendingRequest(null);
      setFeedback({ type: 'uspeh', text: 'Kartica je uspešno kreirana.' });
    } catch (err) {
      setFeedback({ type: 'greska', text: err?.message || 'Potvrda zahteva nije uspela.' });
    } finally {
      setSubmitting2FA(false);
    }
  }

  async function handleSaveLimits(cardId, limitsData) {
    try {
      await cardsApi.changeLimits(cardId, limitsData);
      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card;
          return {
            ...card,
            limitDaily: limitsData.daily_limit ?? card.limitDaily,
            limitMonthly: limitsData.monthly_limit ?? card.limitMonthly,
          };
        })
      );
      setFeedback({ type: 'uspeh', text: 'Limiti kartice su uspešno promenjeni.' });
    } catch (err) {
      setFeedback({ type: 'greska', text: err?.message || 'Promena limita nije uspela.' });
    }
  }

  async function handleAction(cardId, actionKey) {
    try {
      setCardActionLoadingId(cardId);
      if (actionKey === 'block') await cardsApi.block(cardId);
      if (actionKey === 'unblock') await cardsApi.unblock(cardId);
      if (actionKey === 'deactivate') await cardsApi.deactivate(cardId);

      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card;
          if (actionKey === 'block') return { ...card, status: CARD_STATUS.BLOCKED };
          if (actionKey === 'unblock') return { ...card, status: CARD_STATUS.ACTIVE };
          if (actionKey === 'deactivate') return { ...card, status: CARD_STATUS.DEACTIVATED };
          return card;
        })
      );
      setFeedback({ type: 'uspeh', text: 'Akcija nad karticom je uspešno izvršena.' });
    } catch (err) {
      setFeedback({ type: 'greska', text: err?.message || 'Akcija trenutno nije uspela.' });
    } finally {
      setCardActionLoadingId(null);
    }
  }

  return (
    <div ref={pageRef} className={styles.page}>
      {isAdmin ? <Navbar /> : <ClientHeader activeNav="cards" />}
      <main className={styles.sadrzaj}>

      {error && <div className="page-anim"><Alert tip="greska" poruka={error} /></div>}
      {feedback && <div className="page-anim"><Alert tip={feedback.type} poruka={feedback.text} /></div>}

      {/* Admin: client selector */}
      {isAdmin && (
        <div className={`page-anim ${styles.topBar}`} style={{ marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-2)', marginBottom: 6, display: 'block' }}>
              Izaberite klijenta
            </label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              style={{
                width: '100%', maxWidth: 400, height: 42, padding: '0 12px',
                border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
                fontSize: 14, background: 'var(--surface)',
              }}
            >
              <option value="">-- Izaberite klijenta --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} — {c.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* No client selected */}
      {!activeClientId && (
        <div className={styles.emptyState}>
          {isAdmin ? 'Izaberite klijenta da vidite kartice.' : 'Nema dostupnih kartica.'}
        </div>
      )}

      {/* Loading */}
      {activeClientId && loading && (
        <div className={styles.loadingState}>Učitavanje kartica...</div>
      )}

      {/* No cards */}
      {activeClientId && !loading && cards.length === 0 && (
        <div className={`page-anim ${styles.topBar}`}>
          <div>
            <h1 className={styles.pageTitle}>Kartice</h1>
            <p className={styles.pageDescription}>{isAdmin ? 'Klijent nema kartica.' : 'Nemate kartica.'}</p>
          </div>
          {!isAdmin && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={openRequestModal}
              disabled={allAccountsMaxed}
            >
              {allAccountsMaxed ? 'Dostignut limit' : 'Zatraži novu'}
            </button>
          )}
        </div>
      )}

      {/* Has cards */}
      {activeClientId && !loading && selectedCard && (
        <>
          {viewMode === VIEW_MODE.OVERVIEW ? (
            <>
              <div className={`page-anim ${styles.topBar}`}>
                <div>
                  <h1 className={styles.pageTitle}>Kartice</h1>
                  <p className={styles.pageDescription}>Upravljajte platnim karticama</p>
                </div>
                {!isAdmin && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={openRequestModal}
                    disabled={allAccountsMaxed}
                  >
                    {allAccountsMaxed ? 'Dostignut limit' : 'Zatraži novu'}
                  </button>
                )}
              </div>

              <section className={`page-anim ${styles.heroSection}`}>
                <div className={styles.heroControls}>
                  <button type="button" className={styles.navCircle} onClick={() => moveSelection('prev')}>‹</button>
                  <button type="button" className={styles.navCircle} onClick={() => moveSelection('next')}>›</button>
                  <div className={styles.paginationDots}>
                    {cards.map((card, index) => (
                      <button
                        key={card.id}
                        type="button"
                        className={`${styles.dot} ${index === selectedIndex ? styles.dotActive : ''}`}
                        onClick={() => setSelectedIndex(index)}
                      />
                    ))}
                  </div>
                </div>
                <div className={styles.cardRow}>
                  <div className={styles.cardWrap}>
                    <CardVisual card={selectedCard} onOpenDetails={openDetails} />
                  </div>

                  {/* Client: make "Block card" discoverable on overview */}
                  {!isAdmin && selectedCard && getAllowedActions(selectedCard.status, portalType).some(a => a.key === 'block') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 240 }}>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        disabled={cardActionLoadingId === selectedCard.id}
                        onClick={() => handleAction(selectedCard.id, 'block')}
                        style={{ background: 'var(--red)', boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)' }}
                      >
                        {cardActionLoadingId === selectedCard.id ? 'Blokiranje...' : 'Blokiraj karticu'}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className={`page-anim ${styles.transactionsCard}`}>
                <div className={styles.transactionsHeader}>
                  <p className={styles.eyebrow}>Pregled transakcija</p>
                  <span className={styles.transactionsLink}>Transakcije</span>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Bankovni račun</th><th>Datum</th><th>Status</th><th>Iznos</th></tr></thead>
                    <tbody>
                      {(selectedCard.transactions ?? []).length === 0 ? (
                        <tr><td colSpan="4" className={styles.emptyTable}>Nema transakcija za prikaz.</td></tr>
                      ) : (
                        selectedCard.transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>{tx.accountName}</td>
                            <td>{formatDate(tx.date)}</td>
                            <td><span className={`${styles.transactionStatus} ${styles[`transaction_${tx.status}`]}`}>{tx.status}</span></td>
                            <td>{formatLimit(tx.amount)} RSD</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="page-anim">
                <div className={styles.breadcrumb}>
                  <button type="button" className={styles.breadcrumbBack} onClick={goBackToOverview}>← Kartice</button>
                  <span className={styles.breadcrumbSep}>/</span>
                  <span className={styles.breadcrumbCurrent}>Detalji</span>
                </div>
                <h1 className={styles.pageTitle}>Detalji kartice</h1>
                <p className={styles.pageDescription}>Pregled svih informacija o odabranoj kartici</p>
              </div>
              <section className={`page-anim ${styles.detailsPageWrap}`}>
                <CardDetailsPanel
                  card={selectedCard}
                  portalType={portalType}
                  onAction={handleAction}
                  onSaveLimits={handleSaveLimits}
                  onBack={goBackToOverview}
                />
              </section>
            </>
          )}
        </>
      )}
      </main>

      <CardRequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onContinue={handleRequestContinue}
        cards={cards}
        selectedCard={selectedCard}
        accounts={accounts}
      />

      <TwoFactorModal
        open={twoFactorOpen}
        onClose={() => setTwoFactorOpen(false)}
        onConfirm={handleConfirm2FA}
        loading={submitting2FA}
      />
    </div>
  );
}
