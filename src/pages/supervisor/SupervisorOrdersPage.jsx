import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import Navbar from '../../components/layout/Navbar';
import Alert from '../../components/ui/Alert';
import { ordersApi, fetchUserName } from '../../api/endpoints/orders';
import { useAuthStore } from '../../store/authStore';
import { ORDER_STATUS, USER_ROLE, normalizeOrder, APPROVAL_DECISION , ORDER_TYPE, ORDER_DIRECTION} from '../../utils/orders/orderModel';
import { getOrderPermissions } from '../../utils/orders/orderPermissions';
import styles from './SupervisorOrdersPage.module.css';
import { useFetch } from '../../hooks/useFetch';
import { usePermissions } from '../../hooks/usePermissions';

const MOCK_ORDERS = [
  {
    id: 101,
    agent_name: 'Miloš Milošević',
    asset_name: 'AAPL',
    asset_type: 'Stock',
    order_type: ORDER_TYPE.MARKET,
    quantity: 10,
    contract_size: 1,
    price_per_unit: 192.5,
    direction: ORDER_DIRECTION.BUY,
    remaining_portions: 10,
    status: ORDER_STATUS.PENDING,
    approved_by: '—',
    last_modification: '2026-03-17T09:30:00Z',
    settlement_date: null,
  },
  {
    id: 102,
    agent_name: 'Jelena Jovanović',
    asset_name: 'EUR/USD',
    asset_type: 'Forex',
    order_type: ORDER_TYPE.LIMIT,
    quantity: 2,
    contract_size: 1000,
    price_per_unit: 1.09,
    direction: ORDER_DIRECTION.SELL,
    remaining_portions: 2,
    status: ORDER_STATUS.PENDING,
    approved_by: '—',
    last_modification: '2026-03-17T10:00:00Z',
    settlement_date: '2026-03-15T00:00:00Z',
  },
  {
    id: 103,
    agent_name: 'Ana Anić',
    asset_name: 'CLZ26',
    asset_type: 'Futures',
    order_type: ORDER_TYPE.STOP,
    quantity: 3,
    contract_size: 100,
    price_per_unit: 80,
    direction: ORDER_DIRECTION.BUY,
    remaining_portions: 3,
    status: ORDER_STATUS.APPROVED,
    approved_by: 'Supervisor Admin',
    last_modification: '2026-03-16T14:12:00Z',
    settlement_date: '2026-12-20T00:00:00Z',
  },
  {
    id: 104,
    agent_name: 'Petar Petrović',
    asset_name: 'MSFT',
    asset_type: 'Stock',
    order_type: ORDER_TYPE.STOP_LIMIT,
    quantity: 5,
    contract_size: 1,
    price_per_unit: 410,
    direction: ORDER_DIRECTION.SELL,
    remaining_portions: 0,
    status: ORDER_STATUS.DONE,
    approved_by: 'Supervisor Admin',
    last_modification: '2026-03-14T11:45:00Z',
    settlement_date: null,
  },
  {
    id: 105,
    agent_name: 'Nikola Nikolić',
    asset_name: 'TSLA',
    asset_type: 'Stock',
    order_type: ORDER_TYPE.LIMIT,
    quantity: 8,
    contract_size: 1,
    price_per_unit: 215,
    direction: ORDER_DIRECTION.BUY,
    remaining_portions: 8,
    status: ORDER_STATUS.DECLINED,
    approved_by: 'Supervisor Admin',
    last_modification: '2026-03-13T08:15:00Z',
    settlement_date: null,
  },
];

const FILTERS = [
  { key: 'ALL', label: 'Sve' },
  { key: ORDER_STATUS.PENDING, label: 'Na čekanju' },
  { key: ORDER_STATUS.APPROVED, label: 'Odobreno' },
  { key: ORDER_STATUS.DECLINED, label: 'Odbijeno' },
  { key: ORDER_STATUS.DONE, label: 'Završeno' },
  { key: ORDER_STATUS.CANCELLED, label: 'Otkazano' },
  { key: ORDER_STATUS.PARTIALLY_FILLED, label: 'Delimično ispunjeno' },
];

export default function SupervisorOrdersPage() {
  useEffect(() => { document.title = 'RAFBank | Supervizorski orderi'; }, []);
  const pageRef = useRef(null);
  const user = useAuthStore((s) => s.user);

  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const { isSupervisor } = usePermissions();
  const actorRole = isSupervisor ? USER_ROLE.SUPERVISOR : USER_ROLE.EMPLOYEE;

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

  const { data: ordersData, loading: fetchLoading, error: fetchError } = useFetch(() => ordersApi.getSupervisorOrders(), []);

  useEffect(() => {
    setLoading(Boolean(fetchLoading));
    setApiError(null);

    if (fetchLoading) return;

    async function resolveOrders() {
      try {
        const response = ordersData;
        const rawList = Array.isArray(response)
          ? response
          : (response?.items ?? response?.data ?? response?.content ?? response?.orders ?? []);
        const normalized = rawList.map(normalizeOrder);

        if (fetchError) {
          setApiError(fetchError?.message || 'Orderi trenutno nisu dostupni. Prikazan je mock prikaz radi razvoja.');
        }

        // Resolve agent names for orders that don't already have one
        const ordersNeedingName = normalized.filter(o => o.agentName === '—' && o.userId);
        const uniqueKeys = [...new Map(ordersNeedingName.map(o => [`${o.ownerType}:${o.userId}`, o])).values()];

        if (uniqueKeys.length > 0) {
          const nameMap = Object.fromEntries(
            await Promise.all(uniqueKeys.map(async o => [
              `${o.ownerType}:${o.userId}`,
              await fetchUserName(o.userId, o.ownerType)
            ]))
          );
          setOrders(normalized.map(o =>
            o.agentName === '—' && nameMap[`${o.ownerType}:${o.userId}`]
              ? { ...o, agentName: nameMap[`${o.ownerType}:${o.userId}`] }
              : o
          ));
        } else {
          setOrders(normalized);
        }
      } catch (err) {
        setOrders(MOCK_ORDERS.map(normalizeOrder));
        setApiError(err?.message || 'Orderi trenutno nisu dostupni. Prikazan je mock prikaz radi razvoja.');
      }
    }

    resolveOrders();
  }, [ordersData, fetchLoading, fetchError]);

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
                    <th>Tip naloga</th>
                    <th>Hartija</th>
                    <th>Količina</th>
                    <th>Veličina ugovora</th>
                    <th>Cena po jedinici</th>
                    <th>Smer</th>
                    <th>Preostale porcije</th>
                    <th>Status</th>
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

                  {filteredOrders.map((order, i) => {
                    const permissions = getOrderPermissions(order, actorRole);
                    const isBusy = processingId === order.id;

                    return (
                      <tr key={order.id ?? i}>
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
    [ORDER_STATUS.PENDING]: { label: 'Na čekanju', className: styles.statusPending },
    [ORDER_STATUS.APPROVED]: { label: 'Odobreno', className: styles.statusApproved },
    [ORDER_STATUS.DECLINED]: { label: 'Odbijeno', className: styles.statusDeclined },
    [ORDER_STATUS.DONE]: { label: 'Završeno', className: styles.statusDone },
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