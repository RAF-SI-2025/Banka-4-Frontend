import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import Navbar from '../../components/layout/Navbar';
import Alert from '../../components/ui/Alert';
import { ordersApi } from '../../api/endpoints/orders';
import { useAuthStore } from '../../store/authStore';
import { MOCK_ORDERS } from '../../api/mock';
import { ORDER_STATUS, USER_ROLE, normalizeOrder, APPROVAL_DECISION } from '../../utils/orders/orderModel';
import { getOrderPermissions } from '../../utils/orders/orderPermissions';
import styles from './SupervisorOrdersPage.module.css';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: ORDER_STATUS.PENDING, label: 'Pending' },
  { key: ORDER_STATUS.APPROVED, label: 'Approved' },
  { key: ORDER_STATUS.DECLINED, label: 'Declined' },
  { key: ORDER_STATUS.DONE, label: 'Done' },
];

export default function SupervisorOrdersPage() {
  const pageRef = useRef(null);
  const user = useAuthStore((s) => s.user);

  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const actorRole =
    user?.role === USER_ROLE.ADMIN || user?.role === 'ADMIN'
      ? USER_ROLE.ADMIN
      : user?.role === USER_ROLE.SUPERVISOR || user?.role === 'SUPERVISOR'
        ? USER_ROLE.SUPERVISOR
        : USER_ROLE.SUPERVISOR;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const nodes = pageRef.current?.querySelectorAll('.page-anim');
      if (!nodes?.length) return;

      gsap.from(nodes, {
        opacity: 0,
        y: 20,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power2.out',
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      setLoading(true);
      setApiError(null);

      try {
        const response = await ordersApi.getSupervisorOrders();
        const normalized = (Array.isArray(response) ? response : response?.items ?? []).map(normalizeOrder);

        if (!mounted) return;
        setOrders(normalized.length > 0 ? normalized : MOCK_ORDERS.map(normalizeOrder));
      } catch (err) {
        if (!mounted) return;
        setOrders(MOCK_ORDERS.map(normalizeOrder));
        setApiError(err?.message || 'Orderi trenutno nisu dostupni. Prikazan je mock prikaz radi razvoja.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') return orders;
    return orders.filter((order) => order.status === activeFilter);
  }, [orders, activeFilter]);

  async function handleDecision(order, decision) {
    const permissions = getOrderPermissions(order, actorRole);

    if (
      (decision === APPROVAL_DECISION.APPROVE && !permissions.canApprove) ||
      (decision === APPROVAL_DECISION.DECLINE && !permissions.canDecline)
    ) {
      setFeedback({ type: 'greska', text: 'Ova akcija trenutno nije dozvoljena.' });
      return;
    }

    setProcessingId(order.id);
    setFeedback(null);

    try {
      if (decision === APPROVAL_DECISION.APPROVE) {
        await ordersApi.approveOrder(order.id);
      }

      if (decision === APPROVAL_DECISION.DECLINE) {
        await ordersApi.declineOrder(order.id, {
          reason: permissions.isSettlementExpired
            ? 'Settlement date expired'
            : 'Declined by supervisor',
        });
      }

      setOrders((prev) =>
        prev.map((item) => {
          if (item.id !== order.id) return item;

          return {
            ...item,
            status:
              decision === APPROVAL_DECISION.APPROVE
                ? ORDER_STATUS.APPROVED
                : ORDER_STATUS.DECLINED,
            approvedBy:
              user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.name || 'Supervisor',
            lastModification: new Date().toISOString(),
          };
        })
      );

      setFeedback({
        type: 'uspeh',
        text:
          decision === APPROVAL_DECISION.APPROVE
            ? 'Order je uspešno odobren.'
            : 'Order je uspešno odbijen.',
      });
    } catch (err) {
      setFeedback({
        type: 'greska',
        text: err?.message || 'Akcija nad orderom nije uspela.',
      });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Orderi</span>
            <span className={styles.breadcrumbSep}>{'>'}</span>
            <span className={styles.breadcrumbAktivna}>Pregled ordera</span>
          </div>
        </div>

        {apiError && (
          <div className="page-anim">
            <Alert tip="greska" poruka={apiError} />
          </div>
        )}

        {feedback && (
          <div className="page-anim">
            <Alert tip={feedback.type} poruka={feedback.text} />
          </div>
        )}

        <section className={`page-anim ${styles.filtersCard}`}>
          <div className={styles.filtersRow}>
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`${styles.filterChip} ${activeFilter === filter.key ? styles.filterChipActive : ''}`}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section className={`page-anim ${styles.tableCard}`}>
          <div className={styles.tableHeader}>
            <div>
              <div className={styles.sectionEyebrow}>Order Tracking</div>
              <h2 className={styles.sectionTitle}>Pregled svih ordera</h2>
            </div>

            <div className={styles.headerInfo}>
              <span>Role: Supervisor</span>
              <span>{filteredOrders.length} ordera</span>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Učitavanje ordera...</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Order type</th>
                    <th>Asset</th>
                    <th>Quantity</th>
                    <th>Contract size</th>
                    <th>Price per unit</th>
                    <th>Direction</th>
                    <th>Remaining portions</th>
                    <th>Status</th>
                    <th>Last modification</th>
                    <th>Approved by</th>
                    <th>Akcije</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan="12" className={styles.emptyTable}>
                        Nema ordera za izabrani filter.
                      </td>
                    </tr>
                  )}

                  {filteredOrders.map((order) => {
                    const permissions = getOrderPermissions(order, actorRole);
                    const isBusy = processingId === order.id;

                    return (
                      <tr key={order.id}>
                        <td>{order.agentName}</td>
                        <td>{formatOrderType(order.orderType)}</td>
                        <td>
                          <div className={styles.assetCell}>
                            <strong>{order.assetName}</strong>
                            <span>{order.assetType}</span>
                          </div>
                        </td>
                        <td>{formatNumber(order.quantity)}</td>
                        <td>{formatNumber(order.contractSize)}</td>
                        <td>{formatMoney(order.pricePerUnit)}</td>
                        <td>
                          <span
                            className={`${styles.directionTag} ${
                              order.direction === 'BUY' ? styles.directionBuy : styles.directionSell
                            }`}
                          >
                            {order.direction}
                          </span>
                        </td>
                        <td>{formatNumber(order.remainingPortions)}</td>
                        <td>
                          <OrderStatusTag status={order.status} />
                        </td>
                        <td>{formatDateTime(order.lastModification)}</td>
                        <td>{order.approvedBy || '—'}</td>
                        <td>
                          <div className={styles.actionGroup}>
                            {permissions.canApprove && (
                              <button
                                type="button"
                                className={styles.btnApprove}
                                disabled={isBusy}
                                onClick={() => handleDecision(order, APPROVAL_DECISION.APPROVE)}
                              >
                                {isBusy ? '...' : 'Approve'}
                              </button>
                            )}

                            {permissions.canDecline && (
                              <button
                                type="button"
                                className={styles.btnDecline}
                                disabled={isBusy}
                                onClick={() => handleDecision(order, APPROVAL_DECISION.DECLINE)}
                              >
                                {isBusy ? '...' : 'Decline'}
                              </button>
                            )}

                            {!permissions.canApprove && !permissions.canDecline && (
                              <span className={styles.readOnlyText}>
                                {permissions.isSettlementExpired &&
                                order.status === ORDER_STATUS.PENDING
                                  ? 'Expired'
                                  : 'Read only'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function OrderStatusTag({ status }) {
  const config = {
    [ORDER_STATUS.PENDING]: { label: 'Pending', className: styles.statusPending },
    [ORDER_STATUS.APPROVED]: { label: 'Approved', className: styles.statusApproved },
    [ORDER_STATUS.DECLINED]: { label: 'Declined', className: styles.statusDeclined },
    [ORDER_STATUS.DONE]: { label: 'Done', className: styles.statusDone },
  };

  const meta = config[status] || { label: status || 'Unknown', className: styles.statusNeutral };

  return <span className={`${styles.statusTag} ${meta.className}`}>{meta.label}</span>;
}

function formatMoney(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('sr-RS').format(value);
}

function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatOrderType(type) {
  if (!type) return '—';

  const map = {
    MARKET: 'Market',
    LIMIT: 'Limit',
    STOP: 'Stop',
    STOP_LIMIT: 'Stop limit',
  };

  return map[type] || type;
}