import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import gsap                                   from 'gsap';
import { useFetch }                           from '../../hooks/useFetch';
import { clientsApi }                         from '../../api/endpoints/clients';
import Navbar                                 from '../../components/layout/Navbar';
import Spinner                                from '../../components/ui/Spinner';
import Alert                                  from '../../components/ui/Alert';
import ClientTable                            from '../../features/clients/ClientTable';
import ClientEditForm                         from '../../features/clients/ClientEditForm';
import styles                                 from './ClientsPortal.module.css';

export default function ClientsPortal() {
  useEffect(() => { document.title = 'RAFBank | Portal klijenata'; }, []);
  const pageRef = useRef(null);

  const { data, loading, error, refetch } = useFetch(() => clientsApi.getAll());
  const allClients = data?.data ?? (Array.isArray(data) ? data : []);

  const [search, setSearch] = useState('');
  const clients = allClients.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.first_name ?? '').toLowerCase().includes(q) ||
      (c.last_name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.jmbg ?? '').includes(q)
    );
  });

  const [selected,    setSelected]    = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [emailError,  setEmailError]  = useState(null);

  function handleSelect(client) {
    setSelected(client);
    setSaveError(null);
    setSaveSuccess(null);
    setEmailError(null);
  }

  async function handleSave(formData) {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    setEmailError(null);
    try {
      await clientsApi.update(selected.id, formData);
      setSaveSuccess('Podaci klijenta su uspešno sačuvani.');
      refetch();
    } catch (err) {
      const msg    = err?.response?.data?.error ?? err?.message ?? '';
      const status = err?.response?.status;
      if (status === 409 || msg.toLowerCase().includes('email')) {
        setEmailError('Ova email adresa je već u upotrebi u sistemu.');
      } else {
        setSaveError(msg || 'Greška pri čuvanju podataka.');
      }
    } finally {
      setSaving(false);
    }
  }

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', { opacity: 0, y: 20, duration: 0.45, stagger: 0.07, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />
      <main className={styles.sadrzaj}>

        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Admin</span><span className={styles.sep}>›</span>
            <span className={styles.current}>Portal za klijente</span>
          </div>
          <h1 className={styles.title}>Portal za klijente</h1>
          <p className={styles.desc}>Pregled i izmena matičnih podataka klijenata.</p>
        </div>

        {loading && <Spinner />}
        {!loading && error && (
          <Alert tip="greska" poruka={error?.response?.data?.error ?? 'Greška pri učitavanju klijenata.'} />
        )}

        {!loading && !error && (
          <>
            <div className="page-anim" style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Pretraži po imenu, prezimenu, emailu ili JMBG..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', maxWidth: 480, height: 42, padding: '0 14px',
                  border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
                  fontSize: 14, background: 'var(--surface)',
                }}
              />
            </div>
            <div className="page-anim">
              <ClientTable
                variant="select"
                clients={clients}
                selectedId={selected?.id}
                onSelect={handleSelect}
              />
            </div>

            {selected && (
              <div className="page-anim">
                <ClientEditForm
                  client={selected}
                  onSave={handleSave}
                  onCancel={() => setSelected(null)}
                  saving={saving}
                  saveError={saveError}
                  saveSuccess={saveSuccess}
                  emailError={emailError}
                />
              </div>
            )}

            {!selected && (
              <div className={`page-anim ${styles.hint}`}>
                Kliknite na red u tabeli da izmenite podatke klijenta.
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
