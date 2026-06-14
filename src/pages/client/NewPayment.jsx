import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { clientApi } from '../../api/endpoints/client';
import { paymentsApi } from '../../api/endpoints/payments';
import { useAuthStore } from '../../store/authStore';
import { useFetch } from '../../hooks/useFetch';
import Spinner from '../../components/ui/Spinner';
import ClientHeader from '../../components/layout/ClientHeader';
import styles from './ClientSubPage.module.css';
import pStyles from './NewPayment.module.css';
import { getServerOffsetMs } from '../../utils/serverTime';

const PAYMENT_CODES = [
  { code: '189', label: '189 – Plaćanja po osnovu kamate' },
  { code: '220', label: '220 – Finansijska plaćanja' },
  { code: '221', label: '221 – Dividende i prihodi' },
  { code: '253', label: '253 – Naknada za usluge' },
  { code: '289', label: '289 – Ostale transakcije' },
];

function VerifyModal({ open, onClose, onConfirm, loading }) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const OTP_WINDOW_SECONDS = 30;
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [deadlineServerMs, setDeadlineServerMs] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(OTP_WINDOW_SECONDS);
  const serverNowMs = () => Date.now() + serverOffsetMs;

  useEffect(() => {
    if (!open) return;

    setCode('');
    setCodeError('');

    let cancelled = false;

    (async () => {
      try {
        const offset = await getServerOffsetMs();
        if (cancelled) return;

        setServerOffsetMs(offset);
        const startServer = Date.now() + offset;
        setDeadlineServerMs(startServer + OTP_WINDOW_SECONDS * 1000);
      } catch {
        if (cancelled) return;
        setServerOffsetMs(0);
        setDeadlineServerMs(Date.now() + OTP_WINDOW_SECONDS * 1000);
      }
    })();

    return () => { cancelled = true; };
  }, [open]);

