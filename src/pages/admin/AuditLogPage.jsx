import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { auditLogsApi } from '../../api/endpoints/auditLogs';
import Navbar from '../../components/layout/Navbar';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Pagination from '../../components/ui/Pagination';
import styles from './AuditLogPage.module.css';

const ACTION_OPTIONS = [
  { value: '', label: 'Sve akcije' },
  { value: 'AGENT_LIMIT_CHANGED', label: 'Promena limita agentu' },
  { value: 'AGENT_USED_LIMIT_RESET', label: 'Reset used limita' },
  { value: 'ORDER_APPROVED', label: 'Order odobren' },
  { value: 'ORDER_REJECTED', label: 'Order odbijen' },
  { value: 'EMPLOYEE_PERMISSIONS_CHANGED', label: 'Promena permisija' },
  { value: 'MANUAL_TAX_CALCULATION_STARTED', label: 'Rucni obracun poreza' },
];

const ACTION_ALIASES = {
  LIMIT_CHANGED: 'AGENT_LIMIT_CHANGED',
  AGENT_LIMIT_CHANGE: 'AGENT_LIMIT_CHANGED',
  CHANGE_AGENT_LIMIT: 'AGENT_LIMIT_CHANGED',
  USED_LIMIT_RESET: 'AGENT_USED_LIMIT_RESET',
  RESET_USED_LIMIT: 'AGENT_USED_LIMIT_RESET',
  ORDER_APPROVE: 'ORDER_APPROVED',
  ORDER_APPROVED_BY_SUPERVISOR: 'ORDER_APPROVED',
  ORDER_DECLINED: 'ORDER_REJECTED',
  ORDER_DENIED: 'ORDER_REJECTED',
  ORDER_REJECT: 'ORDER_REJECTED',
  PERMISSIONS_CHANGED: 'EMPLOYEE_PERMISSIONS_CHANGED',
  EMPLOYEE_PERMISSION_CHANGED: 'EMPLOYEE_PERMISSIONS_CHANGED',
  TAX_CALCULATION_STARTED: 'MANUAL_TAX_CALCULATION_STARTED',
  MANUAL_TAX_CALCULATION: 'MANUAL_TAX_CALCULATION_STARTED',
};

const ACTION_LABELS = ACTION_OPTIONS.reduce((acc, option) => {
  if (option.value) acc[option.value] = option.label;
  return acc;
}, {});

const EMPTY_FILTERS = {
  action_type: '',
  user: '',
  date_from: '',
  date_to: '',
};

const PAGE_SIZE = 20;

function actionLabel(action) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action ? action.replaceAll('_', ' ').toLowerCase() : 'Akcija';
}

function unwrapList(response) {
  const body = response?.data ?? response;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.content)) return body.content;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

function metadataBody(response) {
  if (response?.total_pages || response?.totalPages || response?.total_page) return response;
  if (response?.data && !Array.isArray(response.data)) return response.data;
  return response;
}

function unwrapTotalPages(response) {
  const body = metadataBody(response);
  return Number(body?.total_pages ?? body?.totalPages ?? body?.total_page ?? body?.totalPagesCount ?? 1);
}

