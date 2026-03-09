import { useState, useRef, useLayoutEffect }  from 'react';
import { useNavigate, Link }                   from 'react-router-dom';
import gsap                                    from 'gsap';
import { useFetch }                            from '../hooks/useFetch';
import { useDebounce }                         from '../hooks/useDebounce';
import { employeesApi }                        from '../api/endpoints/employees';
import { useAuthStore }                        from '../store/authStore';
import Navbar                                  from '../components/layout/Navbar';
import Spinner                                 from '../components/ui/Spinner';
import Alert                                   from '../components/ui/Alert';
import EmployeeTable                           from '../features/employees/EmployeeTable';
import EmployeeFilters                         from '../features/employees/EmployeeFilters';
import styles                                  from './EmployeeList.module.css';

export default function EmployeeList() {
  const navigate = useNavigate();
  const pageRef  = useRef(null);
  const user     = useAuthStore(s => s.user);

  const [filters, setFilters] = useState({
    search:    '',
    status:    '',
    departman: '',
    pozicija:  '',
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  const debouncedSearch = useDebounce(filters.search, 400);

  const { data, loading, error } = useFetch(
    () => employeesApi.getAll({
      search:    debouncedSearch,
      status:    filters.status,
      departman: filters.departman,
      pozicija:  filters.pozicija,
      page,
      limit,
    }),
    [debouncedSearch, filters.status, filters.departman, filters.pozicija, page]
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

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Zaposleni</span>
          </div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Zaposleni</h1>
              <p className={styles.pageDesc}>Pregled i upravljanje listom zaposlenih.</p>
            </div>
            {user?.jeAdmin && (
              <Link to="/employees/new" className={styles.btnPrimary}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Novi zaposleni
              </Link>
            )}
          </div>
        </div>

        <div className="page-anim">
          <EmployeeFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {loading && <Spinner />}
        {error && <Alert tip="greska" poruka={error.error ?? 'Greška pri učitavanju.'} />}

        {!loading && !error && data && (
          <div className={`page-anim ${styles.tableCard}`}>
            <EmployeeTable
              employees={data.data}
              onRowClick={id => navigate(`/employees/${id}`)}
            />
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
