import { useState, useRef, useEffect }  from 'react';
import { NavLink, useNavigate }         from 'react-router-dom';
import { useAuthStore }                 from '../../store/authStore';
import { usePermissions }               from '../../hooks/usePermissions';
import ChangePasswordModal              from './ChangePasswordModal';
import styles                           from './Navbar.module.css';

export default function Navbar() {
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const logout   = useAuthStore(s => s.logout);
  const { can, canAny } = usePermissions();


  const [showMenu,      setShowMenu]      = useState(false);
  const [showPwModal,   setShowPwModal]   = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const menuRef  = useRef(null);
  const adminRef = useRef(null);

  const { isSupervisor } = usePermissions();
  const canAccessSupervisorOrders = Boolean(isSupervisor); 

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setShowMenu(false);
      if (adminRef.current && !adminRef.current.contains(e.target)) setShowAdminMenu(false);
    }
    if (showMenu || showAdminMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu, showAdminMenu]);

  function handleLogout() {
    setShowMenu(false);
    logout();
    navigate('/login');
  }

  const initials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : 'KO';

  const fullName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : 'Korisnik';

  const hasAdminAccess = canAny('employee.view', 'admin.cards', 'admin.clients', 'admin.loans');

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
          {can('employee.view') && (
            <NavLink
              to="/employees"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              Zaposleni
            </NavLink>
          )}

          {can('admin.clients') && (
            <NavLink
              to="/clients"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              Klijenti
            </NavLink>
          )}

          {can('admin.loans') && (
            <NavLink
              to="/loans"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              Krediti
            </NavLink>
          )}

          <NavLink
            to="/payments"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            Plaćanja
          </NavLink>

          {can('admin.cards') && (
            <NavLink
              to="/cards"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              Kartice
            </NavLink>
          )}

          {can('employee.view') && (
            <NavLink
              to="/securities"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              Hartije
            </NavLink>
          )}

          {canAccessSupervisorOrders && (
          <NavLink
            to="/supervisor/orders"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            Orderi
          </NavLink>
          )}

          {can('account.create') && (
            <NavLink
              to="/accounts/new"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              Novi račun
            </NavLink>
          )}

          {can('isSuperAdmin') && (
            <NavLink
              to="/tax"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              Porez
            </NavLink>
          )}

          {can('employee.view') && (
            <NavLink
              to="/portfolio"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              Portfolio
            </NavLink>
          )}

          {hasAdminAccess && (
            <div className={styles.adminDropdownWrap} ref={adminRef}>
              <button
                className={`${styles.navLink} ${styles.adminToggle} ${showAdminMenu ? styles.active : ''}`}
                onClick={() => setShowAdminMenu(prev => !prev)}
              >
                Admin portali
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, opacity: 0.6 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showAdminMenu && (
                <div className={styles.adminMenu}>
                  {can('admin.cards') && (
                    <NavLink
                      to="/admin/cards"
                      className={({ isActive }) => `${styles.adminMenuItem} ${isActive ? styles.adminMenuItemActive : ''}`}
                      onClick={() => setShowAdminMenu(false)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      Računi i kartice
                    </NavLink>
                  )}
                  {can('admin.clients') && (
                    <NavLink
                      to="/admin/clients"
                      className={({ isActive }) => `${styles.adminMenuItem} ${isActive ? styles.adminMenuItemActive : ''}`}
                      onClick={() => setShowAdminMenu(false)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      Klijenti
                    </NavLink>
                  )}
                  {can('admin.loans') && (
                    <NavLink
                      to="/admin/loans"
                      className={({ isActive }) => `${styles.adminMenuItem} ${isActive ? styles.adminMenuItemActive : ''}`}
                      onClick={() => setShowAdminMenu(false)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 1 3 3v1h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3V5a3 3 0 0 1 3-3z"/>
                      </svg>
                      Krediti
                    </NavLink>
                  )}
                  {can('employee.view') && (
                    <NavLink
                      to="/admin/actuaries"
                      className={({ isActive }) => `${styles.adminMenuItem} ${isActive ? styles.adminMenuItemActive : ''}`}
                      onClick={() => setShowAdminMenu(false)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      Aktuari
                    </NavLink>
                  )}
                  {can('employee.view') && (
                    <NavLink
                      to="/admin/exchanges"
                      className={({ isActive }) => `${styles.adminMenuItem} ${isActive ? styles.adminMenuItemActive : ''}`}
                      onClick={() => setShowAdminMenu(false)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3v18h18"/>
                        <path d="M7 16l4-4 4 4 5-5"/>
                      </svg>
                      Berze
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.right}>
          {canAny('employee.create', 'employee.update', 'employee.delete') && (
            <span className={styles.adminBadge}>Administrator</span>
          )}
          <div className={styles.userDropdown} ref={menuRef}>
            <div
              className={styles.userChip}
              onClick={() => setShowMenu(prev => !prev)}
            >
              <div className={styles.avatar}>{initials}</div>
              <span className={styles.userName}>{fullName}</span>
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