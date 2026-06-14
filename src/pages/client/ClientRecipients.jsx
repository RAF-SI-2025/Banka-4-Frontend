import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import gsap from 'gsap';
import { clientApi } from '../../api/endpoints/client';
import Spinner from '../../components/ui/Spinner';
import ClientHeader from '../../components/layout/ClientHeader';
import styles from './ClientSubPage.module.css';
import rStyles from './ClientRecipients.module.css';

function formatAccountNumber(num) {
  const digits = num.replace(/\D/g, '');
  if (digits.length !== 18) return num;
  return `${digits.slice(0, 3)}-${digits.slice(3, 16)}-${digits.slice(16)}`;
}

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Naziv je obavezan.';
  const digits = form.account_number.replace(/\D/g, '');
  if (digits.length !== 18) errors.account_number = 'Broj računa mora imati tačno 18 cifara.';
  return errors;
}

function RecipientModal({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', account_number: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  useLayoutEffect(() => {
    if (open) {
      setForm({ name: initial?.name ?? '', account_number: initial?.account_number ?? '' });
      setErrors({});
      setApiError('');
    }
  }, [open, initial]);

  if (!open) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');
    try {
      const payload = {
        name: form.name.trim(),
        account_number: form.account_number.replace(/\D/g, ''),
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      setApiError(err?.message || 'Greška pri čuvanju primaoca.');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!initial;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Izmeni primaoca' : 'Dodaj novog primaoca'}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={rStyles.modalForm}>
          {apiError && <p className={rStyles.apiError}>{apiError}</p>}

          <div className={rStyles.field}>
            <label>Naziv primaoca</label>
            <input
              name="name"
              className={`${rStyles.input} ${errors.name ? rStyles.inputError : ''}`}
              value={form.name}
              onChange={handleChange}
              placeholder="Npr. Marko Marković"
              autoFocus
            />
            {errors.name && <span className={rStyles.fieldError}>{errors.name}</span>}
          </div>

          <div className={rStyles.field}>
            <label>Broj računa (18 cifara)</label>
            <input
              name="account_number"
              className={`${rStyles.input} ${errors.account_number ? rStyles.inputError : ''}`}
              value={form.account_number}
              onChange={handleChange}
              placeholder="000000000000000000"
              maxLength={22}
            />
            {errors.account_number && <span className={rStyles.fieldError}>{errors.account_number}</span>}
            <span className={rStyles.hint}>
              {form.account_number.replace(/\D/g, '').length}/18 cifara
            </span>
          </div>

          <div className={rStyles.modalActions}>
            <button type="button" className={rStyles.btnGhost} onClick={onClose} disabled={saving}>
              Poništi
            </button>
            <button type="submit" className={rStyles.btnPrimary} disabled={saving}>
              {saving ? 'Čuvanje...' : 'Potvrdi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({ open, recipientName, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Obriši primaoca</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={rStyles.modalForm}>
          <p className={rStyles.deleteText}>
            Da li ste sigurni da želite da obrišete primaoca{' '}
            <strong>{recipientName}</strong>?
          </p>
          <div className={rStyles.modalActions}>
            <button className={rStyles.btnGhost} onClick={onClose} disabled={deleting}>
              Odustani
            </button>
            <button className={rStyles.btnDanger} onClick={handleConfirm} disabled={deleting}>
              {deleting ? 'Brisanje...' : 'Obriši'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientRecipients() {
  useEffect(() => { document.title = 'RAFBank | Primaoci plaćanja'; }, []);
  const pageRef = useRef(null);

  const [recipients, setRecipients] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useLayoutEffect(() => {
    if (loading || recipients.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.from('.rec-item', { opacity: 0, y: 16, duration: 0.4, stagger: 0.06, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, [loading, recipients]);

  async function loadRecipients() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await clientApi.getPayees();
      setRecipients(Array.isArray(res) ? res : res?.data ?? []);
    } catch {
      setLoadError('Greška pri učitavanju primalaca.');
    } finally {
      setLoading(false);
    }
  }

  useLayoutEffect(() => { loadRecipients(); }, []);

  async function handleSave(payload) {
    if (editTarget) {
      await clientApi.updatePayee(editTarget.payee_id ?? editTarget.id, payload);
    } else {
      await clientApi.createPayee(payload);
    }
    await loadRecipients();
  }

  async function handleDelete() {
    await clientApi.deletePayee(deleteTarget.payee_id ?? deleteTarget.id);
    setDeleteTarget(null);
    await loadRecipients();
  }

  return (
    <>
      <ClientHeader activeNav="payments" />
      <div ref={pageRef} className={styles.page}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>Primaoci plaćanja</h1>
        <button className={styles.newBtn} onClick={() => { setEditTarget(null); setModalOpen(true); }}>
          + Dodaj novog primaoca
        </button>
      </div>

      {loading && <Spinner />}
      {loadError && <p style={{ color: 'var(--red)', fontSize: 14 }}>{loadError}</p>}

      {!loading && !loadError && recipients.length === 0 && (
        <div className={rStyles.empty}>
          Nemate sačuvanih primalaca. Dodajte prvog klikom na dugme iznad.
        </div>
      )}

      {!loading && recipients.length > 0 && (
        <div className={rStyles.table}>
          <div className={rStyles.tableHead}>
            <span>Naziv primaoca</span>
            <span>Broj računa</span>
            <span></span>
          </div>
          {recipients.map(r => (
            <div key={r.payee_id ?? r.id} className={`rec-item ${rStyles.tableRow}`}>
              <span className={rStyles.recipientName}>{r.name}</span>
              <span className={rStyles.accountNumber}>
                {formatAccountNumber(r.account_number)}
              </span>
              <div className={rStyles.rowActions}>
                <button
                  className={rStyles.btnEdit}
                  onClick={() => { setEditTarget(r); setModalOpen(true); }}
                >
                  Izmeni
                </button>
                <button
                  className={rStyles.btnDelete}
                  onClick={() => setDeleteTarget(r)}
                >
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <RecipientModal
        open={modalOpen}
        initial={editTarget}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSave={handleSave}
      />

      <DeleteModal
        open={!!deleteTarget}
        recipientName={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
    </>
  );
}
