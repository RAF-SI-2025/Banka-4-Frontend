import { useNavigate } from 'react-router-dom';
import styles from './ClientTable.module.css';

/**
 * Objedinjena tabela klijenata.
 *
 * Props:
 *  - clients: Array — lista klijenata
 *  - variant: 'profile' | 'select' (default 'profile')
 *      'profile' → read-only lista sa dugmetom "Profil →" (admin lista, dashboard)
 *      'select'  → izbor klijenta za izmenu (koristi selectedId / onSelect)
 *  - onRowClick: (clientId) => void — klik na red (variant 'profile')
 *  - selectedId: id trenutno izabranog klijenta (variant 'select')
 *  - onSelect: (client) => void — izbor klijenta (variant 'select')
 */
export default function ClientTable({
  clients,
  variant = 'profile',
  onRowClick,
  selectedId,
  onSelect,
}) {
  const navigate = useNavigate();

  if (variant === 'select') {
    if (!clients?.length) {
      return (
        <div className={styles.tableCard}>
          <div className={styles.emptyState}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--tx-3)" strokeWidth="1.5" width="32" height="32">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>Nema klijenata za prikaz.</p>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.selectTable}>
            <thead>
              <tr>
                <th>Prezime, Ime</th>
                <th>Email</th>
                <th>JMBG</th>
                <th>Telefon</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr
                  key={client.id}
                  className={`${styles.row} ${selectedId === client.id ? styles.rowActive : ''}`}
                  onClick={() => onSelect?.(client)}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelect?.(client)}
                  role="button"
                  aria-selected={selectedId === client.id}
                >
                  <td>
                    <span className={styles.selectName}>
                      {client.last_name}, {client.first_name}
                    </span>
                  </td>
                  <td className={styles.meta}>{client.email}</td>
                  <td className={styles.mono}>{client.jmbg}</td>
                  <td className={styles.meta}>{client.phone_number ?? '—'}</td>
                  <td>
                    <span className={styles.editHint}>
                      {selectedId === client.id ? 'Izabran ›' : 'Izmeni ›'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // variant === 'profile'
  if (!clients?.length) {
    return <div className={styles.empty}>Nema klijenata za prikaz.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ime</th>
            <th>Prezime</th>
            <th>Email</th>
            <th>Telefon</th>
            <th>Adresa</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, i) => {
            const clientId = client.id ?? client.user_id ?? client.client_id;
            return (
              <tr key={clientId ?? client.email ?? i} onClick={() => onRowClick?.(clientId)}>
                <td className={styles.name}>{client.first_name}</td>
                <td className={styles.name}>{client.last_name}</td>
                <td className={styles.email}>{client.email}</td>
                <td className={styles.phone}>{client.phone}</td>
                <td className={styles.address}>{client.address}</td>
                <td>
                  <span className={`${styles.badge} ${client.active ? styles.badgeActive : styles.badgeInactive}`}>
                    {client.active ? 'Aktivan' : 'Neaktivan'}
                  </span>
                </td>
                <td>
                  <button
                    className={styles.btnProfil}
                    onClick={e => { e.stopPropagation(); navigate(`/clients/${clientId}`); }}
                  >
                    Profil →
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
