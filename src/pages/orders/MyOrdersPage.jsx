import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/layout/Navbar';
import ClientHeader from '../../components/layout/ClientHeader';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../../components/ui/Spinner';
import { ordersApi } from '../../api/endpoints/orders';
import styles from './MyOrdersPage.module.css';

const STATUS = ['ALL', 'PENDING', 'APPROVED', 'DECLINED', 'DONE'];
const ORDER_TYPE = ['ALL', 'MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'];

// backend šalje RFC3339/ISO stringove -> možemo direktno u Date
function formatDateTime(v) {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('sr-RS');
}


export default function MyOrdersPage() {
    useEffect(() => { document.title = 'RAFBank | Moji orderi'; }, []);
    const user = useAuthStore(s => s.user);
    const isClient = user?.identity_type === 'client';
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(1);
    const pageSize = 100;
    const [total, setTotal] = useState(0);

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');

    // backend ima asset_type filter (stock/future/...), ali nema "q" po nazivu.
    // Zato: assetType šaljemo backendu, a "pretraga" po ticker/nazivu je client-side.
    const [assetTypeFilter, setAssetTypeFilter] = useState('ALL');

    const [securityQuery, setSecurityQuery] = useState(''); // kucanje po ticker/nazivu (client-side)

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // 1) učitaj sa backend filterima
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError('');

                const params = { page, page_size: pageSize };

                if (statusFilter !== 'ALL') params.status = statusFilter;
                if (orderTypeFilter !== 'ALL') params.order_type = orderTypeFilter;
                if (assetTypeFilter !== 'ALL') params.asset_type = assetTypeFilter;
                if (dateFrom) params.from_date = dateFrom;
                if (dateTo) params.to_date = dateTo;

                const res = await ordersApi.getMyOrders(params);
                const body = res?.data ?? res;

                const list =
                    (Array.isArray(body) && body) ||
                    body?.data ||
                    body?.items ||
                    body?.content ||
                    [];

                setOrders(Array.isArray(list) ? list : []);
                setTotal(Number(body?.total ?? (Array.isArray(list) ? list.length : 0)));
            } catch (e) {
                console.error(e);
                setError('Nemate pristup ovoj stranici.');
                setOrders([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        })();
    }, [page, pageSize, statusFilter, orderTypeFilter, assetTypeFilter, dateFrom, dateTo]);

    // 2) client-side search po hartiji (ticker + listing_name)
    const filtered = useMemo(() => {
        const q = securityQuery.trim().toLowerCase();
        if (!q) return orders;

        return orders.filter(o => {
            const haystack = [o.ticker, o.listing_name, o.asset_type]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [orders, securityQuery]);

    // 3) asset_type dropdown vrednosti izvedi iz trenutno učitanih ordera (nije idealno za sve strane, ali radi)
    const assetTypes = useMemo(() => {
        const set = new Set();
        for (const o of orders) {
            if (o?.asset_type) set.add(String(o.asset_type).toUpperCase());
        }
        return ['ALL', ...Array.from(set).sort()];
    }, [orders]);

    return (
        <div className={styles.wrap}>
            {isClient ? <ClientHeader /> : <Navbar />}

            <div className={styles.header}>
                <h1 className={styles.title}>Moji orderi</h1>
                <p className={styles.subtitle}>Pregled vaših ordera sa filterima.</p>
            </div>

            <div className={styles.card}>
                <div className={styles.filters}>
                    <label className={styles.filter}>
                        Status
                        <select
                            value={statusFilter}
                            onChange={e => {
                                setPage(1);
                                setStatusFilter(e.target.value);
                            }}
                        >
                            {STATUS.map(s => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.filter}>
                        Tip ordera
                        <select
                            value={orderTypeFilter}
                            onChange={e => {
                                setPage(1);
                                setOrderTypeFilter(e.target.value);
                            }}
                        >
                            {ORDER_TYPE.map(t => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.filter}>
                        Tip hartije (asset_type)
                        <select
                            value={assetTypeFilter}
                            onChange={e => {
                                setPage(1);
                                setAssetTypeFilter(e.target.value);
                            }}
                        >
                            {assetTypes.map(t => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.filter}>
                        Hartija (pretraga)
                        <input
                            type="text"
                            value={securityQuery}
                            onChange={e => setSecurityQuery(e.target.value)}
                            placeholder="Npr. XXII, 22nd Century..."
                        />
                    </label>

                    <label className={styles.filter}>
                        Datum od
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => {
                                setPage(1);
                                setDateFrom(e.target.value);
                            }}
                        />
                    </label>

                    <label className={styles.filter}>
                        Datum do
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => {
                                setPage(1);
                                setDateTo(e.target.value);
                            }}
                        />
                    </label>
                </div>

                {loading ? (
                    <div className={styles.center}>
                        <Spinner />
                    </div>
                ) : error ? (
                    <div className={styles.error}>{error}</div>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>Nema ordera za izabrane filtere.</div>
                ) : (
                    <>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                <tr>
                                    <th>Tip ordera</th>
                                    <th>Hartija</th>
                                    <th className={styles.num}>Količina</th>
                                    <th className={styles.num}>Cena</th>
                                    <th>Status</th>
                                    <th>Datum kreiranja</th>
                                    <th>Datum izvršenja</th>
                                    <th>Plaćena provizija</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filtered.map(o => (
                                    <tr key={o.order_id}>
                                        <td>{o.order_type ?? '—'}</td>

                                        <td>
                                            <div className={styles.security}>
                                                <div className={styles.ticker}>{(o.ticker ?? o.asset_type ?? '—').toUpperCase()}</div>
                                                <div className={styles.name}>{o.listing_name ?? '—'}</div>
                                            </div>
                                        </td>

                                        <td className={styles.num}>{o.quantity ?? '—'}</td>
                                        <td className={styles.num}>{o.price_per_unit ?? '—'}</td>
                                        <td>{o.status ?? '—'}</td>

                                        <td>{formatDateTime(o.created_at)}</td>
                                        <td>{formatDateTime(o.execution_date)}</td>

                                        <td>{o.commission_charged != null ? (o.commission_charged ? 'Da' : 'Ne') : '—'}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* (opciono) mali footer */}
                        <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
                            Ukupno: {total}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}