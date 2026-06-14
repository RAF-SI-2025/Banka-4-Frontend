import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { clientApi } from '../../api/endpoints/client';
import { exchangeApi } from '../../api/endpoints/exchange';
import { transfersApi } from '../../api/endpoints/transfers';
import { useAuthStore } from '../../store/authStore';
import { useFetch } from '../../hooks/useFetch';
import Spinner from '../../components/ui/Spinner';
import ClientHeader from '../../components/layout/ClientHeader';
import styles from './ClientDashboard.module.css';

function formatAmount(amount, currency = 'RSD') {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount)) + ' ' + currency;
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ProfileModal({ user, onClose }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Lični podaci</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.profileContent}>
          <div className={styles.profileAvatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
          <div className={styles.profileName}>{user?.first_name} {user?.last_name}</div>
          <div className={styles.profileEmail}>{user?.email}</div>
          <div className={styles.profileFields}>
            {[
              { label: 'Ime', value: user?.first_name },
              { label: 'Prezime', value: user?.last_name },
              { label: 'Email', value: user?.email },
              { label: 'Telefon', value: user?.phone ?? '+381 60 123 4567' },
              { label: 'Adresa', value: user?.address ?? 'Knez Mihailova 10, Beograd' },
            ].map(f => (
              <div key={f.label} className={styles.profileField}>
                <span className={styles.profileFieldLabel}>{f.label}</span>
                <span className={styles.profileFieldValue}>{f.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ recipient, accounts, onClose }) {
  const [from, setFrom] = useState(accounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [success, setSuccess] = useState(false);
  function handleSend() {
    if (!amount) return;
    setSuccess(true);
    setTimeout(onClose, 1800);
  }
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{recipient ? `Plaćanje — ${recipient.name}` : 'Novo plaćanje'}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        {success ? (
          <div className={styles.successMsg}><div className={styles.successIcon}>✓</div><p>Nalog za plaćanje je uspešno poslat!</p></div>
        ) : (
          <div className={styles.payForm}>
            <div className={styles.payField}><label>Primalac</label><input type="text" defaultValue={recipient?.name ?? ''} placeholder="Ime primaoca" className={styles.payInput} /></div>
            <div className={styles.payField}><label>Račun primaoca</label><input type="text" defaultValue={recipient?.account ?? ''} placeholder="Broj računa" className={styles.payInput} /></div>
            <div className={styles.payField}><label>Sa računa</label>
              <select className={styles.payInput} value={from} onChange={e => setFrom(e.target.value)}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {formatAmount(a.balance, a.currency)}</option>)}
              </select>
            </div>
            <div className={styles.payField}><label>Iznos (RSD)</label><input type="number" placeholder="0.00" className={styles.payInput} value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div className={styles.payField}><label>Svrha plaćanja</label><input type="text" placeholder="Npr. Stanarima za mart" className={styles.payInput} value={desc} onChange={e => setDesc(e.target.value)} /></div>
            <button className={styles.payBtn} onClick={handleSend}>Pošalji nalog za plaćanje</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountSwitcherModal({ accounts, selected, onSelect, onClose }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalSmall} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Izaberite račun</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.switcherList}>
          {accounts.map((acc, i) => (
            <button key={acc.account_number ?? acc.id} className={`${styles.switcherItem} ${selected === i ? styles.switcherItemActive : ''}`} onClick={() => { onSelect(i); onClose(); }}>
              <div className={styles.switcherIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              </div>
              <div className={styles.switcherInfo}>
                <div className={styles.switcherName}>{acc.name}</div>
                <div className={styles.switcherNumber}>••••{(acc.account_number ?? acc.number ?? '').slice(-4)}</div>
              </div>
              <div className={styles.switcherBalance}>{formatAmount(acc.balance, acc.currency)}</div>
              {selected === i && <span className={styles.switcherCheck}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  useEffect(() => { document.title = 'RAFBank | Početna'; }, []);
  const pageRef = useRef(null);
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const [selectedAccount, setSelectedAccount] = useState(0);
  const [calcAmount, setCalcAmount] = useState('');
  const [calcFrom, setCalcFrom] = useState('EUR');
  const [calcResult, setCalcResult] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [paymentRecipient, setPaymentRecipient] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  const clientId = useAuthStore(s => s.user?.client_id ?? s.user?.id);

  const { data: accountsData, loading: loadingAccounts } = useFetch(
    () => clientApi.getAccounts(clientId),
    [clientId]
  );
  const accounts = Array.isArray(accountsData) ? accountsData : accountsData?.data ?? [];

  const { data: txData, loading: loadingTx } = useFetch(
    () => transfersApi.getHistory(clientId, { page: 1, page_size: 5 }),
    [clientId]
  );
  const transactions = txData?.data ?? (Array.isArray(txData) ? txData : []);

  const { data: payeesData } = useFetch(() => clientApi.getPayees(), []);
  const recipients = Array.isArray(payeesData) ? payeesData : payeesData?.data ?? [];

  const { data: ratesData } = useFetch(() => exchangeApi.getRates(), []);
  const rates = Array.isArray(ratesData?.rates) ? ratesData.rates : [];

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.dash-card', { opacity: 0, y: 24, duration: 0.5, ease: 'power2.out', stagger: 0.08 });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  function handleCalc() {
    const rate = rates.find(r => r.currency === calcFrom);
    if (!rate || !calcAmount) return;
    setCalcResult(`${calcAmount} ${calcFrom} = ${(parseFloat(calcAmount) * rate.sell_rate).toFixed(2)} RSD`);
  }

  return (
    <div ref={pageRef} className={styles.page}>
      <ClientHeader onProfileClick={() => setShowProfile(true)} />

      <div className={styles.content}>
        <div className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>Zdravo, {user?.first_name ?? 'Klijente'} 👋</h1>
          <p className={styles.welcomeSub}>Evo pregleda vašeg finansijskog stanja.</p>
        </div>
        <div className={styles.grid}>

          {/* RAČUNI */}
          <section className={`dash-card ${styles.card} ${styles.accountsCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Moji računi</h2>
              <button className={styles.cardLink} onClick={() => navigate('/client/accounts')}>Svi računi →</button>
            </div>
            {loadingAccounts ? <Spinner /> : (
              <div className={styles.accountsList}>
                {accounts.map((acc, i) => (
                  <div key={acc.account_number ?? acc.id} className={`${styles.accountItem} ${selectedAccount === i ? styles.accountItemActive : ''}`} onClick={() => setSelectedAccount(i)}>
                    <div className={styles.accountIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                    </div>
                    <div className={styles.accountInfo}>
                      <div className={styles.accountName}>{acc.name}</div>
                      <div className={styles.accountNumber}>••••  {(acc.account_number ?? acc.number ?? '').replace(/-/g, '').slice(-6)}</div>
                    </div>
                    <div className={styles.accountBalance}>
                      <div className={styles.balanceAmount}>{formatAmount(acc.balance, acc.currency)}</div>
                      <div className={styles.balanceCurrency}>{acc.currency}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* POSLEDNJI TRANSFERI */}
          <section className={`dash-card ${styles.card} ${styles.txCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Poslednji transferi</h2>
              <button className={styles.cardLink} onClick={() => navigate('/transfers/history')}>
                Vidi sve →
              </button>
            </div>
            {loadingTx ? <Spinner /> : transactions.length === 0 ? (
              <p style={{ color: 'var(--tx-3)', fontSize: 13, textAlign: 'center', padding: '2rem 0' }}>
                Nema transfera za prikaz.
              </p>
            ) : (
              <table className={styles.txTable}>
                <thead>
                  <tr>
                    <th>Sa računa</th>
                    <th>Na račun</th>
                    <th>Datum</th>
                    <th style={{ textAlign: 'right' }}>Iznos</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map(tx => (
                    <tr key={tx.transfer_id ?? tx.transaction_id}>
                      <td>••••{String(tx.from_account_number ?? '').slice(-4)}</td>
                      <td>••••{String(tx.to_account_number ?? '').slice(-4)}</td>
                      <td>{formatDate(tx.created_at)}</td>
                      <td className={styles.debit} style={{ textAlign: 'right' }}>
                        -{formatAmount(tx.initial_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* BRZO PLAĆANJE */}
          <section className={`dash-card ${styles.card} ${styles.payCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Brzo plaćanje</h2>
              <button className={styles.newPayBtn} onClick={() => navigate('/client/recipients')}>+ Novi primalac</button>
            </div>
            <div className={styles.recipientsList}>
              {recipients.slice(0, 4).map(r => {
                const name = r.name ?? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim();
                const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <button key={r.payee_id ?? r.id} className={styles.recipientBtn} onClick={() => navigate('/client/payments/new', { state: { recipient: { name, account: r.account_number } } })} title={`Plati ${name}`}>
                    <div className={styles.recipientAvatar}>{initials}</div>
                    <span className={styles.recipientName}>{name.split(' ')[0]}</span>
                  </button>
                );
              })}
              {recipients.length === 0 && (
                <p style={{ color: 'var(--tx-3)', fontSize: 13 }}>Nema sačuvanih primalaca.</p>
              )}
            </div>
          </section>

          {/* KURSNA LISTA */}
          <section className={`dash-card ${styles.card} ${styles.ratesCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Kursna lista</h2>
              <button className={styles.cardLink} onClick={() => navigate('/client/exchange')}>Idi na menjačnicu →</button>
            </div>
            <div className={styles.ratesTable}>
              {rates.map(r => (
                <div key={r.currency} className={styles.rateRow}>
                  <span className={styles.rateCurrency}>{r.currency}</span>
                  <span className={styles.rateLabel}>Kupovni</span>
                  <span className={styles.rateValue}>{r.buy_rate.toFixed(2)}</span>
                  <span className={styles.rateLabel}>Prodajni</span>
                  <span className={styles.rateValue}>{r.sell_rate.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className={styles.calcDivider} />
            <h3 className={styles.calcTitle}>Mini kalkulator</h3>
            <div className={styles.calcRow}>
              <input className={styles.calcInput} type="number" placeholder="Iznos" value={calcAmount} onChange={e => setCalcAmount(e.target.value)} />
              <select className={styles.calcSelect} value={calcFrom} onChange={e => setCalcFrom(e.target.value)}>
                {rates.map(r => <option key={r.currency} value={r.currency}>{r.currency}</option>)}
              </select>
              <button className={styles.calcBtn} onClick={handleCalc}>→ RSD</button>
            </div>
            {calcResult && <div className={styles.calcResult}>{calcResult}</div>}
          </section>
        </div>
      </div>

      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
      {showSwitcher && <AccountSwitcherModal accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} onClose={() => setShowSwitcher(false)} />}
      {showPayment && <PaymentModal recipient={paymentRecipient} accounts={accounts} onClose={() => { setShowPayment(false); setPaymentRecipient(null); }} />}
    </div>
  );
}