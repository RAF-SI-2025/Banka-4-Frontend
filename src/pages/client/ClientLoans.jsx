import { useRef, useLayoutEffect, useState, useEffect, useCallback, useMemo } from 'react';
import gsap from 'gsap';
import { clientApi } from '../../api/endpoints/client';
import { loansApi } from '../../api/endpoints/loans';
import { useAuthStore } from '../../store/authStore';
import { useFetch } from '../../hooks/useFetch';
import LoanList    from '../../features/loans/LoanList';
import LoanDetails from '../../features/loans/LoanDetails';
import Spinner from '../../components/ui/Spinner';
import Alert   from '../../components/ui/Alert';
import styles from './ClientSubPage.module.css';
import ClientHeader from '../../components/layout/ClientHeader';

const LOAN_TYPES = [
  { value: 'CASH',     label: 'Keš kredit',      maxMonths: 84  },
  { value: 'AUTO',     label: 'Auto kredit',      maxMonths: 84  },
  { value: 'MORTGAGE', label: 'Stambeni kredit',  maxMonths: 360 },
];

function formatAmount(n) {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2 }).format(n) + ' RSD';
}

// Mapping from loan type string to backend loan_type_id.
// Update these IDs to match the actual values from the backend.
const LOAN_TYPE_IDS = { CASH: 1, AUTO: 2, MORTGAGE: 3 };

