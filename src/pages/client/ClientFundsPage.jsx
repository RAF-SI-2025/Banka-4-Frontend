import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

import { investmentFundsApi } from '../../api/endpoints/investmentFunds';
import { useFetch } from '../../hooks/useFetch';
import { useAuthStore } from '../../store/authStore';

import ClientHeader from '../../components/layout/ClientHeader';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';

import styles from './ClientFundsPage.module.css';
import { getErrorMessage } from '../../utils/apiError';

export default function ClientFundsPage() {
  useEffect(() => { document.title = 'RAFBank | Investicioni fondovi'; }, []);
  const pageRef = useRef(null);
  const navigate = useNavigate();

  // 1. Provera role korisnika
  const user = useAuthStore((s) => s.user);
  const isSupervisor = user?.identity_type === 'supervisor'; // Proveri da li je 'supervisor' tačan string u bazi
  const isActuary = user?.identity_type === 'actuary';
  const actId = user?.actuary_id ?? user?.identity_id ?? user?.id;

  const [onlyMine, setOnlyMine] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetcher = () => {
    // Supervizor uvek vidi sve, Actuary može da filtrira
    if (isActuary && onlyMine && actId) {
      return investmentFundsApi.getFundsManagedByActuary(actId);
    }
    return investmentFundsApi.getFunds();
  };

  const { data: rawFunds, loading, error, refetch } = useFetch(fetcher, [
    isActuary,
    onlyMine,
    actId,
  ]);

  const funds = useMemo(() => {
    if (Array.isArray(rawFunds)) return rawFunds;
    if (Array.isArray(rawFunds?.data)) return rawFunds.data;
    return rawFunds?.content ?? [];
  }, [rawFunds]);

  // Akcija za supervizora (npr. brisanje fonda)
  const handleDeleteFund = async (e, fundId) => {
    e.stopPropagation(); // Da ne bi okinuo navigate na detalje
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovaj fond?')) return;

    setActionError(null);
    try {
      await investmentFundsApi.deleteFund(fundId);
      refetch(); // Osveži listu nakon brisanja
    } catch (err) {
      setActionError(getErrorMessage(err, 'Greška pri brisanju fonda.'));
    }
  };

  useLayoutEffect(() => {
    if (loading || funds.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity: 0,
        y: 20,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, [loading, funds]);

  return (
    <div ref={pageRef} className={styles.page}>
      <ClientHeader activeNav="funds" />

      <main className={styles.content}>
        <div className="page-anim">
          <p className={styles.breadcrumb}>Investicioni fondovi</p>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>
                {isSupervisor ? 'Administracija fondova' : 'Investicioni fondovi'}
              </h1>
              <p className={styles.pageDesc}>
                {isSupervisor 
                  ? 'Upravljanje svim dostupnim investicionim fondovima u sistemu.' 
                  : 'Pregled svih dostupnih investicionih fondova.'}
              </p>
            </div>

            <div className={styles.headerActions}>
              {/* Dugme za kreiranje novog fonda - SAMO ZA SUPERVIZORA */}
              {isSupervisor && (
                <button 
                  className={styles.btnPrimary}
                  onClick={() => navigate('/supervisor/funds/create')}
                >
                  + Kreiraj novi fond
                </button>
              )}

              {isActuary && (
                <button
                  className={styles.btnGhost}
                  onClick={() => setOnlyMine((v) => !v)}
                  disabled={!actId}
                >
                  {onlyMine ? 'Prikaži sve fondove' : 'Moji fondovi'}
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="page-anim">
            <Alert tip="greska" poruka={getErrorMessage(error, 'Greška pri učitavanju fondova.')} />
            <button className={styles.btnGhost} onClick={refetch}>Pokušaj ponovo</button>
          </div>
        ) : (
          <>
          {actionError && (
            <div className="page-anim" style={{ marginBottom: '1rem' }}>
              <Alert tip="greska" poruka={actionError} />
            </div>
          )}
          <section className={`page-anim ${styles.card}`}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Naziv fonda</th>
                    <th>Menadžer</th>
                    <th>Opis</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {funds.map((fund) => {
                    const fundId = fund.fund_id ?? fund.id ?? fund.fundId;
                    const managerName = [
                      fund.manager?.first_name ?? fund.first_name ?? '',
                      fund.manager?.last_name ?? fund.last_name ?? ''
                    ].filter(Boolean).join(' ') || '—';

                    return (
                      <tr key={fundId}>
                        <td className={styles.fundName}>{fund.name ?? '—'}</td>
                        <td>{managerName}</td>
                        <td className={styles.fundDesc}>{fund.description ?? '—'}</td>
                        <td className={styles.actionsCell}>
                          <div className={styles.rowButtons}>
                            <button
                              className={styles.btnPrimary}
                              onClick={() => navigate(`/client/investment-funds/${fundId}`)}
                            >
                              Detalji
                            </button>
                            
                            {/* DODATNE OPCIJE ZA SUPERVIZORA */}
                            {isSupervisor && (
                              <button
                                className={`${styles.btnGhost} ${styles.btnDelete}`}
                                onClick={(e) => handleDeleteFund(e, fundId)}
                              >
                                Obriši
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          </>
        )}
      </main>
    </div>
  );
}