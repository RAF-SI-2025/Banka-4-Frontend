import { useState, useEffect } from 'react';
import { authApi }             from '../../api/endpoints/auth';
import { validirajLozinku, sePoklapa, jacinalozinke } from '../../utils/helpers';
import Alert                   from '../ui/Alert';
import styles                  from './ChangePasswordModal.module.css';

export default function ChangePasswordModal({ open, onClose }) {
  const [trenutna, setTrenutna] = useState('');
  const [nova,     setNova]     = useState('');
  const [potvrda,  setPotvrda]  = useState('');
  const [greska,   setGreska]   = useState(null);
  const [saljem,   setSaljem]   = useState(false);
  const [uspeh,    setUspeh]    = useState(false);

  useEffect(() => {
    if (!open) {
      setTrenutna('');
      setNova('');
      setPotvrda('');
      setGreska(null);
      setSaljem(false);
      setUspeh(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();

    if (!trenutna.trim()) { setGreska('Unesite trenutnu lozinku.'); return; }
    const novaGreska = validirajLozinku(nova);
    if (novaGreska) { setGreska(novaGreska); return; }
    const poklapaGreska = sePoklapa(nova, potvrda, 'Lozinke se ne poklapaju');
    if (poklapaGreska) { setGreska(poklapaGreska); return; }

    setSaljem(true);
    setGreska(null);
    try {
      await authApi.changePassword({
        trenutnaLozinka: trenutna,
        novaLozinka:     nova,
        potvrdaLozinke:  potvrda,
      });
      setUspeh(true);
    } catch (err) {
      setGreska(err.error ?? 'Greška pri promeni lozinke.');
    } finally {
      setSaljem(false);
    }
  }

  const jacina = nova ? jacinalozinke(nova) : null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {uspeh ? (
          <div className={styles.successCenter}>
            <div className={styles.successIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className={styles.title}>Lozinka je promenjena</h3>
            <p className={styles.subtitle}>Vaša nova lozinka je uspešno sačuvana.</p>
            <button className={styles.btnPrimary} onClick={onClose} style={{ width: '100%', marginTop: 8 }}>
              Zatvori
            </button>
          </div>
        ) : (
          <>
            <h3 className={styles.title}>Promena lozinke</h3>
            <p className={styles.subtitle}>Unesite trenutnu i novu lozinku.</p>
            <div className={styles.divider} />

            {greska && <Alert tip="greska" poruka={greska} />}

            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label>
                  Trenutna lozinka <span className={styles.required}>*</span>
                </label>
                <input
                  type="password"
                  value={trenutna}
                  onChange={e => { setTrenutna(e.target.value); setGreska(null); }}
                  className={trenutna ? styles.hasValue : ''}
                  autoComplete="current-password"
                />
              </div>

              <div className={styles.field}>
                <label>
                  Nova lozinka <span className={styles.required}>*</span>
                </label>
                <input
                  type="password"
                  value={nova}
                  onChange={e => { setNova(e.target.value); setGreska(null); }}
                  className={nova ? styles.hasValue : ''}
                  autoComplete="new-password"
                />
                {jacina && (
                  <div className={styles.pwStrength}>
                    <div className={styles.pwStrengthBar}>
                      <div
                        className={styles.pwStrengthFill}
                        style={{ width: jacina.procenat, background: jacina.boja }}
                      />
                    </div>
                    <span className={styles.pwStrengthLabel} style={{ color: jacina.boja }}>
                      {jacina.naziv} lozinka
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <label>
                  Potvrdi novu lozinku <span className={styles.required}>*</span>
                </label>
                <input
                  type="password"
                  value={potvrda}
                  onChange={e => { setPotvrda(e.target.value); setGreska(null); }}
                  className={potvrda ? styles.hasValue : ''}
                  autoComplete="new-password"
                />
              </div>

              <div className={styles.actions}>
                <button type="button" className={styles.btnGhost} onClick={onClose}>
                  Otkaži
                </button>
                <button type="submit" disabled={saljem} className={styles.btnPrimary}>
                  {saljem ? 'Čuvanje...' : 'Promeni lozinku'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
