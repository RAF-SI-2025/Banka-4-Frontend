import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import LoanStatusBadge from './LoanStatusBadge';
import styles from './LoanList.module.css';

export default function LoanList({ loans, selectedId, onSelectLoan }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        opacity: 0,
        x: -16,
        duration: 0.4,
        ease: 'power2.out',
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  const sortedLoans = [...loans].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));

  const formatCurrency = (amount) =>
    amount != null
      ? new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2 }).format(amount)
      : '—';

  const LOAN_TYPE_LABELS = {
    CASH: 'Keš kredit',
    AUTO: 'Auto kredit',
    MORTGAGE: 'Stambeni kredit',
  };

  function loanDisplayName(loan) {
    const typeName = LOAN_TYPE_LABELS[loan.loan_type] ?? loan.loan_type ?? loan.name ?? `Kredit #${loan.id}`;
    const currency = loan.currency ?? '';
    return currency ? `${typeName} u ${currency}` : typeName;
  }

  if (sortedLoans.length === 0) {
    return (
      <div className={styles.listContainer} style={{ padding: '2rem', textAlign: 'center', color: 'var(--tx-3)', fontSize: 14 }}>
        Nema aktivnih kredita.
      </div>
    );
  }

  return (
    <div ref={ref} className={styles.listContainer}>
      {sortedLoans.map((loan) => (
        <div
          key={loan.id}
          className={`ll-card ${styles.loanCard} ${selectedId === loan.id ? styles.active : ''}`}
          onClick={() => onSelectLoan(loan)}
        >
          <div className={styles.cardHeader}>
            <span className={styles.loanName}>{loanDisplayName(loan)}</span>
            <LoanStatusBadge status={loan.status} />
          </div>

          <div className={styles.cardBody}>
            <p className={styles.idLabel}>Broj partije: <strong>{loan.contract_number ?? loan.id}</strong></p>
            <div className={styles.amountWrapper}>
              <span className={styles.label}>Ukupna cifra</span>
              <span className={styles.amount}>
                {formatCurrency(loan.amount)} {loan.currency ?? ''}
              </span>
            </div>
            {loan.monthly_installment != null && (
              <div className={styles.amountWrapper}>
                <span className={styles.label}>Mesečna rata</span>
                <span className={styles.amount}>
                  {formatCurrency(loan.monthly_installment)} {loan.currency ?? ''}
                </span>
              </div>
            )}
          </div>

          <div className={styles.selectionIndicator}></div>
        </div>
      ))}
    </div>
  );
}
