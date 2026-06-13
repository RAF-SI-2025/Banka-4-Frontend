import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import styles from './ClientHeader.module.css';
import { usePermissions } from '../../hooks/usePermissions';
import Toast from '../ui/Toast';
import { useOtcNotifStore } from '../../store/otcNotificationsStore';
import { useOtcOfferPolling } from '../../hooks/useOtcOfferPolling';
import WatchlistWidget from './WatchlistWidget';
import PriceAlertsWidget from './PriceAlertsWidget';
import { useWatchlistStore } from '../../store/watchlistStore';
/**
 * Zajednički header za sve klijentske stranice.
 * Props:
 *  - activeNav: string — koja stavka je aktivna ('transfers' | 'payments' | ...)
 *  - onProfileClick: () => void — otvara profile modal (opcionalno)
 */
export default function ClientHeader({ activeNav, onProfileClick }) {
  const navigate = useNavigate();

  useOtcOfferPolling({ intervalMs: 5000 });

  const otcCount = useOtcNotifStore(s => s.count);
  const toastOpen = useOtcNotifStore(s => s.toastOpen);
  const toastMsg = useOtcNotifStore(s => s.toastMsg);
  const closeToast = useOtcNotifStore(s => s.closeToast);
  const clear = useOtcNotifStore(s => s.clear);

  const user   = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const initWatchlist = useWatchlistStore(s => s.init);

  useEffect(() => {
    const uid = user?.client_id ?? user?.employee_id ?? user?.id;
    if (uid) initWatchlist(String(uid));
  }, [user?.client_id, user?.employee_id, user?.id, initWatchlist]);

  const [showTransfersMenu, setShowTransfersMenu] = useState(false);
  const [showPaymentsMenu,  setShowPaymentsMenu]  = useState(false);
  const [showTrzisteMenu,   setShowTrzisteMenu]   = useState(false);

  const transfersRef = useRef(null);
  const paymentsRef  = useRef(null);
  const trzisteRef   = useRef(null);

  const { canAny } = usePermissions();
  const canTrade = canAny('trade', 'trading', 'trading.margin');

  useEffect(() => {
    function handleClickOutside(e) {
      if (transfersRef.current && !transfersRef.current.contains(e.target))
        setShowTransfersMenu(false);
      if (paymentsRef.current && !paymentsRef.current.contains(e.target))
        setShowPaymentsMenu(false);
      if (trzisteRef.current && !trzisteRef.current.contains(e.target))
        setShowTrzisteMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() { logout(); navigate('/login'); }

  const transfersSubItems = [
    { label: 'Novi transfer',      path: '/transfers/new' },
    { label: 'Istorija transfera', path: '/transfers/history' },
  ];

  const paymentsSubItems = [
    { label: 'Novo plaćanje',     path: '/client/payments/new' },
    { label: 'Primaoci plaćanja', path: '/client/recipients' },
    { label: 'Pregled plaćanja',  path: '/client/payments' },
  ];

  const trzisteSubItems = [
    { label: 'Moji orderi', path: '/orders/my' },
    { label: 'DTC',         path: '/client/dtc' },
    { label: 'Fondovi',     path: '/investment-funds' },
  ];

  const trzisteActive = ['dtc', 'orders', 'fondovi'].includes(activeNav);

  return (
    <header className={styles.header}>
      {/* Brand */}
      <button
        className={styles.headerBrand}
        onClick={() => navigate('/dashboard')}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <div className={styles.headerIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span className={styles.headerBrandText}>RAFBank</span>
      </button>

      {/* Nav */}
      <nav className={styles.headerNav}>
        <button
          className={`${styles.headerNavBtn} ${activeNav === 'accounts' ? styles.headerNavBtnActive : ''}`}
          onClick={() => navigate('/client/accounts')}
        >
          Računi
        </button>

        {/* Transferi dropdown */}
        <div className={styles.payDropdownWrap} ref={transfersRef}>
          <button
            className={`${styles.headerNavBtn} ${activeNav === 'transfers' ? styles.headerNavBtnActive : ''}`}
            onClick={() => setShowTransfersMenu(p => !p)}
          >
            Transferi
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showTransfersMenu && (
            <div className={styles.payDropdownMenu}>
              {transfersSubItems.map(item => (
                <button
                  key={item.label}
                  className={styles.payDropdownItem}
                  onClick={() => { navigate(item.path); setShowTransfersMenu(false); }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className={`${styles.headerNavBtn} ${activeNav === 'exchange' ? styles.headerNavBtnActive : ''}`}
          onClick={() => navigate('/client/exchange')}
        >
          Menjačnica
        </button>
        <button
          className={`${styles.headerNavBtn} ${activeNav === 'cards' ? styles.headerNavBtnActive : ''}`}
          onClick={() => navigate('/client/cards')}
        >
          Kartice
        </button>
        <button
          className={`${styles.headerNavBtn} ${activeNav === 'loans' ? styles.headerNavBtnActive : ''}`}
          onClick={() => navigate('/client/loans')}
        >
          Krediti
        </button>
        <button
          className={`${styles.headerNavBtn} ${activeNav === 'securities' ? styles.headerNavBtnActive : ''}`}
          onClick={() => navigate('/client/securities')}
        >
          Hartije
        </button>

        {/* Tržište dropdown */}
        <div className={styles.payDropdownWrap} ref={trzisteRef}>
          <button
            className={`${styles.headerNavBtn} ${trzisteActive ? styles.headerNavBtnActive : ''}`}
            onClick={() => setShowTrzisteMenu(p => !p)}
          >
            Tržište
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showTrzisteMenu && (
            <div className={styles.payDropdownMenu}>
              {trzisteSubItems.map(item => (
                <button
                  key={item.label}
                  className={styles.payDropdownItem}
                  onClick={() => { navigate(item.path); setShowTrzisteMenu(false); }}
                >
                  {item.label}
                </button>
              ))}
              {canTrade && (
                <button
                  className={styles.payDropdownItem}
                  onClick={() => { navigate('/otc'); setShowTrzisteMenu(false); }}
                >
                  OTC Portal
                </button>
              )}
            </div>
          )}
        </div>

        {/* Plaćanja dropdown */}
        <div className={styles.payDropdownWrap} ref={paymentsRef}>
          <button
            className={`${styles.headerNavBtn} ${activeNav === 'payments' ? styles.headerNavBtnActive : ''}`}
            onClick={() => setShowPaymentsMenu(p => !p)}
          >
            Plaćanja
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showPaymentsMenu && (
            <div className={styles.payDropdownMenu}>
              {paymentsSubItems.map(item => (
                <button
                  key={item.label}
                  className={styles.payDropdownItem}
                  onClick={() => { navigate(item.path); setShowPaymentsMenu(false); }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className={`${styles.headerNavBtn} ${activeNav === 'portfolio' ? styles.headerNavBtnActive : ''}`}
          onClick={() => navigate('/client/portfolio')}
        >
          Moj Portfolio
        </button>
      </nav>

      <WatchlistWidget />
      <PriceAlertsWidget />

      <button
        type="button"
        className={styles.notifBtn}
        onClick={() => {
          // ovo resetuje badge kad korisnik "pogleda"
          clear();
          navigate('/otc?tab=AKTIVNE');
        }}
        title="OTC notifikacije"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {otcCount > 0 && (
          <span className={styles.notifBadge}>{otcCount}</span>
        )}
      </button>

      <Toast open={toastOpen} message={toastMsg} onClose={closeToast} />

      {/* Right side */}
      <div className={styles.headerRight}>
        <button className={styles.headerProfile} onClick={onProfileClick}>
          <div className={styles.headerAvatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
          <span>{user?.first_name} {user?.last_name}</span>
        </button>
        <button className={styles.headerLogout} onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Odjavi se
        </button>
      </div>
    </header>
  );
}
