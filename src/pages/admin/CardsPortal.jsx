import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import gsap                                   from 'gsap';
import { useFetch }                           from '../../hooks/useFetch';
import { useDebounce }                        from '../../hooks/useDebounce';
import { clientsApi }                         from '../../api/endpoints/clients';
import { clientApi }                          from '../../api/endpoints/client';
import Navbar                                 from '../../components/layout/Navbar';
import Spinner                                from '../../components/ui/Spinner';
import Alert                                  from '../../components/ui/Alert';
import CardsFilters                           from '../../features/cards/CardsFilters';
import CardsTable                             from '../../features/cards/CardsTable';
import CardRequestsTable                      from '../../features/cards/CardRequestsTable';
import { cardsApi }                           from '../../api/endpoints/cards';
import styles                                 from './CardsPortal.module.css';

export default function CardsPortal() {
  useEffect(() => { document.title = 'RAFBank | Portal kartica'; }, []);
  const pageRef = useRef(null);

  const [filters, setFilters] = useState({
    first_name: '', last_name: '', jmbg: '', account_number: '',
  });

  const debFirst   = useDebounce(filters.first_name,     400);
  const debLast    = useDebounce(filters.last_name,      400);
  const debJmbg    = useDebounce(filters.jmbg,           400);
  const debAccount = useDebounce(filters.account_number, 400);

  const { data, loading, error, refetch } = useFetch(
    () => {
      const params = {};
      if (debFirst)   params.first_name     = debFirst;
      if (debLast)    params.last_name      = debLast;
      if (debJmbg)    params.jmbg           = debJmbg;
      if (debAccount) params.account_number = debAccount;
      return clientsApi.getAll(params);
    },
    [debFirst, debLast, debJmbg, debAccount]
  );

  const [tab, setTab] = useState('clients'); // 'clients' | 'requests'

  // Fetch requests
  const { data: reqsData, loading: loadingReqs, refetch: refetchReqs } = useFetch(() => {
    if (tab === 'requests') return cardsApi.getRequests();
    return Promise.resolve([]);
  }, [tab]);
  const requests = reqsData?.data ?? reqsData ?? [];

  const [actionId, setActionId] = useState(null);
  const [reqError, setReqError] = useState(null);

  async function handleApprove(id) {
    setActionId(id);
    setReqError(null);
    try {
      await cardsApi.approveRequest(id);
      refetchReqs();
    } catch (err) {
      setReqError(err?.message ?? err?.error ?? 'Greška pri odobravanju.');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id) {
    setActionId(id);
    setReqError(null);
    try {
      await cardsApi.rejectRequest(id);
      refetchReqs();
    } catch (err) {
      setReqError(err?.message ?? err?.error ?? 'Greška pri odbijanju.');
    } finally {
      setActionId(null);
    }
  }

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', { opacity: 0, y: 20, duration: 0.45, stagger: 0.07, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const [clientsWithAccounts, setClientsWithAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    const clients = data?.data ?? [];
    if (clients.length === 0) {
      setClientsWithAccounts([]);
      return;
    }
    let cancelled = false;
    setLoadingAccounts(true);
    Promise.all(
      clients.map(client =>
        clientApi.getAccounts(client.id)
          .then(res => {
            const accounts = Array.isArray(res) ? res : res?.data ?? [];
            return Promise.all(
              accounts.map(acc =>
                cardsApi.getByAccount(client.id, acc.account_number)
                  .then(cRes => ({ ...acc, cards: cRes?.cards ?? (Array.isArray(cRes) ? cRes : cRes?.data ?? []) }))
                  .catch(() => ({ ...acc, cards: [] }))
              )
            ).then(accountsWithCards => ({ ...client, accounts: accountsWithCards }));
          })
          .catch(() => ({ ...client, accounts: [] }))
      )
    ).then(results => {
      if (!cancelled) setClientsWithAccounts(results);
    }).finally(() => {
      if (!cancelled) setLoadingAccounts(false);
    });
    return () => { cancelled = true; };
  }, [data]);
  
    return (
      <div ref={pageRef} className={styles.stranica}>
        <Navbar />
        <main className={styles.sadrzaj}>
  
          <div className="page-anim">
            <div className={styles.breadcrumb}>
              <span>Admin</span><span className={styles.sep}>›</span>
              <span className={styles.current}>Portal za kartice</span>
            </div>
            <h1 className={styles.title}>Portal za kartice</h1>
            <p className={styles.desc}>
              Upravljanje klijentima, karticama i zahtevima za izradu novih kartica.
            </p>
          </div>
  
          <div className={`page-anim`} style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '0px', marginBottom: '24px', marginTop: '16px' }}>
              <button
                  style={{ background: 'none', border: 'none', padding: '0 0 12px 0', fontSize: '15px', fontWeight: tab === 'clients' ? '700' : '500', color: tab === 'clients' ? 'var(--blue)' : 'var(--tx-2)', borderBottom: tab === 'clients' ? '2px solid var(--blue)' : '2px solid transparent', cursor: 'pointer', outline: 'none' }}
                  onClick={() => setTab('clients')}
              >
                  Pregled klijenata
              </button>
              <button
                  style={{ background: 'none', border: 'none', padding: '0 0 12px 0', fontSize: '15px', fontWeight: tab === 'requests' ? '700' : '500', color: tab === 'requests' ? 'var(--blue)' : 'var(--tx-2)', borderBottom: tab === 'requests' ? '2px solid var(--blue)' : '2px solid transparent', cursor: 'pointer', outline: 'none' }}
                  onClick={() => setTab('requests')}
              >
                  Zahtevi za kartice
              </button>
          </div>
  
          {tab === 'clients' && (
            <>
              <div className="page-anim">
                <CardsFilters filters={filters} onChange={setFilters} />
              </div>
  
              {(loading || loadingAccounts) && <Spinner />}
              {(!loading && !loadingAccounts) && error && (
                <Alert tip="greska" poruka={error?.response?.data?.error ?? 'Greška pri učitavanju klijenata.'} />
              )}
              {(!loading && !loadingAccounts) && !error && (
                <div className="page-anim">
                  <CardsTable 
                    clients={clientsWithAccounts} 
                    onActionSuccess={() => {
                      refetch();
                    }} 
                  />
                </div>
              )}
            </>
          )}

        {tab === 'requests' && (
          <>
            {reqError && (
              <div className="page-anim" style={{ marginBottom: '16px' }}>
                <Alert tip="greska" poruka={reqError} />
              </div>
            )}
            {loadingReqs && <Spinner />}
            {!loadingReqs && (
              <div className="page-anim">
                <CardRequestsTable
                  requests={requests}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  actionId={actionId}
                />
              </div>
            )}
          </>
        )}

      </main>

    </div>
  );
}
