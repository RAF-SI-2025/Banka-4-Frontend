import styles from './Alert.module.css';

const ICONS = {
  greska:  '⚠',
  uspeh:   '✓',
  info:    'ℹ',
};

export default function Alert({ tip = 'info', poruka, children }) {
  const icon = ICONS[tip] ?? ICONS.info;
  return (
    <div className={`${styles.alert} ${styles[tip]}`} role="alert">
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <span>{poruka ?? children}</span>
    </div>
  );
}
