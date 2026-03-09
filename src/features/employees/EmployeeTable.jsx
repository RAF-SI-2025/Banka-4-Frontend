import styles from './EmployeeTable.module.css';

export default function EmployeeTable({ employees, onRowClick }) {
  if (!employees?.length) {
    return <div className={styles.empty}>Nema zaposlenih za prikaz.</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ime</th>
            <th>Prezime</th>
            <th>Email</th>
            <th>Pozicija</th>
            <th>Departman</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(z => (
            <tr key={z.id} onClick={() => onRowClick(z.id)}>
              <td className={styles.name}>{z.ime}</td>
              <td className={styles.name}>{z.prezime}</td>
              <td className={styles.email}>{z.email}</td>
              <td>{z.pozicija}</td>
              <td>{z.departman}</td>
              <td>
                <span className={`${styles.badge} ${z.aktivan ? styles.badgeActive : styles.badgeInactive}`}>
                  {z.aktivan ? 'Aktivan' : 'Neaktivan'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
