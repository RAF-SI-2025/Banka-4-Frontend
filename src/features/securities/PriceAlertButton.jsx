import { useState } from 'react';
import { createPortal } from 'react-dom';
import PriceAlertModal from './PriceAlertModal';
import styles from './PriceAlertButton.module.css';

function BellIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

export default function PriceAlertButton({ security }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrap}>
      <button
        className={styles.btn}
        onClick={() => setOpen(true)}
        title="Postavi price alert"
        aria-label="Price alert"
      >
        <BellIcon />
      </button>
      {open && createPortal(
        <PriceAlertModal security={security} onClose={() => setOpen(false)} />,
        document.body
      )}
    </div>
  );
}
