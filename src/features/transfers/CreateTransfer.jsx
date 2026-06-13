import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { clientApi } from '../../api/endpoints/client';
import { exchangeApi } from '../../api/endpoints/exchange';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import ClientHeader from '../../components/layout/ClientHeader';
import styles from './transfers.module.css';
import { useAuthStore } from '../../store/authStore';

function fmt(amount, currency) {
    return Number(amount || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (currency ?? '');
}

export default function CreateTransfer() {
    useEffect(() => { document.title = 'RAFBank | Novi transfer'; }, []);
    const pageRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore(s => s.user);
    const clientId = user?.id;

    // Restore state if coming back from confirm page
    const restored = location.state;

    const { data: accountsRes, loading, error } =
        useFetch(() => clientApi.getAccounts(clientId), [clientId]);

    const accounts = Array.isArray(accountsRes) ? accountsRes : accountsRes?.data ?? [];

    const [fromAccNum, setFromAccNum] = useState(restored?.fromAccount?.account_number ?? '');
    const [toAccNum, setToAccNum] = useState(restored?.toAccount?.account_number ?? '');
    const [amount, setAmount] = useState(restored?.amount ? String(restored.amount) : (restored?.prefilledAmount ? String(restored.prefilledAmount) : ''));

    // Handle prefilling accounts by currency from CurrencyCalculator
    useEffect(() => {
        if (accounts.length > 0 && restored?.prefilledFromCurrency && !fromAccNum) {
            const acc = accounts.find(a => (a.currency ?? a.valuta) === restored.prefilledFromCurrency);
            if (acc) setTimeout(() => setFromAccNum(acc.account_number ?? acc.number), 0);
        }
    }, [accounts, restored?.prefilledFromCurrency, fromAccNum]);

    useEffect(() => {
        if (accounts.length > 0 && restored?.prefilledToCurrency && !toAccNum) {
            const acc = accounts.find(a => (a.currency ?? a.valuta) === restored.prefilledToCurrency);
            if (acc) setTimeout(() => setToAccNum(acc.account_number ?? acc.number), 0);
        }
    }, [accounts, restored?.prefilledToCurrency, toAccNum]);

    const fromAccount = accounts.find(a => (a.account_number ?? a.number) === fromAccNum) ?? null;
    const toAccount = accounts.find(a => (a.account_number ?? a.number) === toAccNum) ?? null;

    const parsedAmount = parseFloat(amount);

    const fromCurrency = fromAccount?.currency ?? fromAccount?.valuta;
    const toCurrency = toAccount?.currency ?? toAccount?.valuta;
    const isCrossCurrency = fromAccount && toAccount && fromCurrency !== toCurrency;

    // Fetch exchange rates for cross-currency display
    const { data: ratesData } = useFetch(() => exchangeApi.getRates(), []);
    const rates = Array.isArray(ratesData?.rates) ? ratesData.rates : [];

    // Find applicable rate
    const [rateInfo, setRateInfo] = useState(null);
    const [loadingRate, _setLoadingRate] = useState(false);

    useEffect(() => {
        if (!isCrossCurrency || !fromCurrency || !toCurrency) {
            setTimeout(() => setRateInfo(null), 0);
            return;
        }

        // Try to find rate from rates list
        // If from=RSD, we're buying foreign currency (use sell_rate)
        // If to=RSD, we're selling foreign currency (use buy_rate)
        const foreignCurrency = fromCurrency === 'RSD' ? toCurrency : fromCurrency;
        const rate = rates.find(r => r.currency === foreignCurrency);

        if (rate) {
            if (fromCurrency === 'RSD') {
                // RSD → foreign: divide by sell_rate
                setTimeout(() => setRateInfo({
                    displayRate: rate.sell_rate,
                    label: `1 ${toCurrency} = ${fmt(rate.sell_rate, 'RSD')}`,
                    convertedAmount: parsedAmount && !isNaN(parsedAmount) ? parsedAmount / rate.sell_rate : null,
                    toCurrency,
                }), 0);
            } else {
                // foreign → RSD: multiply by buy_rate
                setTimeout(() => setRateInfo({
                    displayRate: rate.buy_rate,
                    label: `1 ${fromCurrency} = ${fmt(rate.buy_rate, 'RSD')}`,
                    convertedAmount: parsedAmount && !isNaN(parsedAmount) ? parsedAmount * rate.buy_rate : null,
                    toCurrency: 'RSD',
                }), 0);
            }
        } else {
            setTimeout(() => setRateInfo(null), 0);
        }
    }, [isCrossCurrency, fromCurrency, toCurrency, rates, parsedAmount]);

    useLayoutEffect(() => {
        if (loading) return;
        const ctx = gsap.context(() => {
            gsap.from('.page-anim', {
                opacity: 0, y: 24, duration: 0.45, stagger: 0.08, ease: 'power2.out',
            });
        }, pageRef);
        return () => ctx.revert();
    }, [loading]);

    // Reset TO when FROM changes (unless restoring)
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        setTimeout(() => setToAccNum(''), 0);
    }, [fromAccNum]);

    const insufficientFunds = fromAccount && !isNaN(parsedAmount) && parsedAmount > 0 &&
        parsedAmount > (fromAccount.balance ?? 0);

    const canProceed =
        fromAccount &&
        toAccount &&
        fromAccNum !== toAccNum &&
        !isNaN(parsedAmount) &&
        parsedAmount > 0 &&
        !insufficientFunds;

    const handleNext = () => {
        if (!canProceed) return;
        navigate('/transfers/confirm', {
            state: {
                fromAccount,
                toAccount,
                amount: parsedAmount,
                userName: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
                rateInfo: isCrossCurrency ? rateInfo : null,
                isCrossCurrency,
            },
        });
    };

    if (loading) return <Spinner />;
    if (error) return <Alert tip="greska" poruka="Ne mogu da učitam račune" />;

    return (
        <>
        <ClientHeader activeNav="transfers" />
        <div ref={pageRef} className={styles.stranica}>
            <main className={styles.sadrzaj}>
                <div>
                    <div className={styles.breadcrumb}>Transferi › Novi transfer</div>
                    <h1 className={styles.pageTitle}>Kreiraj transfer</h1>
                </div>

                <div className={`page-anim ${styles.card}`}>

                    {/* FROM */}
                    <div className={styles.field}>
                        <label>Izvorni račun</label>
                        <select value={fromAccNum} onChange={e => setFromAccNum(e.target.value)}>
                            <option value="">Izaberi račun...</option>
                            {accounts.map(acc => {
                                const num = acc.account_number ?? acc.number;
                                return (
                                    <option key={num} value={num}>
                                        {acc.name ?? num} — {fmt(acc.balance, acc.currency)}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* TO */}
                    <div className={styles.field}>
                        <label>Odredišni račun</label>
                        <select value={toAccNum} onChange={e => setToAccNum(e.target.value)}>
                            <option value="">Izaberi račun...</option>
                            {accounts
                                .filter(a => (a.account_number ?? a.number) !== fromAccNum)
                                .map(acc => {
                                    const num = acc.account_number ?? acc.number;
                                    return (
                                        <option key={num} value={num}>
                                            {acc.name ?? num} — {fmt(acc.balance, acc.currency)}
                                        </option>
                                    );
                                })}
                        </select>
                    </div>

                    {/* IZNOS */}
                    <div className={styles.field}>
                        <label>Iznos ({fromCurrency ?? ''})</label>
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Dynamic exchange rate info */}
                    {isCrossCurrency && rateInfo && (
                        <div className={styles.infoBlock}>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--tx-2)' }}>
                                💱 Informativni kurs: <strong>{rateInfo.label}</strong>
                            </p>
                            {rateInfo.convertedAmount != null && (
                                <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--blue)', fontWeight: 700 }}>
                                    ≈ {fmt(rateInfo.convertedAmount, rateInfo.toCurrency)}
                                </p>
                            )}
                        </div>
                    )}

                    {isCrossCurrency && !rateInfo && rates.length > 0 && (
                        <div className={styles.infoBlock}>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--tx-3)' }}>
                                ℹ️ Transfer između različitih valuta — kurs će biti primenjen automatski.
                            </p>
                        </div>
                    )}

                    {loadingRate && (
                        <div style={{ padding: '8px 0' }}><Spinner /></div>
                    )}

                    {insufficientFunds && (
                        <Alert tip="greska" poruka={`Nedovoljno sredstava. Raspoloživo: ${fmt(fromAccount.balance, fromAccount.currency)}`} />
                    )}

                    <button className={styles.btnPrimary} onClick={handleNext} disabled={!canProceed}>
                        Nastavi →
                    </button>
                </div>
            </main>
        </div>
        </>
    );
}
