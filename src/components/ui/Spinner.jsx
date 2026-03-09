import styles from './Spinner.module.css';

export default function Spinner() {
  return (
    <div className={styles.overlay}>
      <div className={styles.spinner} aria-label="Učitavanje..." />
    </div>
  );
}