useEffect(() => {
  if (!open || !deadlineServerMs) return;

  const id = setInterval(() => {
    const diffMs = deadlineServerMs - serverNowMs();
    const next = Math.max(0, Math.ceil(diffMs / 1000));
    setSecondsLeft(next);

    if (diffMs <= 0) {
      clearInterval(id);

      // restart 30s window (server-synced)
      const nowServer = serverNowMs();
      setDeadlineServerMs(nowServer + OTP_WINDOW_SECONDS * 1000);
      setSecondsLeft(OTP_WINDOW_SECONDS);

      // opcionalno: očisti input i grešku
      setCode('');
      setCodeError('');
    }
  }, 250);

  return () => clearInterval(id);
}, [open, deadlineServerMs, serverOffsetMs]);

  if (!open) return null;

  const isValid = /^\d{6}$/.test(code);

  function handleSubmit(e) {
    e.preventDefault();

    if (secondsLeft <= 0) {
      setCode('');
      setCodeError('Kod je istekao. Sačekajte novi i unesite ponovo.');
      return;
    }

    if (!isValid) {
      setCodeError('Unesite tačno 6 cifara.');
      return;
    }
    onConfirm(code);
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className={styles.modalHeader}>
          <h3>Verifikacija plaćanja</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: 13, color: 'var(--tx-2)', marginBottom: 10 }}>
            Unesite 6-cifreni kod koji ste primili putem SMS/Email poruke.
          </p>

          {/* TIMER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--tx-2)' }}>Važenje koda:</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: secondsLeft <= 5 ? 'var(--red)' : 'var(--tx-1)' }}>
              {String(secondsLeft).padStart(2, '0')}s
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx-3)', marginBottom: 6, textTransform: 'uppercase' }}>
              Verifikacioni kod
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setCodeError(''); }}
              placeholder="000000"
              autoFocus
              style={{ width: '100%', padding: '10px 14px', fontSize: 22, letterSpacing: 8, textAlign: 'center', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
            />
            {codeError && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>{codeError}</p>}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className={pStyles.btnGhost} onClick={onClose} disabled={loading}>Otkaži</button>
            <button type="submit" className={pStyles.btnPrimary} disabled={!isValid || loading}>
              {loading ? 'Slanje...' : 'Potvrdi plaćanje'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatAmount(n, currency = 'RSD') {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2 }).format(n) + ' ' + currency;
}

export default function NewPayment() {
  useEffect(() => { document.title = 'RAFBank | Novo plaćanje'; }, []);
  const pageRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const prefilled = location.state?.recipient;
  const prefilledFrom = location.state?.fromAccount;
  const clientId = useAuthStore(s => s.user?.client_id ?? s.user?.id);

  const { data: accountsData, loading: loadingAccounts } = useFetch(() => clientApi.getAccounts(clientId), [clientId]);
  const accounts   = Array.isArray(accountsData) ? accountsData : accountsData?.data ?? [];

  const { data: payeesData } = useFetch(() => clientApi.getPayees(), []);
  const recipients = Array.isArray(payeesData) ? payeesData : payeesData?.data ?? [];

  const [fromAccountNumber, setFromAccountNumber] = useState(prefilledFrom ?? '');
  const [recipientName,   setRecipientName]   = useState(prefilled?.name ?? '');
  const [recipientAccount,setRecipientAccount]= useState(prefilled?.account ?? '');
  const [amount,          setAmount]          = useState('');
  const [paymentCode,     setPaymentCode]     = useState('289');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [purpose,         setPurpose]         = useState('');
  const [showSuggest,     setShowSuggest]     = useState(false);
  const [formError,       setFormError]       = useState('');
  const [showVerify,      setShowVerify]      = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [showAddRecipient,setShowAddRecipient]= useState(false);
  const [addedRecipient,  setAddedRecipient]  = useState(false);

  const fromAccount = accounts.find(a => (a.account_number ?? a.number) === fromAccountNumber);

  const didInitFromAccount = useRef(false);

  // init default account
  useEffect(() => {
    if (didInitFromAccount.current) return;
    if (loadingAccounts) return;
    if (accounts.length === 0) return;
    if (prefilledFrom) return;

    didInitFromAccount.current = true;
    setFromAccountNumber(accounts[0]?.account_number ?? accounts[0]?.number ?? '');
  }, [loadingAccounts, accounts, prefilledFrom]);

  useEffect(() => {
    if (prefilledFrom) {
      didInitFromAccount.current = true;
      setFromAccountNumber(prefilledFrom);
    }
  }, [prefilledFrom]);

  useLayoutEffect(() => {
    const elements = pageRef.current?.querySelectorAll('.sub-card');
    if (!elements || elements.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.from('.sub-card', { opacity: 0, y: 20, duration: 0.45, ease: 'power2.out', stagger: 0.07 });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const suggestions = recipientName.length >= 1
    ? recipients.filter(r => r.name.toLowerCase().includes(recipientName.toLowerCase()))
    : [];

  function selectSuggestion(r) {
    setRecipientName(r.name);
    setRecipientAccount(r.account_number);
    setShowSuggest(false);
    setFormError('');
  }

  function validate() {
    if (!fromAccountNumber) return 'Izaberite račun platioca.';
    if (!recipientName.trim()) return 'Unesite ime primaoca.';
    const digits = recipientAccount.replace(/\D/g, '');
    if (digits.length !== 18) return 'Broj računa primaoca mora imati tačno 18 cifara.';
    if (!amount || Number(amount) <= 0) return 'Unesite ispravan iznos.';
    if (fromAccount && Number(amount) > fromAccount.balance) return 'Nedovoljno sredstava na računu.';
    return '';
  }

  async function handleNext(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError('');
    setSubmitting(true);
    try {
      // Step 1: create payment — backend returns payment ID and triggers OTP
      const res = await paymentsApi.create(clientId, {
        payer_account_number:     fromAccountNumber,
        recipient_account_number: recipientAccount.replace(/\D/g, ''),
        recipient_name:           recipientName.trim(),
        amount:                   Number(amount),
        payment_code:             paymentCode,
        reference_number:         referenceNumber,
        purpose:                  purpose,
      });
      const paymentId = res?.id ?? res?.ID ?? res?.payment_id ?? res?.PaymentID ?? res?.data?.id ?? res?.data?.ID ?? res?.data?.payment_id;
      if (!paymentId) {
        setFormError('Nije moguće pokrenuti verifikaciju — server nije vratio ID plaćanja.');
        return;
      }
      setPendingPaymentId(paymentId);
      setShowVerify(true);
    } catch (err) {
      const msg = err?.response?.data?.error ?? err?.message ?? '';
      const isNotFound =
        err?.response?.status === 404 ||
        /ne postoji|not found|account.*not|invalid.*account|recipient/i.test(msg);
      if (isNotFound) {
        setFormError('Uneti račun ne postoji.');
        setRecipientAccount('');
      } else {
        setFormError(msg || 'Greška pri slanju naloga.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(code) {
    if (!pendingPaymentId) { setFormError('Greška — ID plaćanja nije dostupan.'); setShowVerify(false); return; }
    setSubmitting(true);
    try {
      // Step 2: verify payment with OTP
      await paymentsApi.verify(clientId, pendingPaymentId, { code });
      setShowVerify(false);
      setSuccess(true);
      const alreadySaved = recipients.some(r => r.account_number === recipientAccount.replace(/\D/g, ''));
      setShowAddRecipient(!alreadySaved);
    } catch (err) {
      setFormError(err?.message || 'Greška pri verifikaciji.');
      setShowVerify(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddRecipient() {
    try {
      await clientApi.createPayee({
        name: recipientName.trim(),
        account_number: recipientAccount.replace(/\D/g, ''),
      });
      setAddedRecipient(true);
      setShowAddRecipient(false);
    } catch { /* ignore */ }
  }

  const accountDigits = recipientAccount.replace(/\D/g, '').length;

  if (success) {
    return (
      <div ref={pageRef} className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.back} onClick={() => navigate('/dashboard')}>← Nazad</button>
          <h1 className={styles.title}>Novo plaćanje</h1>
          <span />
        </div>
        <div className={pStyles.successCard}>
          <div className={pStyles.successIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className={pStyles.successTitle}>Nalog je uspešno poslat!</h2>
          <p className={pStyles.successDesc}>
            Plaćanje od <strong>{formatAmount(Number(amount), fromAccount?.currency)}</strong><br />
            ka <strong>{recipientName}</strong> je u obradi.
          </p>
          {addedRecipient && (
            <p className={pStyles.successSaved}>✓ Primalac je sačuvan u adresaru.</p>
          )}
          <div className={pStyles.successActions}>
            {showAddRecipient && !addedRecipient && (
              <button className={pStyles.btnOutline} onClick={handleAddRecipient}>
                + Dodaj {recipientName} u primaoce
              </button>
            )}
            <button className={pStyles.btnPrimary} onClick={() => { setSuccess(false); setFromAccountNumber(''); setRecipientName(''); setRecipientAccount(''); setAmount(''); setPurpose(''); setReferenceNumber(''); setShowAddRecipient(false); setAddedRecipient(false); setPendingPaymentId(null); }}>
              Novo plaćanje
            </button>
            <button className={pStyles.btnGhost} onClick={() => navigate('/dashboard')}>
              Na dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ClientHeader activeNav="payments" />
      <div ref={pageRef} className={styles.page}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>Novo plaćanje</h1>
        <span />
      </div>

      {loadingAccounts ? <Spinner /> : (
        <form className={`sub-card ${styles.formCard}`} onSubmit={handleNext} style={{ boxShadow: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Račun platioca */}
          <div className={styles.formField}>
            <label>Račun platioca</label>
            <select className={styles.formInput} value={fromAccountNumber} onChange={e => { setFromAccountNumber(e.target.value); setFormError(''); }}>
              <option value="">Izaberite račun...</option>
              {accounts.map(a => {
                const accNum = a.account_number ?? a.number;
                return (
                  <option key={accNum} value={accNum}>
                    {a.name} — {formatAmount(a.balance, a.currency)}
                  </option>
                );
              })}
            </select>
            {fromAccount && (
              <span className={pStyles.limitHint} title={`Stanje: ${formatAmount(fromAccount.balance, fromAccount.currency)}`}>
                Raspoloživo: <strong>{formatAmount(fromAccount.balance, fromAccount.currency)}</strong>
              </span>
            )}
          </div>

          {/* Primalac sa autosuggest */}
          <div className={styles.formField} style={{ position: 'relative' }}>
            <label>Primalac</label>
            <input
              type="text"
              placeholder="Ime primaoca ili firme"
              className={styles.formInput}
              value={recipientName}
              onChange={e => { setRecipientName(e.target.value); setShowSuggest(true); setFormError(''); }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              autoComplete="off"
            />
            {showSuggest && suggestions.length > 0 && (
              <div className={pStyles.suggest}>
                {suggestions.map(r => (
                  <button key={r.id} type="button" className={pStyles.suggestItem} onMouseDown={() => selectSuggestion(r)}>
                    <span className={pStyles.suggestName}>{r.name}</span>
                    <span className={pStyles.suggestAcc}>{r.account_number}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Račun primaoca */}
          <div className={styles.formField}>
            <label>Broj računa primaoca (18 cifara)</label>
            <input
              type="text"
              placeholder="000000000000000000"
              className={styles.formInput}
              value={recipientAccount}
              maxLength={22}
              onChange={e => { setRecipientAccount(e.target.value); setFormError(''); }}
            />
            <span className={pStyles.limitHint}>{accountDigits}/18 cifara</span>
          </div>

          {/* Iznos */}
          <div className={styles.formField}>
            <label>
              Iznos {fromAccount ? `(${fromAccount.currency})` : ''}
              {fromAccount && (
                <span
                  className={pStyles.infoIcon}
                  title={[
                    `Raspoloživo: ${formatAmount(fromAccount.balance, fromAccount.currency)}`,
                    fromAccount.daily_limit != null ? `Dnevni limit: ${formatAmount(fromAccount.daily_limit, fromAccount.currency)}` : null,
                    fromAccount.monthly_limit != null ? `Mesečni limit: ${formatAmount(fromAccount.monthly_limit, fromAccount.currency)}` : null,
                  ].filter(Boolean).join('\n')}
                > ⓘ</span>
              )}
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              placeholder="0.00"
              className={styles.formInput}
              value={amount}
              onChange={e => { setAmount(e.target.value); setFormError(''); }}
            />
            {fromAccount && (
              <span className={pStyles.limitHint}>
                Raspoloživo: <strong>{formatAmount(fromAccount.balance, fromAccount.currency)}</strong>
                {fromAccount.daily_limit != null && <> · Dnevni limit: <strong>{formatAmount(fromAccount.daily_limit, fromAccount.currency)}</strong></>}
              </span>
            )}
          </div>

          {/* Šifra plaćanja */}
          <div className={styles.formField}>
            <label>Šifra plaćanja</label>
            <select className={styles.formInput} value={paymentCode} onChange={e => setPaymentCode(e.target.value)}>
              {PAYMENT_CODES.map(p => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Poziv na broj */}
          <div className={styles.formField}>
            <label>Poziv na broj <span className={pStyles.optional}>(opciono)</span></label>
            <input
              type="text"
              placeholder="npr. 97 12345-2026"
              className={styles.formInput}
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
            />
          </div>

          {/* Svrha plaćanja */}
          <div className={styles.formField}>
            <label>Svrha plaćanja</label>
            <input
              type="text"
              placeholder="npr. Plaćanje računa za internet"
              className={styles.formInput}
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
            />
          </div>

          {formError && <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{formError}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            Nastavi →
          </button>
        </form>
      )}

      <VerifyModal
        open={showVerify}
        onClose={() => setShowVerify(false)}
        onConfirm={handleConfirm}
        loading={submitting}
      />
    </div>
    </>
  );
}
