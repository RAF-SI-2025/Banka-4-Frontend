import { useRef, useLayoutEffect, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useFetch } from '../../hooks/useFetch';
import { clientsApi } from '../../api/endpoints/clients';
import { clientApi } from '../../api/endpoints/client';
import Navbar from '../../components/layout/Navbar';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import styles from './ClientDetails.module.css';

function InfoRow({ label, value }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value ?? '—'}</span>
    </div>
  );
}

export default function ClientDetails() {
  useEffect(() => { document.title = 'RAFBank | Detalji klijenta'; }, []);
  const { id } = useParams();
  const navigate = useNavigate();
  const pageRef = useRef(null);

  const { data: client, loading, error } = useFetch(() => clientsApi.getById(id), [id]);
  const { data: accountsRes } = useFetch(() => clientApi.getAccounts(id), [id]);
  const accounts = Array.isArray(accountsRes) ? accountsRes : accountsRes?.data ?? [];

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', { opacity: 0, y: 20, duration: 0.45, stagger: 0.07, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />
      <main className={styles.sadrzaj}>

        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span
              className={styles.breadcrumbLink}
              onClick={() => navigate('/clients')}
            >
              Klijenti
            </span>
            <span className={styles.sep}>›</span>
            <span className={styles.current}>Profil klijenta</span>
          </div>
          <div className={styles.backRow}>
            <button className={styles.btnBack} onClick={() => navigate('/clients')}>
              ← Nazad
            </button>
          </div>
          <h1 className={styles.title}>Profil klijenta</h1>
        </div>

        {loading && <Spinner />}
        {error && <Alert tip="greska" poruka="Greška pri učitavanju podataka klijenta." />}

        {!loading && !error && client && (
          <>
            <section className={`page-anim ${styles.card}`}>
              <div className={styles.sectionHeader}>
                Lični podaci
              </div>
              <InfoRow label="Ime" value={client.first_name} />
              <InfoRow label="Prezime" value={client.last_name} />
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Telefon" value={client.phone} />
              <InfoRow label="Adresa" value={client.address} />
              <InfoRow label="JMBG" value={client.jmbg} />
              <InfoRow label="Status" value={client.active ? 'Aktivan' : 'Neaktivan'} />
            </section>

            <section className={`page-anim ${styles.card}`}>
              <div className={styles.sectionHeader}>
                Računi ({accounts.length})
              </div>
              {accounts.length === 0 ? (
                <p className={styles.emptyAccounts}>Klijent nema otvorenih računa.</p>
              ) : (
                <table className={styles.accountsTable}>
                  <thead>
                    <tr>
                      {['Broj računa', 'Naziv', 'Valuta', 'Stanje', 'Status'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(acc => {
                      const num = acc.account_number ?? acc.number;
                      const balance = acc.balance ?? acc.available_balance ?? 0;
                      const isActive = acc.status === 'Active' || acc.active;
                      return (
                        <tr key={num}>
                          <td className={styles.accountNumber}>{num}</td>
                          <td>{acc.name ?? '—'}</td>
                          <td>{acc.currency ?? '—'}</td>
                          <td className={styles.balanceCell}>
                            {balance.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} {acc.currency}
                          </td>
                          <td>
                            <span className={`${styles.badge} ${isActive ? styles.badgeActive : styles.badgeInactive}`}>
                              {acc.status ?? (isActive ? 'Aktivan' : 'Neaktivan')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