export default function ClientLoans() {
  useEffect(() => { document.title = 'RAFBank | Krediti'; }, []);
  const pageRef = useRef(null);
  const clientId = useAuthStore(s => s.user?.client_id ?? s.user?.id);

  const [selectedLoan, setSelectedLoan] = useState(null);

  const [showForm, setShowForm]       = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState('');
  const [loanCurrency, setLoanCurrency] = useState('RSD');

  const [loanType, setLoanType]                   = useState('CASH');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amount, setAmount]                       = useState('');
  const [period, setPeriod]                       = useState('');
  const [salary, setSalary]                       = useState('');
  const [employmentStatus, setEmploymentStatus]   = useState('stalno');

  const { data: loansData, loading, error } = useFetch(() => loansApi.getMyLoans(clientId), [clientId]);
  const loans = useMemo(() => {
    return Array.isArray(loansData) ? loansData : loansData?.data ?? [];
  }, [loansData]);

  const { data: accountsData } = useFetch(() => clientApi.getAccounts(clientId), [clientId]);
  const accounts = Array.isArray(accountsData) ? accountsData : accountsData?.data ?? [];

  const didInitSelectedLoan = useRef(false);

  useEffect(() => {
    didInitSelectedLoan.current = false;
    setSelectedLoan(null);
  }, [clientId]);

  const selectLoanWithDetails = useCallback(async (loan) => {
    if (!clientId) return;
    try {
      const details = await loansApi.getLoanById(clientId, loan.id);
      setSelectedLoan(details ?? loan);
    } catch {
      setSelectedLoan(loan);
    }
  }, [clientId]);

  // Auto-select first loan
  useLayoutEffect(() => {
    if (didInitSelectedLoan.current) return;
    if (loading) return;
    if (loans.length === 0) return;

    didInitSelectedLoan.current = true;
    void selectLoanWithDetails(loans[0]);
  }, [loading, loans, selectLoanWithDetails]);

  useLayoutEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.from('.sub-card', { opacity: 0, y: 20, duration: 0.45, ease: 'power2.out', stagger: 0.07 });
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  const selectedLoanType = LOAN_TYPES.find(t => t.value === loanType);
  const maxMonths = selectedLoanType?.maxMonths ?? 84;
  const selectedAccount = accounts.find(a => (a.account_number ?? a.number) === selectedAccountId);

  function openForm() {
    setLoanType('CASH');
    setLoanCurrency('RSD');
    setSelectedAccountId(accounts[0]?.account_number ?? accounts[0]?.number ?? '');
    setAmount('');
    setPeriod('');
    setSalary('');
    setEmploymentStatus('stalno');
    setFormError('');
    setSubmitted(false);
    setShowForm(true);
  }

  // Currency mismatch check
  const currencyMismatch = selectedAccount && loanCurrency !== (selectedAccount.currency ?? 'RSD');

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!selectedAccount) { setFormError('Izaberite račun.'); return; }

    if (currencyMismatch) {
      setFormError(`Valuta kredita (${loanCurrency}) mora biti ista kao valuta računa (${selectedAccount.currency}).`);
      return;
    }

    if (!amount || Number(amount) <= 0) { setFormError('Unesite ispravan iznos.'); return; }

    const numPeriod = Number(period);
    if (!period || numPeriod < 1) { setFormError('Unesite broj rata.'); return; }
    if (numPeriod > maxMonths) {
      setFormError(`Maksimalan broj rata za ${selectedLoanType?.label} je ${maxMonths}.`);
      return;
    }

    setSubmitting(true);
    try {
      await loansApi.createRequest(clientId, {
        loan_type_id:     LOAN_TYPE_IDS[loanType],
        account_number:   selectedAccount.account_number ?? selectedAccount.number,
        amount:           Number(amount),
        currency:         loanCurrency,
        repayment_period: numPeriod,
      });
      setSubmitted(true);
    } catch (err) {
      setFormError(err?.message || 'Greška pri podnošenju zahteva.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
        <ClientHeader activeNav="loans" />
      <div ref={pageRef} className={styles.page}>
        <div className={styles.topBar}>
          <h1 className={styles.title}>Krediti</h1>
          <button className={styles.newBtn} onClick={openForm}>+ Novi zahtev</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
        ) : error ? (
          <Alert type="error" message="Nije moguće učitati kredite." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
            <div className="sub-card" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <LoanList loans={loans} selectedId={selectedLoan?.id} onSelectLoan={selectLoanWithDetails} />
            </div>
            <div className="sub-card">
              {selectedLoan
                ? <LoanDetails loan={selectedLoan} />
                : loans.length > 0
                  ? <p style={{ color: 'var(--tx-3)', padding: '2rem' }}>Izaberite kredit.</p>
                  : null
              }
            </div>
          </div>
        )}

        {showForm && (
          <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Zahtev za kredit</h3>
                <button className={styles.modalClose} onClick={() => setShowForm(false)}>✕</button>
              </div>
              {submitted ? (
                <div style={{ padding: '2rem' }}>
                  {/* Status progress indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
                    {['Primljeno', 'U proveri', 'Odobreno'].map((step, i) => (
                      <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: i === 0 ? 'var(--green, #10B981)' : 'var(--border)',
                          color: i === 0 ? '#fff' : 'var(--tx-3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700,
                        }}>
                          {i === 0 ? '✓' : i + 1}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? 'var(--green)' : 'var(--tx-3)', marginLeft: 6 }}>
                          {step}
                        </span>
                        {i < 2 && <div style={{ width: 40, height: 2, background: 'var(--border)', margin: '0 8px' }} />}
                      </div>
                    ))}
                  </div>
                  <div className={styles.successBanner}>
                    ✓ Zahtev je uspešno podnet i nalazi se u statusu "U obradi".
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--tx-2)', textAlign: 'center', marginTop: 12 }}>
                    Kontaktiraćemo vas u roku od 2 radna dana sa odlukom.
                  </p>
                </div>
              ) : (
                <form className={styles.formCard} style={{ boxShadow: 'none', border: 'none' }} onSubmit={handleSubmit}>
                  <div className={styles.formField}>
                    <label>Vrsta kredita</label>
                    <select className={styles.formInput} value={loanType} onChange={e => { setLoanType(e.target.value); setPeriod(''); setFormError(''); }}>
                      {LOAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label>Valuta kredita</label>
                    <select className={styles.formInput} value={loanCurrency} onChange={e => { setLoanCurrency(e.target.value); setFormError(''); }}>
                      <option value="RSD">RSD</option>
                      <option value="EUR">EUR</option>
                      <option value="CHF">CHF</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label>Račun za kredit</label>
                    <select className={styles.formInput} value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); setFormError(''); }}>
                      <option value="">Izaberite račun...</option>
                      {accounts.map(a => {
                        const accNum = a.account_number ?? a.number;
                        const accCurrency = a.currency ?? 'RSD';
                        const mismatch = accCurrency !== loanCurrency;
                        return (
                          <option key={accNum} value={accNum} disabled={mismatch}>
                            {a.name} — {formatAmount(a.balance)} ({accCurrency})
                            {mismatch ? ' — neodgovarajuća valuta' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {currencyMismatch && selectedAccount && (
                      <span style={{ fontSize: 12, color: 'var(--red)', marginTop: 3 }}>
                        Valuta računa ({selectedAccount.currency}) ne odgovara valuti kredita ({loanCurrency}).
                      </span>
                    )}
                    {selectedAccount && !currencyMismatch && (
                      <span style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 3 }}>
                        Valuta: <strong>{selectedAccount.currency}</strong>
                      </span>
                    )}
                  </div>

                  <div className={styles.formField} style={{ flex: 1, minWidth: 160 }}>
                    <label>Plata (mesečno)</label>
                    <input
                      className={styles.formInput}
                      type="number"
                      min="0"
                      placeholder="Unesite neto platu..."
                      value={salary}
                      onChange={e => setSalary(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField} style={{ flex: 1, minWidth: 160 }}>
                    <label>Status zaposlenja</label>
                    <select
                      className={styles.formInput}
                      value={employmentStatus}
                      onChange={e => setEmploymentStatus(e.target.value)}
                    >
                      <option value="stalno">Stalno</option>
                      <option value="na_odredjeno">Na određeno</option>
                      <option value="privremeno">Privremeno / honorarno</option>
                      <option value="nezaposlen">Nezaposlen</option>
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label>Željeni iznos ({loanCurrency})</label>
                    <input type="number" min="1" step="any" placeholder="500000" className={styles.formInput} value={amount} onChange={e => setAmount(e.target.value)} required />
                  </div>

                  <div className={styles.formField}>
                    <label>Broj rata (maks. {maxMonths})</label>
                    <input
                      type="number" min="1" max={maxMonths} placeholder={`1 – ${maxMonths}`}
                      className={styles.formInput} value={period}
                      onChange={e => { const v = e.target.value; setPeriod(v); if (Number(v) > maxMonths) setFormError(`Maksimalan broj rata za ${selectedLoanType?.label} je ${maxMonths}.`); else setFormError(''); }}
                      required
                    />
                    <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>
                      {selectedLoanType?.label}: max {maxMonths} meseci
                    </span>
                  </div>

                  {formError && <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{formError}</p>}

                  <button type="submit" className={styles.submitBtn} disabled={submitting || !!formError || currencyMismatch}>
                    {submitting ? 'Slanje...' : 'Podnesi zahtev'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}