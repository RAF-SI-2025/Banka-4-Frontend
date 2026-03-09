import { useNavigate } from 'react-router-dom';
import styles from './NotFound.module.css';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className={styles.stranica}>
      <div className={styles.sadrzaj}>
        <p className={styles.kod}>404</p>
        <h1 className={styles.naslov}>Stranica nije pronađena</h1>
        <p className={styles.opis}>Stranica koju tražite ne postoji ili je premeštena.</p>
        <button className={styles.dugme} onClick={() => navigate('/')}>
          Nazad na početnu
        </button>
      </div>
    </div>
  );
}
