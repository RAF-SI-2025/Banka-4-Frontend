import React, { useState } from 'react';
import styles from './TaxTable.module.css';

const STATUS_CLASS = {
  'Neplaćen':  styles.statusUnpaid,
  'Plaćen':    styles.statusPaid,
  'Bez duga':  styles.statusNone,
  'Delimično': styles.statusPartial,
};

export default function TaxTable({ users = [], loading = false }) {
  const [expandedId, setExpandedId] = useState(null);

  function toggleExpand(userId) {
    setExpandedId(prev => prev === userId ? null : userId);
  }

  if (loading) {
    return <div className={styles.empty}>Učitavanje...</div>;
  }

  if (users.length === 0) {
    return (
      <div className={styles.empty}>
        Nema korisnika koji odgovaraju zadatim filterima.
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: 40 }}></th>
            <th>Korisnik</th>
            <th>Email</th>
            <th>Tim</th>
            <th>Dugovanje (RSD)</th>
            <th>Status poreza</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => {
            const isExpanded = expandedId === user.id;
            const hasAccounts = user.accounts && user.accounts.length > 0;
            const ukupnoDugovanje = hasAccounts
              ? user.accounts.reduce((sum, acc) => sum + (acc.tax_rsd ?? 0), 0)
              : user.tax_debt;

            return (
              <React.Fragment key={user.email || user.id || i}>
                <tr
                  className={`${styles.mainRow} ${isExpanded ? styles.mainRowExpanded : ''} ${hasAccounts ? styles.mainRowClickable : ''}`}
                  onClick={() => hasAccounts && toggleExpand(user.id)}
                >
                  <td className={styles.chevronCell}>
                    {hasAccounts && (
                      <svg
                        className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                        width="13" height="13" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </td>
                  <td className={styles.nameCell}>
                    <span className={styles.name}>{user.first_name} {user.last_name}</span>
                  </td>
                  <td className={styles.emailCell}>{user.email}</td>
                  <td>
                    <span className={`${styles.teamBadge} ${user.team === 'Aktuar' ? styles.teamAktuar : styles.teamKlijent}`}>
                      {user.team}
                    </span>
                  </td>
                  <td className={styles.amountCell}>
                    <span className={user.tax_debt > 0 ? styles.amountOwed : styles.amountClear}>
                      {formatRsd(user.tax_debt)}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${STATUS_CLASS[user.tax_status] ?? ''}`}>
                      {user.tax_status}
                    </span>
                  </td>
                </tr>

                {isExpanded && hasAccounts && (
                  <tr className={styles.expandRow}>
                    <td colSpan={6} className={styles.expandCell}>
                      <div className={styles.expandContent}>
                        <table className={styles.accountsTable}>
                          <thead>
                            <tr>
                              <th>Broj računa</th>
                              <th>Valuta</th>
                              <th>Dobit</th>
                              <th>Dugovanje po računu (RSD)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {user.accounts.map((acc, i) => (
                              <tr key={i}>
                                <td className={styles.accNumber}>{acc.account_number}</td>
                                <td>{acc.currency}</td>
                                <td className={styles.amountCell}>
                                  <span className={acc.profit > 0 ? styles.amountOwed : styles.amountClear}>
                                    {formatRsd(acc.profit)} {acc.currency}
                                  </span>
                                </td>
                                <td className={styles.amountCell}>
                                  <span className={acc.tax_rsd > 0 ? styles.amountOwed : styles.amountClear}>
                                    {formatRsd(acc.tax_rsd)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            <tr className={styles.totalRow}>
                              <td colSpan={3} className={styles.totalLabel}>Ukupno dugovanje</td>
                              <td className={styles.amountCell}>
                                <span className={ukupnoDugovanje > 0 ? styles.amountOwed : styles.amountClear}>
                                  {formatRsd(ukupnoDugovanje)}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatRsd(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
