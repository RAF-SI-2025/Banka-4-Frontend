import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap                          from 'gsap';
import { accountsApi }               from '../../api/endpoints/accounts';
import { exchangeApi }               from '../../api/endpoints/exchange';
import { useAccountStore }           from '../../store/accountStore';
import Navbar                        from '../../components/layout/Navbar';
import Spinner                       from '../../components/ui/Spinner';
import Alert                         from '../../components/ui/Alert';
import AccountCard                   from '../../features/accounts/AccountCard';
import TransactionTable              from '../../features/accounts/TransactionTable';
import AccountDetailsModal           from '../../features/accounts/AccountDetailsModal';
import styles                        from './Accounts.module.css';

export default function Accounts() {
  useEffect(() => { document.title = 'RAFBank | Računi'; }, []);
  const pageRef = useRef(null);

  const accounts            = useAccountStore(s => s.accounts);
  const selectedAccountId   = useAccountStore(s => s.selectedAccountId);
  const transactionsLoading = useAccountStore(s => s.transactionsLoading);
  const sortBy              = useAccountStore(s => s.sortBy);
  const sortOrder           = useAccountStore(s => s.sortOrder);
  const setAccounts         = useAccountStore(s => s.setAccounts);
  const selectAccount       = useAccountStore(s => s.selectAccount);
  const setSort             = useAccountStore(s => s.setSort);
  const getSortedTxns       = useAccountStore(s => s.getSortedTransactions);
  const reset               = useAccountStore(s => s.reset);

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [modalAccount, setModalAccount] = useState(null);

  // Fetch accounts on mount (with exchange rates for correct currency-aware sorting)
  useEffect(() => {
    let cancelled = false;
    Promise.all([accountsApi.getAll(), exchangeApi.getRates()])
      .then(([accRes, ratesRes]) => {
        if (cancelled) return;
        const rates = Array.isArray(ratesRes?.rates) ? ratesRes.rates : [];
        setAccounts(accRes.data ?? [], rates);
      })
      .catch(err => { if (!cancelled) setError(err?.response?.data?.error ?? 'Greška pri učitavanju računa.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; reset(); };
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity: 0, y: 20, duration: 0.4, stagger: 0.08, ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const sortedTransactions = getSortedTxns();

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />
      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}><span>Računi</span></div>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Računi</h1>
            <p className={styles.pageDesc}>Pregled vaših računa i istorija transakcija.</p>
          </div>
        </div>

        {loading && <Spinner />}
        {error && <Alert tip="greska" poruka={error} />}

        {!loading && !error && (
          <div className={`page-anim ${styles.masterDetail}`}>
            <div className={styles.masterPanel}>
              {accounts.map(acc => (
                <AccountCard
                  key={acc.account_number}
                  account={acc}
                  selected={acc.account_number === selectedAccountId}
                  onSelect={selectAccount}
                  onDetails={setModalAccount}
                />
              ))}
              {accounts.length === 0 && (
                <div className={styles.emptyAccounts}>Nemate aktivnih računa.</div>
              )}
            </div>

            <div className={styles.detailPanel}>
              <TransactionTable
                transactions={sortedTransactions}
                loading={transactionsLoading}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={setSort}
              />
            </div>
          </div>
        )}
      </main>

      <AccountDetailsModal
        open={!!modalAccount}
        onClose={() => setModalAccount(null)}
        account={modalAccount}
        onAccountUpdated={() => {
          Promise.all([accountsApi.getAll(), exchangeApi.getRates()])
            .then(([accRes, ratesRes]) => {
              const rates = Array.isArray(ratesRes?.rates) ? ratesRes.rates : [];
              setAccounts(accRes.data ?? [], rates);
            })
            .catch(() => {});
          setModalAccount(null);
        }}
      />
    </div>
  );
}
