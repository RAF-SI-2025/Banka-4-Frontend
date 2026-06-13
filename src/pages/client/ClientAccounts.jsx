import { useRef, useLayoutEffect, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { clientApi } from '../../api/endpoints/client';
import { paymentsApi } from '../../api/endpoints/payments';
import { accountsApi } from '../../api/endpoints/accounts';
import { useFetch } from '../../hooks/useFetch';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../../components/ui/Spinner';
import ClientHeader from '../../components/layout/ClientHeader';
import styles from './ClientAccounts.module.css';

function formatAmount(amount, currency = 'RSD') {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount)) + ' ' + currency;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ═══════════════════════════════════════════
   RENAME POPUP
   ═══════════════════════════════════════════ */
function RenamePopup({ account, clientId, onSaved, onClose }) {
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    const trimmed = newName.trim();
    if (!trimmed) { setError('Unesite novi naziv računa.'); return; }
    try {
      setSaving(true);
      await accountsApi.updateName(clientId, account.account_number, trimmed);
      setSuccess(true);
      setTimeout(() => onSaved(trimmed), 1500);
    } catch (err) {
      setError(err?.message ?? err?.error ?? 'Greška pri promeni naziva.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalSmall} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Promena naziva računa</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {success ? (
            <div className={styles.successMsg}>
              <div className={styles.successIcon}>✓</div>
              <p>Naziv računa je uspešno promenjen!</p>
            </div>
          ) : (
            <>
              <div className={styles.formField}>
                <label>Trenutni naziv</label>
                <input type="text" className={styles.formInput} value={account.name} readOnly />
              </div>
              <div className={styles.formField}>
                <label>Novo ime računa</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Unesite novi naziv"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); if (error) setError(''); }}
                />
              </div>
              {error && <p className={styles.errorMsg}>{error}</p>}
              <div className={styles.modalActions}>
                <button className={styles.btnGhost} onClick={onClose}>Odustani</button>
                <button className={styles.btnPrimary} disabled={saving} onClick={handleSave}>
                  {saving ? 'Čuvanje...' : 'Sačuvaj'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LIMIT CHANGE MODAL (with OTP verification)
   ═══════════════════════════════════════════ */
function LimitChangeModal({ account, clientId, onSaved, onClose }) {
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'done'
  const [dailyLimit, setDailyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDailyLimit(String(account.daily_limit ?? ''));
    setMonthlyLimit(String(account.monthly_limit ?? ''));
  }, [account]);

  async function handleRequestOtp() {
    const daily = Number(dailyLimit);
    const monthly = Number(monthlyLimit);
    if (Number.isNaN(daily) || Number.isNaN(monthly) || daily < 0 || monthly < 0) {
      setError('Unesite validne pozitivne vrednosti.'); return;
    }
    if (daily > monthly) {
      setError('Dnevni limit ne može biti veći od mesečnog.'); return;
    }
    try {
      setLoading(true);
      setError('');
      await accountsApi.requestLimitChange(clientId, account.account_number, {
        daily_limit: daily, monthly_limit: monthly,
      });
      setStep('otp');
    } catch (err) {
      setError(err?.message ?? err?.error ?? 'Greška pri slanju zahteva.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!/^\d{6}$/.test(code)) { setError('Unesite ispravan 6-cifren kod.'); return; }
    try {
      setLoading(true);
      setError('');
      await accountsApi.confirmLimitChange(clientId, account.account_number, code);
      setStep('done');
      setTimeout(() => onSaved({ daily_limit: Number(dailyLimit), monthly_limit: Number(monthlyLimit) }), 1500);
    } catch (err) {
      setError(err?.message ?? err?.error ?? 'Pogrešan kod ili greška.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalSmall} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Promena limita</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {step === 'done' ? (
            <div className={styles.successMsg}>
              <div className={styles.successIcon}>✓</div>
              <p>Limiti su uspešno promenjeni!</p>
            </div>
          ) : step === 'otp' ? (
            <>
              <p className={styles.otpNote}>Verifikacioni kod je poslat na vaš email/telefon.</p>
              <div className={styles.formField}>
                <label>6-cifren kod</label>
                <input
                  type="text"
                  maxLength={6}
                  className={styles.formInput}
                  placeholder="000000"
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '')); if (error) setError(''); }}
                />
              </div>
              {error && <p className={styles.errorMsg}>{error}</p>}
              <div className={styles.modalActions}>
                <button className={styles.btnGhost} onClick={() => { setStep('form'); setError(''); }}>Nazad</button>
                <button className={styles.btnPrimary} disabled={loading} onClick={handleConfirm}>
                  {loading ? 'Potvrda...' : 'Potvrdi'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.formField}>
                <label>Dnevni limit ({account.currency})</label>
                <input
                  type="number" min="0" className={styles.formInput}
                  value={dailyLimit}
                  onChange={e => { setDailyLimit(e.target.value); if (error) setError(''); }}
                />
              </div>
              <div className={styles.formField}>
                <label>Mesečni limit ({account.currency})</label>
                <input
                  type="number" min="0" className={styles.formInput}
                  value={monthlyLimit}
                  onChange={e => { setMonthlyLimit(e.target.value); if (error) setError(''); }}
                />
              </div>
              {error && <p className={styles.errorMsg}>{error}</p>}
              <div className={styles.modalActions}>
                <button className={styles.btnGhost} onClick={onClose}>Odustani</button>
                <button className={styles.btnPrimary} disabled={loading} onClick={handleRequestOtp}>
                  {loading ? 'Slanje...' : 'Nastavi'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ACCOUNT DETAILS MODAL (full spec)
   ═══════════════════════════════════════════ */
function AccountDetailsModal({ account, clientId: _clientId, onClose, onOpenRename, onOpenLimits, onNavigatePayment }) {
  if (!account) return null;

  const balance = account.balance ?? 0;
  const reserved = account.reserved_funds ?? 0;
  const available = account.available_balance ?? (balance - reserved);

  const isBusiness = (account.account_type ?? '').toUpperCase() === 'BUSINESS' || !!account.company_name;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Detalji računa</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>

          {/* Business account: company info */}
          {isBusiness && (
            <div className={styles.businessSection}>
              <h4 className={styles.sectionLabel}>Podaci o preduzeću</h4>
              <div className={styles.detailsGrid}>
                <DetailRow label="Naziv firme" value={account.company_name ?? '—'} />
                <DetailRow label="PIB" value={account.pib ?? account.tax_id ?? '—'} />
                <DetailRow label="Matični broj" value={account.mb ?? account.registration_number ?? '—'} />
              </div>
              <div className={styles.sectionDivider} />
            </div>
          )}

          {/* Basic info */}
          <h4 className={styles.sectionLabel}>Osnovno</h4>
          <div className={styles.detailsGrid}>
            <DetailRow label="Naziv računa" value={account.name} />
            <DetailRow label="Broj računa" value={account.account_number} />
            <DetailRow label="Vlasnik" value={account.owner_name ?? account.owner ?? '—'} />
            <DetailRow label="Tip računa" value={account.account_type ?? account.type ?? '—'} />
          </div>

          <div className={styles.sectionDivider} />

          {/* Financial info */}
          <h4 className={styles.sectionLabel}>Finansije</h4>
          <div className={styles.detailsGrid}>
            <DetailRow label="Stanje računa" value={formatAmount(balance, account.currency)} highlight />
            <DetailRow label="Rezervisana sredstva" value={formatAmount(reserved, account.currency)} />
            <DetailRow label="Raspoloživo stanje" value={formatAmount(available, account.currency)} highlight />
          </div>

          <div className={styles.sectionDivider} />

          {/* Action buttons */}
          <h4 className={styles.sectionLabel}>Opcije</h4>
          <div className={styles.actionsList}>
            <button className={styles.actionRow} onClick={() => { onClose(); onNavigatePayment(account); }}>
              <span>Novo plaćanje</span>
              <span className={styles.actionArrow}>›</span>
            </button>
            <button className={styles.actionRow} onClick={() => { onClose(); onOpenLimits(account); }}>
              <span>Promena limita</span>
              <span className={styles.actionArrow}>›</span>
            </button>
            <button className={styles.actionRow} onClick={() => { onClose(); onOpenRename(account); }}>
              <span>Promena naziva računa</span>
              <span className={styles.actionArrow}>›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={`${styles.detailValue} ${highlight ? styles.detailHighlight : ''}`}>{value ?? '—'}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function ClientAccounts() {
  useEffect(() => { document.title = 'RAFBank | Moji računi'; }, []);
  const pageRef = useRef(null);
  const navigate = useNavigate();
  const clientId = useAuthStore(s => s.user?.client_id ?? s.user?.id);

  const { data: accountsData, loading: loadingAccounts } = useFetch(() => clientApi.getAccounts(clientId), [clientId]);
  const rawAccounts = Array.isArray(accountsData) ? accountsData : accountsData?.data ?? [];

  const [accountSortBy, setAccountSortBy] = useState('balance');

  // Filter active + sort by criteria
  const accounts = useMemo(() => {
    return rawAccounts.filter(a => !a.status || a.status === 'ACTIVE').sort((a, b) => {
      if (accountSortBy === 'balance') return (b.balance ?? 0) - (a.balance ?? 0);
      if (accountSortBy === 'available') {
        const availA = (a.balance ?? 0) - (a.reserved_funds ?? 0);
        const availB = (b.balance ?? 0) - (b.reserved_funds ?? 0);
        return availB - availA;
      }
      if (accountSortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });
  }, [rawAccounts, accountSortBy]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [detailsAccount, setDetailsAccount] = useState(null);
  const [renameAccount, setRenameAccount] = useState(null);
  const [limitsAccount, setLimitsAccount] = useState(null);
  const [sortBy, setSortBy] = useState('date_desc');
  const [_loadingDetails, setLoadingDetails] = useState(false);

  const selectedAccount = accounts[selectedIdx];
  const selectedAccountNumber = selectedAccount?.account_number ?? '';

  // Fetch transactions for selected account
  const { data: txData, loading: loadingTx } = useFetch(
    () => clientId && selectedAccountNumber
      ? paymentsApi.getByAccount(clientId, selectedAccountNumber, { page: 1, page_size: 50 })
      : Promise.resolve(null),
    [clientId, selectedAccountNumber]
  );
  const rawTx = Array.isArray(txData) ? txData : txData?.data ?? [];

  // Sort transactions
  const transactions = useMemo(() => {
    const list = [...rawTx];
    switch (sortBy) {
      case 'date_asc':
        return list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'date_desc':
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'type_in':
        return list.filter(t => t.recipient_account === selectedAccountNumber);
      case 'type_out':
        return list.filter(t => t.payer_account === selectedAccountNumber);
      default:
        return list;
    }
  }, [rawTx, sortBy]);

  useLayoutEffect(() => {
    if (loadingAccounts) return;
    if (!accounts.length) return;

    const cards = pageRef.current?.querySelectorAll('.acc-card');
    if (!cards?.length) return;

    gsap.set(cards, { clearProps: 'all' });

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: 'power2.out',
          stagger: 0.07,
          clearProps: 'opacity,transform',
        }
      );
    }, pageRef);

    return () => {
      ctx.revert();
      gsap.set(cards, { clearProps: 'all' });
    };
  }, [loadingAccounts, accounts.length]);

  useEffect(() => {
    if (selectedIdx >= accounts.length) {
      setSelectedIdx(0);
    }
  }, [accounts.length, selectedIdx]);

  async function openDetails(acc) {
    setLoadingDetails(true);
    try {
      const full = await accountsApi.getOne(clientId, acc.account_number);
      setDetailsAccount(full);
    } catch {
      setDetailsAccount(acc); // fallback to summary data
    } finally {
      setLoadingDetails(false);
    }
  }

  async function openLimits(acc) {
    setLoadingDetails(true);
    try {
      const full = await accountsApi.getOne(clientId, acc.account_number);
      setLimitsAccount(full);
    } catch {
      setLimitsAccount(acc);
    } finally {
      setLoadingDetails(false);
    }
  }

  function handleRenameSaved(newName) {
    setLocalAccounts(prev => prev.map(a =>
      a.account_number === renameAccount.account_number ? { ...a, name: newName } : a
    ));
    setRenameAccount(null);
  }

  function handleLimitsSaved(limits) {
    setLocalAccounts(prev => prev.map(a =>
      a.account_number === limitsAccount.account_number ? { ...a, ...limits } : a
    ));
    setLimitsAccount(null);
  }

  function handleNavigatePayment(account) {
    navigate('/client/payments/new', { state: { fromAccount: account.account_number } });
  }

  return (
    <>
      <ClientHeader activeNav="accounts" />
      <div ref={pageRef} className={styles.page}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>Moji računi</h1>
      </div>

      {loadingAccounts ? <Spinner /> : (
        <div className={styles.masterDetail}>
          {/* MASTER — Account Cards */}
          <div className={styles.accountsPanel}>
            <div className={styles.sortGroup} style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={styles.sortLabel}>Sortiraj račune:</span>
              <select className={styles.sortSelect} value={accountSortBy} onChange={e => setAccountSortBy(e.target.value)}>
                <option value="balance">Po ukupnom stanju</option>
                <option value="available">Po raspoloživom stanju</option>
                <option value="name">Po nazivu</option>
              </select>
            </div>
            {accounts.map((acc, i) => (
              <div
                key={acc.account_number ?? acc.id}
                className={`acc-card ${styles.accountCard} ${selectedIdx === i ? styles.accountCardActive : ''}`}
                onClick={() => setSelectedIdx(i)}
              >
                <div className={styles.accountTop}>
                  <div className={styles.accountIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </div>
                  <div className={styles.accountInfo}>
                    <div className={styles.accountName}>{acc.name}</div>
                    <div className={styles.accountNumber}>{acc.account_number}</div>
                  </div>
                </div>
                <div className={styles.accountBottom}>
                  <span className={styles.accountBalance}>{formatAmount(acc.balance, acc.currency)}</span>
                  <button
                    className={styles.detailsBtn}
                    onClick={e => { e.stopPropagation(); openDetails(acc); }}
                  >
                    Detalji
                  </button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <p style={{ color: 'var(--tx-3)', fontSize: 14, padding: '2rem 0', textAlign: 'center' }}>
                Nemate aktivnih računa.
              </p>
            )}
          </div>

          {/* DETAIL — Transactions */}
          <div className={styles.txPanel}>
            <div className={styles.txHeader}>
              <span className={styles.txTitle}>
                Transakcije {selectedAccount ? `— ${selectedAccount.name}` : ''}
              </span>
              <div className={styles.sortGroup}>
                <span className={styles.sortLabel}>Sortiraj:</span>
                <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="date_desc">Datum (najnovije)</option>
                  <option value="date_asc">Datum (najstarije)</option>
                  <option value="type_in">Samo uplate</option>
                  <option value="type_out">Samo isplate</option>
                </select>
              </div>
            </div>

            {loadingTx ? (
              <div className={styles.txLoading}><Spinner /></div>
            ) : transactions.length === 0 ? (
              <div className={styles.txEmpty}>Nema evidentiranih transakcija za izabrani period.</div>
            ) : (
              <div className={styles.txBody}>
                <table className={styles.txTable}>
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Primalac / Platilac</th>
                      <th>Šifra</th>
                      <th style={{ textAlign: 'right' }}>Iznos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => {
                      const isCredit = tx.recipient_account === selectedAccountNumber;
                      const counterparty = isCredit
                        ? (tx.payer_account ?? '—')
                        : (tx.recipient_name ?? tx.recipient_account ?? '—');
                      return (
                        <tr key={tx.id}>
                          <td>{formatDate(tx.created_at)}</td>
                          <td>{counterparty}</td>
                          <td>{tx.payment_code ?? '—'}</td>
                          <td style={{ textAlign: 'right' }} className={isCredit ? styles.amountIn : styles.amountOut}>
                            {isCredit ? '+' : '-'}{formatAmount(tx.amount, tx.currency ?? selectedAccount?.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {detailsAccount && (
        <AccountDetailsModal
          account={detailsAccount}
          clientId={clientId}
          onClose={() => setDetailsAccount(null)}
          onOpenRename={acc => setRenameAccount(acc)}
          onOpenLimits={acc => openLimits(acc)}
          onNavigatePayment={handleNavigatePayment}
        />
      )}

      {renameAccount && (
        <RenamePopup
          account={renameAccount}
          clientId={clientId}
          onSaved={handleRenameSaved}
          onClose={() => setRenameAccount(null)}
        />
      )}

      {limitsAccount && (
        <LimitChangeModal
          account={limitsAccount}
          clientId={clientId}
          onSaved={handleLimitsSaved}
          onClose={() => setLimitsAccount(null)}
        />
      )}
    </div>
    </>
  );
}