function unwrapTotal(response, fallbackCount) {
  const body = metadataBody(response);
  return Number(body?.total ?? body?.total_count ?? body?.totalCount ?? fallbackCount);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('sr-RS', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function detailValue(entry, keys) {
  const details = entry.details ?? entry.metadata ?? {};

  if (details && typeof details === 'object') {
    for (const key of keys) {
      if (details[key] != null) return details[key];
    }
  }

  if (typeof details === 'string') {
    for (const key of keys) {
      const match = details.match(new RegExp(`(?:^|[\\s,;])${key}\\s*[:=]\\s*([^\\s,;]+)`, 'i'));
      if (match?.[1]) return match[1];
    }
  }

  return undefined;
}

function actorName(entry) {
  const actor = entry.actor ?? entry.user ?? entry.employee ?? entry.performed_by ?? entry.performedBy;
  if (typeof actor === 'string') return actor;
  const fullName = [actor?.first_name ?? actor?.firstName, actor?.last_name ?? actor?.lastName]
    .filter(Boolean)
    .join(' ');
  const actorId = entry.actor_id ?? entry.actorId ?? entry.user_id ?? entry.userId ?? entry.employee_id ?? entry.employeeId ?? entry.performed_by_id ?? entry.performedById ?? entry.performed_by_employee_id ?? entry.performedByEmployeeId;
  return fullName || actor?.email || entry.actor_email || entry.actorEmail || entry.user_email || entry.userEmail || entry.username || (actorId != null ? `Korisnik #${actorId}` : entry.performed_by || entry.performedBy || '-');
}

function targetName(entry) {
  const target = entry.target ?? entry.target_user ?? entry.targetUser ?? entry.subject ?? entry.employee_target ?? entry.employeeTarget ?? entry.object ?? entry.resource;
  if (typeof target === 'string') return target;
  const targetDisplayName = [target?.first_name ?? target?.firstName, target?.last_name ?? target?.lastName]
    .filter(Boolean)
    .join(' ') || target?.email || entry.target_email || entry.targetEmail || entry.target_id || entry.targetId;
  const orderId = detailValue(entry, ['order_id', 'orderId']) ?? entry.order_id ?? entry.orderId;
  return targetDisplayName || (orderId != null ? `Order #${orderId}` : '-');
}

function normalizeAction(entry) {
  const rawAction = entry.action_type ?? entry.actionType ?? entry.type ?? entry.action ?? '';
  const normalizedAction = String(rawAction).toUpperCase();
  return ACTION_ALIASES[normalizedAction] ?? normalizedAction;
}

function formatDetails(entry, action) {
  if (entry.description) return entry.description;

  const details = entry.details ?? entry.metadata ?? {};
  const oldLimit = detailValue(entry, ['old_limit', 'oldLimit']) ?? entry.old_limit;
  const newLimit = detailValue(entry, ['new_limit', 'newLimit']) ?? entry.new_limit;
  const orderId = detailValue(entry, ['order_id', 'orderId']) ?? entry.order_id ?? entry.orderId;
  const permissions = detailValue(entry, ['permissions', 'new_permissions', 'newPermissions']) ?? entry.permissions;

  if (action === 'AGENT_LIMIT_CHANGED') {
    return `Novi limit: ${Number(newLimit ?? 0).toLocaleString('sr-RS')} RSD${oldLimit != null ? `, prethodno ${Number(oldLimit).toLocaleString('sr-RS')} RSD` : ''}.`;
  }
  if (action === 'AGENT_USED_LIMIT_RESET') return 'Iskorisceni limit je resetovan na 0 RSD.';
  if (action === 'ORDER_APPROVED') return `Odobren order ${orderId ?? targetName(entry)}.`;
  if (action === 'ORDER_REJECTED') {
    const reason = detailValue(entry, ['reason']) ?? entry.reason;
    return `Odbijen order ${orderId ?? targetName(entry)}${reason ? `: ${reason}` : '.'}`;
  }
  if (action === 'EMPLOYEE_PERMISSIONS_CHANGED') {
    const value = Array.isArray(permissions) ? permissions.join(', ') : permissions;
    return value ? `Nove permisije: ${value}.` : 'Permisije zaposlenog su izmenjene.';
  }
  if (action === 'MANUAL_TAX_CALCULATION_STARTED') return 'Pokrenut je rucni obracun poreza.';

  if (typeof details === 'string') return details;

  if (details && typeof details === 'object' && Object.keys(details).length > 0) {
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('; ');
  }
  return '-';
}

function normalizeEntry(entry) {
  const action = normalizeAction(entry);
  return {
    id: entry.id ?? entry.audit_log_id ?? `${action}-${entry.created_at ?? entry.timestamp}-${entry.target_id ?? ''}`,
    action,
    actionLabel: actionLabel(action),
    actor: actorName(entry),
    target: targetName(entry),
    createdAt: entry.created_at ?? entry.createdAt ?? entry.timestamp ?? entry.performed_at ?? entry.performedAt,
    details: formatDetails(entry, action),
  };
}

export default function AuditLogPage() {
  useEffect(() => { document.title = 'RAFBank | Audit log'; }, []);
  const pageRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (nextPage = 1, nextFilters = EMPTY_FILTERS) => {
    setLoading(true);
    setError(null);
    const params = Object.fromEntries(
      Object.entries(nextFilters).filter(([, value]) => String(value).trim() !== '')
    );

    try {
      const response = await auditLogsApi.getAll({ page: nextPage, page_size: PAGE_SIZE, ...params });
      const normalizedLogs = unwrapList(response).map(normalizeEntry);
      const responseTotalPages = unwrapTotalPages(response);
      setLogs(normalizedLogs);
      setPage(nextPage);
      setTotalPages(responseTotalPages);
      setTotal(unwrapTotal(response, responseTotalPages * PAGE_SIZE));
    } catch (err) {
      setError(err?.response?.data?.error ?? err?.error ?? err?.message ?? 'Greska pri ucitavanju audit loga.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1, EMPTY_FILTERS);
  }, [load]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', { opacity: 0, y: 20, duration: 0.45, stagger: 0.07, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    load(1, filters);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    load(1, EMPTY_FILTERS);
  }

  function handlePageChange(nextPage) {
    load(nextPage, appliedFilters);
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />
      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Admin</span><span className={styles.sep}>›</span>
            <span className={styles.current}>Audit log</span>
          </div>
          <h1 className={styles.title}>Audit log</h1>
          <p className={styles.desc}>
            Pregled sistemskih akcija: izmene limita, resetovanja, odluke nad orderima, promene permisija i rucni obracuni poreza.
          </p>
        </div>

        <form className={`page-anim ${styles.filters}`} onSubmit={applyFilters}>
          <label className={styles.field}>
            <span className={styles.label}>Tip akcije</span>
            <select value={filters.action_type} onChange={event => updateFilter('action_type', event.target.value)}>
              {ACTION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Korisnik</span>
            <input
              type="text"
              placeholder="Korisnik, objekat ili detalji..."
              value={filters.user}
              onChange={event => updateFilter('user', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Od datuma</span>
            <input type="date" value={filters.date_from} onChange={event => updateFilter('date_from', event.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Do datuma</span>
            <input type="date" value={filters.date_to} onChange={event => updateFilter('date_to', event.target.value)} />
          </label>
          <button type="submit" className={styles.btnPrimary}>Primeni</button>
          <button type="button" className={styles.btnGhost} onClick={resetFilters}>Reset</button>
        </form>

        <section className="page-anim">
          {loading && <Spinner />}
          {!loading && error && <Alert tip="greska" poruka={error} />}
          {!loading && !error && logs.length === 0 && (
            <div className={styles.empty}>Nema audit zapisa za izabrane filtere.</div>
          )}
          {!loading && !error && logs.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Vreme</th>
                    <th>Akcija</th>
                    <th>Korisnik</th>
                    <th>Objekat</th>
                    <th>Detalji</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <div>{formatDate(log.createdAt)}</div>
                      </td>
                      <td><span className={styles.badge}>{log.actionLabel}</span></td>
                      <td className={styles.actor}>{log.actor}</td>
                      <td>{log.target}</td>
                      <td className={styles.details}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
