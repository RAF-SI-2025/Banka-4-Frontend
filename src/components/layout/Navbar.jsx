import { useState, useRef, useEffect }  from 'react';
import { NavLink, useNavigate }         from 'react-router-dom';
import { useAuthStore }                 from '../../store/authStore';
import { usePermissions }               from '../../hooks/usePermissions';
import ChangePasswordModal              from './ChangePasswordModal';
import WatchlistWidget                  from './WatchlistWidget';
import PriceAlertsWidget               from './PriceAlertsWidget';
import { useWatchlistStore }            from '../../store/watchlistStore';
import styles                           from './Navbar.module.css';

const Chevron = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, opacity: 0.6 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function Navbar() {
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const logout   = useAuthStore(s => s.logout);
  const { can, canAny } = usePermissions();

  const [showPwModal,    setShowPwModal]    = useState(false);
  const [showTrzistMenu, setShowTrzistMenu] = useState(false);
  const [showOtcMenu,    setShowOtcMenu]    = useState(false);
  const [showAdminMenu,  setShowAdminMenu]  = useState(false);

  const trzistRef = useRef(null);
  const otcRef    = useRef(null);
  const adminRef  = useRef(null);

  const { isSupervisor } = usePermissions();
  const canAccessSupervisorPages = Boolean(isSupervisor);
  const canSeeMyOrders = canAccessSupervisorPages;  useEffect(() => {
    function handleClick(e) {
      if (trzistRef.current && !trzistRef.current.contains(e.target)) setShowTrzistMenu(false);
      if (otcRef.current    && !otcRef.current.contains(e.target))    setShowOtcMenu(false);
      if (adminRef.current  && !adminRef.current.contains(e.target))  setShowAdminMenu(false);
    }
    if (showTrzistMenu || showOtcMenu || showAdminMenu)
      document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTrzistMenu, showOtcMenu, showAdminMenu]);

  function handleLogout() {
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
  const hasAdminDropdown = hasAdminAccess || can('account.create') || can('isSuperAdmin') || canAccessSupervisorPages;
  const isAgent = canAny('portfolio.otc.manage', 'portfolio.options.view', 'portfolio.options.exercise', 'admin.all', 'trading');
  const hasTrziste = can('employee.view') || isAgent || canAccessSupervisorPages;
  const hasOtc = canAccessSupervisorPages || isAgent;

  const initWatchlist = useWatchlistStore(s => s.init);
  useEffect(() => {
    if (!isAgent) return;
    const uid = user?.client_id ?? user?.employee_id ?? user?.id;
    if (uid) initWatchlist(String(uid));
  }, [isAgent, user?.client_id, user?.employee_id, user?.id, initWatchlist]);

  function navItem(to, label, onClick) {
    return (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) => `${styles.adminMenuItem} ${isActive ? styles.adminMenuItemActive : ''}`}
        onClick={onClick}
      >
        {label}
      </NavLink>
    );
  }

  return (
    <>
      <nav className={styles.navbar}>
        <button
          className={styles.brand}
          onClick={() => navigate('/dashboard')}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <div className={styles.brandIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className={styles.brandText}>RAFBank</span>
        </button>

        <div className={styles.nav}>
          {/* Plaćanja — standalone */}
          <NavLink
            to="/payments"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            Plaćanja
          </NavLink>

          {/* Tržište dropdown */}
          {hasTrziste && (
            <div className={styles.adminDropdownWrap} ref={trzistRef}>
              <button
                className={`${styles.navLink} ${styles.adminToggle} ${showTrzistMenu ? styles.active : ''}`}
                onClick={() => setShowTrzistMenu(p => !p)}
              >
                Tržište <Chevron />
              </button>
              {showTrzistMenu && (
                  <div className={styles.adminMenu}>
                      {(can('employee.view') || isAgent) &&
                          navItem('/securities', 'Hartije', () => setShowTrzistMenu(false))}

                      {(isAgent || canAccessSupervisorPages) &&
                          navItem('/investment-funds', 'Fondovi', () => setShowTrzistMenu(false))}

                      {(can('employee.view') || isAgent) &&
                          navItem('/portfolio', 'Portfolio', () => setShowTrzistMenu(false))}

                      {(can('employee.view') || isAgent) &&
                          navItem('/dtc', 'DTC', () => setShowTrzistMenu(false))}
                  </div>
              )}
            </div>
          )}

          {/* OTC dropdown */}
          {hasOtc && (
            <div className={styles.adminDropdownWrap} ref={otcRef}>
              <button
                className={`${styles.navLink} ${styles.adminToggle} ${showOtcMenu ? styles.active : ''}`}
                onClick={() => setShowOtcMenu(p => !p)}
              >
                OTC <Chevron />
              </button>
              {showOtcMenu && (
                <div className={styles.adminMenu}>
                  {navItem('/otc', 'OTC Portal', () => setShowOtcMenu(false))}
                  {isAgent &&
                    navItem('/otc?tab=AKTIVNE', 'Aktivne ponude', () => setShowOtcMenu(false))}
                  {canAccessSupervisorPages &&
                    navItem('/supervisor/orders', 'Orderi', () => setShowOtcMenu(false))}
                  {canAccessSupervisorPages &&
                    navItem('/profit-bank', 'Profit Banke', () => setShowOtcMenu(false))}
                  {canSeeMyOrders && navItem('/orders/my', 'Moji orderi', () => setShowOtcMenu(false))}</div>
              )}
            </div>
          )}

          {/* Admin portali dropdown */}
          {hasAdminDropdown && (
            <div className={styles.adminDropdownWrap} ref={adminRef}>
              <button
                className={`${styles.navLink} ${styles.adminToggle} ${showAdminMenu ? styles.active : ''}`}
                onClick={() => setShowAdminMenu(p => !p)}
              >
                Admin portali <Chevron />
              </button>
              {showAdminMenu && (
                <div className={styles.adminMenu}>
                  {can('employee.view') &&
                    navItem('/employees', 'Zaposleni', () => setShowAdminMenu(false))}
                  {can('admin.clients') &&
                    navItem('/clients', 'Klijenti', () => setShowAdminMenu(false))}
                  {can('admin.clients') &&
                    navItem('/admin/clients', 'Portal klijenata', () => setShowAdminMenu(false))}
                  {can('admin.loans') &&
                    navItem('/loans', 'Krediti', () => setShowAdminMenu(false))}
                  {can('admin.loans') &&
                    navItem('/admin/loans', 'Portal kredita', () => setShowAdminMenu(false))}
                  {can('admin.cards') &&
                    navItem('/cards', 'Kartice', () => setShowAdminMenu(false))}
                  {can('admin.cards') &&
                    navItem('/admin/cards', 'Računi i kartice', () => setShowAdminMenu(false))}
                  {(can('employee.view') || canAccessSupervisorPages) &&
                    navItem('/admin/actuaries', 'Aktuari', () => setShowAdminMenu(false))}
                  {canAccessSupervisorPages &&
                    navItem('/admin/audit-log', 'Audit log', () => setShowAdminMenu(false))}
                  {can('employee.view') &&
                    navItem('/admin/exchanges', 'Berze', () => setShowAdminMenu(false))}
                  {can('account.create') &&
                    navItem('/accounts/new', 'Novi račun', () => setShowAdminMenu(false))}
                  {can('isSuperAdmin') &&
                    navItem('/tax', 'Porez', () => setShowAdminMenu(false))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.right}>
          {isAgent && <WatchlistWidget />}
          {isAgent && <PriceAlertsWidget />}
          {canAny('employee.create', 'employee.update', 'employee.delete') && (
            <span className={styles.adminBadge}>Administrator</span>
          )}
          <button className={styles.userChip} onClick={() => setShowPwModal(true)}>
            <div className={styles.avatar}>{initials}</div>
            <span className={styles.userName}>{fullName}</span>
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Odjavi se
          </button>
        </div>
      </nav>

      <ChangePasswordModal open={showPwModal} onClose={() => setShowPwModal(false)} />
    </>
  );
}
