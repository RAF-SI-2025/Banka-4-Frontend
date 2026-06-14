import { useState } from 'react';
import CardStatusBadge from './CardStatusBadge';
import { cardsApi }      from '../../api/endpoints/cards';
import styles           from './CardsTable.module.css';

const ACTION_LABELS = {
  block:      { title: 'Blokiraj karticu',      desc: 'Da li ste sigurni da želite da blokirate ovu karticu?',      confirm: 'Blokiraj',      color: 'var(--red)'  },
  unblock:    { title: 'Deblokiraj karticu',     desc: 'Da li ste sigurni da želite da deblokirate ovu karticu?',     confirm: 'Deblokiraj',    color: 'var(--blue)' },
  deactivate: { title: 'Deaktiviraj karticu',    desc: 'Da li ste sigurni da želite da deaktivirate ovu karticu? Ova akcija je nepovratna.', confirm: 'Deaktiviraj', color: 'var(--tx-3)' },
};

function ConfirmModal({ action, error, onConfirm, onCancel }) {
  if (!action) return null;
  const { title, desc, confirm, color } = ACTION_LABELS[action];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,62,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancel}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: 'var(--shadow)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--tx-1)' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.5 }}>{desc}</p>
        {error && (
          <p className={styles.modalError}>{error}</p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--tx-2)', fontFamily: 'var(--font)' }}>
            Otkaži
          </button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', border: 'none', borderRadius: 'var(--radius)', background: color, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)' }}>
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientRow({ client, onActionSuccess }) {
  const clientName = `${client.first_name} ${client.last_name}`;
  const [pending, setPending] = useState(null); // { action: 'block'|'unblock'|'deactivate', fn, cardId }
  const [actionError, setActionError] = useState(null);

  // Flatten cards from all accounts
  const cards = (client.accounts || []).flatMap(acc => {
    const accCards = acc.Cards || acc.cards || [];
    return accCards.map(card => ({
      ...card,
      account_number: acc.AccountNumber || acc.account_number || acc.accountNumber
    }));
  });

  const handleAction = (actionFn, cardId, actionKey) => {
    setActionError(null);
    setPending({ action: actionKey, fn: actionFn, cardId });
  };

  const handleCancel = () => {
    setActionError(null);
    setPending(null);
  };

  const handleConfirm = async () => {
    if (!pending) return;
    setActionError(null);
    try {
      await pending.fn(pending.cardId);
      if (onActionSuccess) onActionSuccess();
      setPending(null);
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Akcija nije uspela.');
    }
  };

  if (cards.length === 0) {
    return (
      <tr key={`client-${client.id}`}>
        <td>
          <div className={styles.clientName}>{clientName}</div>
          <div className={styles.clientMeta}>{client.email}</div>
          <div className={styles.clientMeta}>{client.phone_number}</div>
        </td>
        <td className={styles.noCards}>Klijent nema kartice</td>
        <td className={styles.mono}>—</td>
        <td>—</td>
        <td>—</td>
      </tr>
    );
  }

  const rows = cards.map((card, idx) => {
    // Support 'Status' and 'status'
    const rawStatus = card.Status || card.status || '';
    const status = rawStatus.toUpperCase();
    
    const canUnblock = status === 'BLOKIRANA' || status === 'BLOCKED';
    const canBlock = status === 'AKTIVNA' || status === 'ACTIVE';
    const canDeactivate = status !== 'NEAKTIVNA' && status !== 'INACTIVE' && status !== 'DEACTIVATED';

    // Support 'CardNumber', 'ID'
    const cardNumber = card.CardNumber || card.card_number || card.cardNumber || '—';
    const accountNumber = card.account_number || '—';
    const cardId = card.ID || card.id;

    return (
      <tr key={`${client.id}-${cardNumber}-${idx}`}>
        {idx === 0 && (
          <td rowSpan={cards.length}>
            <div className={styles.clientName}>{clientName}</div>
            <div className={styles.clientMeta}>{client.email}</div>
            <div className={styles.clientMeta}>{client.phone_number}</div>
          </td>
        )}
        <td className={styles.mono}>{cardNumber}</td>
        <td className={styles.mono}>{accountNumber}</td>
        <td>
          <CardStatusBadge status={status} />
        </td>
        <td>
          <div className={styles.actions}>
            {canUnblock && (
              <button
                className={styles.btnUnblock}
                onClick={() => handleAction(cardsApi.unblock, cardId, 'unblock')}
              >
                Deblokiraj
              </button>
            )}
            {canBlock && (
              <button
                className={styles.btnBlock}
                onClick={() => handleAction(cardsApi.block, cardId, 'block')}
              >
                Blokiraj
              </button>
            )}
            {canDeactivate && (
              <button
                className={styles.btnDeactivate}
                onClick={() => handleAction(cardsApi.deactivate, cardId, 'deactivate')}
              >
                Deaktiviraj
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  });

  return (
    <>
      {rows}
      <ConfirmModal
        action={pending?.action ?? null}
        error={actionError}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}

export default function CardsTable({ clients, onActionSuccess }) {
  if (clients.length === 0) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.emptyState}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--tx-3)" strokeWidth="1.5" width="32" height="32">
            <rect x="1" y="4" width="22" height="16" rx="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <p>Nema klijenata koji odgovaraju zadatim filterima.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Klijent</th>
              <th>Broj kartice</th>
              <th>Broj računa</th>
              <th>Status</th>
              <th>Akcija</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <ClientRow key={client.id} client={client} onActionSuccess={onActionSuccess} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
