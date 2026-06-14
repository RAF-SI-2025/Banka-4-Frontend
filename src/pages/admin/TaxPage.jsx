import { useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import gsap                                                       from 'gsap';
import { useDebounce }                                            from '../../hooks/useDebounce';
import Navbar                                                     from '../../components/layout/Navbar';
import Alert                                                      from '../../components/ui/Alert';
import TaxTable                                                   from '../../features/tax/TaxTable';
import TaxFilters                                                 from '../../features/tax/TaxFilters';
import TaxCalculationModal                                        from '../../features/tax/TaxCalculationModal';
import { taxApi }                                                 from '../../api/endpoints/tax';
import styles                                                     from './TaxPage.module.css';

const USER_TYPE_MAP = {
  client:  'Klijent',
  actuary: 'Aktuar',
};

// Vraća status na osnovu dugovanja (backend ne šalje status direktno)
function deriveStatus(taxOwedRsd) {
  if (taxOwedRsd == null || taxOwedRsd === 0) return 'Bez duga';
  return 'Neplaćen';
}

function normalizeUser(u) {
  const taxDebt = u.taxOwedRsd ?? 0;
  return {
    id:         u.id,
    first_name: u.firstName  ?? '',
    last_name:  u.lastName   ?? '',
    email:      u.email      ?? '',
    team:       USER_TYPE_MAP[u.userType?.toLowerCase()] ?? u.userType ?? '',
    tax_debt:   taxDebt,
    tax_paid:   0,
    tax_status: deriveStatus(taxDebt),
    accounts:   [],
  };
}

export default function TaxPage() {
  useEffect(() => { document.title = 'RAFBank | Porezi'; }, []);
  const pageRef = useRef(null);

  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [filters, setFilters] = useState({
    first_name: '',
    last_name:  '',
    team:       '',
    status:     '',
  });

  const [_modalUser,  setModalUser]   = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calcSuccess, setCalcSuccess] = useState(null);
  const [calcError,   setCalcError]   = useState(null);
  const [runAll,      setRunAll]      = useState(false);

  const debouncedFirstName = useDebounce(filters.first_name, 400);
  const debouncedLastName  = useDebounce(filters.last_name,  400);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res  = await taxApi.getUsers({ page_size: 1000 });
      // tradingApi nema response interceptor — unwrapujemo res.data
      const body = res?.data ?? res;
      const list = Array.isArray(body) ? body : (body?.data ?? []);
      setUsers(list.map(normalizeUser));
    } catch (err) {
      setError(err?.message ?? 'Greška pri učitavanju korisnika.');
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (debouncedFirstName && !u.first_name.toLowerCase().startsWith(debouncedFirstName.toLowerCase())) return false;
      if (debouncedLastName  && !u.last_name.toLowerCase().startsWith(debouncedLastName.toLowerCase()))   return false;
      if (filters.team   && u.team       !== filters.team)   return false;
      if (filters.status && u.tax_status !== filters.status) return false;
      return true;
    });
  }, [users, debouncedFirstName, debouncedLastName, filters.team, filters.status]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity:  0,
        y:        20,
        duration: 0.4,
        stagger:  0.08,
        ease:     'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  function handleFilterChange(newFilters) {
    setFilters(newFilters);
  }

  // POST /api/tax/collect nema parametre — uvek radi za sve korisnike
  async function handleRunCalculation() {
    setCalculating(true);
    setCalcSuccess(null);
    setCalcError(null);
    try {
      await taxApi.collect();
      setCalcSuccess('Obračun poreza je uspešno pokrenut za sve korisnike.');
      await fetchUsers();
    } catch (err) {
      setCalcError(err?.message ?? 'Greška pri pokretanju obračuna poreza.');
    } finally {
      setModalUser(null);
      setRunAll(false);
      setCalculating(false);
    }
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>

        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Porez</span>
          </div>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Porez na kapitalnu dobit</h1>
              <p className={styles.pageDesc}>
                Pregled i upravljanje porezom na kapitalnu dobit za klijente i aktuare.
              </p>
            </div>
            <button
              className={styles.btnPrimary}
              onClick={() => { setRunAll(true); setModalUser(null); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Pokreni sve obračune
            </button>
          </div>
        </div>

        {calcSuccess && (
          <div className="page-anim">
            <Alert tip="uspeh" poruka={calcSuccess} />
          </div>
        )}

        {(error || calcError) && !calcSuccess && (
          <div className="page-anim">
            <Alert tip="greska" poruka={error ?? calcError} />
          </div>
        )}

        <div className="page-anim">
          <TaxFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>

        <div className={`page-anim ${styles.tableCard}`}>
          <TaxTable
            users={filteredUsers}
            loading={loading}
          />
        </div>

      </main>

      {runAll && (
        <TaxCalculationModal
          user={null}
          bulk={true}
          loading={calculating}
          onConfirm={handleRunCalculation}
          onClose={() => setRunAll(false)}
        />
      )}
    </div>
  );
}
