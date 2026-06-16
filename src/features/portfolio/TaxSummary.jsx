import styles from './TaxSummary.module.css';

const MONTHS_SR = ['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar'];

export default function TaxSummary({ stats }) {
  if (!stats) return null;

  const now   = new Date();
  const month = MONTHS_SR[now.getMonth()];
  const year  = now.getFullYear();

  return (
    <div className={styles.taxWrapper}>
      <div className={styles.taxItem}>
        <span className={styles.label}>Neplaćen porez ({month} {year})</span>
        <span className={styles.unpaid}>{(stats.taxUnpaid ?? 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD</span>
      </div>
    </div>
  );
}