import { useState, useRef, useEffect }  from 'react';
import { NavLink, useNavigate }         from 'react-router-dom';
import { useAuthStore }                 from '../../store/authStore';
import ChangePasswordModal              from './ChangePasswordModal';
import styles                           from './Navbar.module.css';

export default function Navbar() {
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const logout   = useAuthStore(s => s.logout);

  const [showMenu,     setShowMenu]     = useState(false);
  const [showPwModal,  setShowPwModal]  = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  function handleLogout() {
    setShowMenu(false);
    logout();
    navigate('/login');
  }

  const initijali = user?.ime && user?.prezime
    ? `${user.ime[0]}${user.prezime[0]}`.toUpperCase()
    : 'KO';

  const punoIme = user?.ime && user?.prezime
    ? `${user.ime} ${user.prezime}`
    : 'Korisnik';

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className={styles.brandText}>RAFBank</span>
        </div>

        <div className={styles.nav}>
          <NavLink
            to="/employees"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            Zaposleni
          </NavLink>
          <NavLink
            to="/clients"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            Klijenti
          </NavLink>
        </div>

        <div className={styles.right}>
          {user?.jeAdmin && (
            <span className={styles.adminBadge}>Administrator</span>
          )}
          <div className={styles.userDropdown} ref={menuRef}>
            <div
              className={styles.userChip}
              onClick={() => setShowMenu(prev => !prev)}
            >
              <div className={styles.avatar}>{initijali}</div>
              <span className={styles.userName}>{punoIme}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {showMenu && (
              <div className={styles.dropdownMenu}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { setShowMenu(false); setShowPwModal(true); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Promeni lozinku
                </button>
                <button className={styles.dropdownItem} onClick={handleLogout}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Odjavi se
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <ChangePasswordModal open={showPwModal} onClose={() => setShowPwModal(false)} />
    </>
  );
}
