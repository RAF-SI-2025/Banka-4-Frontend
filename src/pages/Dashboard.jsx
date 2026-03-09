import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import Navbar from '../components/layout/Navbar';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const pageRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-content', {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: 'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />
      <main className={`page-content ${styles.sadrzaj}`}>
        <h1 className={styles.naslov}>
          Dobrodošli na RAFBank portal
        </h1>
        <p className={styles.opis}>
          Koristite navigaciju za pristup modulima.
        </p>
      </main>
    </div>
  );
}
