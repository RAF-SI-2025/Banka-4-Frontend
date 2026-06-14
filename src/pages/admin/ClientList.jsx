import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import gsap                                  from 'gsap';
import { useFetch }                          from '../../hooks/useFetch';
import { useDebounce }                       from '../../hooks/useDebounce';
import { clientsApi }                        from '../../api/endpoints/clients';
import Navbar                                from '../../components/layout/Navbar';
import Spinner                               from '../../components/ui/Spinner';
import Alert                                 from '../../components/ui/Alert';
import ClientTable                           from '../../features/clients/ClientTable';
import ClientFilters                         from '../../features/clients/ClientFilters';
import styles                                from './ClientList.module.css';

export default function ClientList() {
  useEffect(() => { document.title = 'RAFBank | Klijenti'; }, []);
  const pageRef = useRef(null);

  const [filters, setFilters] = useState({
    email:      '',
    first_name: '',
    last_name:  '',
    jmbg:       '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const debouncedEmail     = useDebounce(filters.email,      400);
  const debouncedFirstName = useDebounce(filters.first_name, 400);
  const debouncedLastName  = useDebounce(filters.last_name,  400);
  const debouncedJmbg      = useDebounce(filters.jmbg,       400);

  const { data, loading, error } = useFetch(
    () => {
      const params = { page, page_size: pageSize };
      if (debouncedEmail)     params.email      = debouncedEmail;
      if (debouncedFirstName) params.first_name = debouncedFirstName;
      if (debouncedLastName)  params.last_name  = debouncedLastName;
      if (debouncedJmbg)      params.jmbg       = debouncedJmbg;
      return clientsApi.getAll(params);
    },
    [debouncedEmail, debouncedFirstName, debouncedLastName, debouncedJmbg, page]
  );

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    setPage(1);
  }

  const totalPages = data?.total_pages ?? 0;

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Klijenti</span>
          </div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Klijenti</h1>
              <p className={styles.pageDesc}>Pregled svih klijenata banke.</p>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.btnPrimary} onClick={() => window.location.href = '/clients/new'}>
                + Novi klijent
              </button>
            </div>
          </div>
        </div>

        <div className="page-anim">
          <ClientFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {loading && <Spinner />}
        {error   && <Alert tip="greska" poruka={error.error ?? 'Greška pri učitavanju.'} />}

        {!loading && !error && data && (
          <div className={`page-anim ${styles.tableCard}`}>
            <ClientTable clients={data.data} />
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  ← Prethodna
                </button>
                <span className={styles.pageInfo}>
                  Strana {page} od {totalPages}
                </span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Sledeća →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
