// src/features/transfers/ConfirmTransfer.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import ClientHeader from '../../components/layout/ClientHeader';
import { transfersApi } from '../../api/endpoints/transfers';
import { useAuthStore } from '../../store/authStore';
import styles from './transfers.module.css';

export default function ConfirmTransfer() {
    useEffect(() => { document.title = 'RAFBank | Potvrda transfera'; }, []);
    const navigate = useNavigate();
    const { state } = useLocation();
    const clientId = useAuthStore(s => s.user?.client_id ?? s.user?.id);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!state) {
            navigate('/transfers/new');
        }
    }, [state, navigate]);

    if (!state) return null;

    const {
        fromAccount,
        toAccount,
        amount,
        userName,
        rateInfo,
        isCrossCurrency,
    } = state;

    const numericAmount = parseFloat(amount) || 0;

    const fromCurrency = fromAccount.currency ?? fromAccount.valuta;
    const toCurrency   = toAccount.currency   ?? toAccount.valuta;
    const fromBalance  = fromAccount.balance  ?? fromAccount.stanje ?? 0;
    const toBalance    = toAccount.balance    ?? toAccount.stanje   ?? 0;
    const fromNum      = fromAccount.account_number ?? fromAccount.number ?? fromAccount.broj;
    const toNum        = toAccount.account_number   ?? toAccount.number   ?? toAccount.broj;

    // Cross-currency: commission (1%) is deducted from the converted amount in toCurrency
    const convertedAmount = isCrossCurrency && rateInfo?.convertedAmount != null
        ? rateInfo.convertedAmount
        : numericAmount;
    const commission = isCrossCurrency && rateInfo ? convertedAmount * 0.01 : 0;
    const finalAmount = isCrossCurrency && rateInfo
        ? convertedAmount - commission
        : numericAmount;

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);

        try {
            await transfersApi.execute(clientId, {
                from_account: fromNum,
                to_account:   toNum,
                amount:       numericAmount,
            });

            setSuccess(true);

            setTimeout(() => {
                navigate('/transfers/history');
            }, 2000);

        } catch (err) {
            const msg =
                err?.response?.data?.error ||
                err?.message ||
                'Greška pri izvršavanju transfera.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleBack = () => {
        navigate('/transfers/new', { state });
    };

    return (
        <>
        <ClientHeader activeNav="transfers" />
        <div className={styles.stranica}>
            <main className={styles.sadrzaj}>
                <div className="page-anim">
                    <div className={styles.breadcrumb}>
                        <span>Transferi</span> › <span>Potvrda transfera</span>
                    </div>

                    <h1 className={styles.pageTitle}>Potvrdi transfer</h1>

                    <p className={styles.pageDesc}>
                        Proverite podatke pre izvršenja transakcije
                    </p>
                </div>

                {success ? (
                    <div className={`page-anim ${styles.successCard}`}>
                        <div className={styles.successIcon}>✅</div>
                        <h2>Transfer uspešno izvršen!</h2>
                        <p>Sredstva su prebačena na odabrani račun.</p>
                        <p>Preusmeravamo vas na istoriju transfera...</p>
                    </div>
                ) : (
                    <div className={`page-anim ${styles.confirmCard}`}>
                        <div className={styles.summaryGrid}>

                            {/* KLIJENT */}
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>Klijent</span>
                                <span className={styles.value}>{userName}</span>
                            </div>

                            {/* FROM */}
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>Iz računa</span>
                                <span className={styles.value}>
                                    {fromNum} ({fromCurrency})
                                    <br />
                                    <small>
                                        Stanje: {fromBalance.toLocaleString('sr-RS')} {fromCurrency}
                                    </small>
                                </span>
                            </div>

                            {/* TO */}
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>Na račun</span>
                                <span className={styles.value}>
                                    {toNum} ({toCurrency})
                                    <br />
                                    <small>
                                        Stanje: {toBalance.toLocaleString('sr-RS')} {toCurrency}
                                    </small>
                                </span>
                            </div>

                            {/* IZNOS */}
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>Iznos za skidanje</span>
                                <span className={styles.valueBig}>
                                    {numericAmount.toLocaleString('sr-RS', {
                                        minimumFractionDigits: 2,
                                    })} {fromCurrency}
                                </span>
                            </div>

                            {/* EXCHANGE RATE & COMMISSION — only for cross-currency */}
                            {isCrossCurrency && rateInfo && (
                                <>
                                    <div className={styles.summaryItem}>
                                        <span className={styles.label}>Primenjeni kurs</span>
                                        <span className={styles.value}>{rateInfo.label}</span>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <span className={styles.label}>Provizija (1%)</span>
                                        <span className={styles.value}>
                                            {commission.toLocaleString('sr-RS', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })} {rateInfo?.toCurrency ?? toCurrency}
                                        </span>
                                    </div>
                                </>
                            )}

                            {/* FINAL */}
                            <div className={`${styles.summaryItem} ${styles.finalRow}`}>
                                <span className={styles.label}>
                                    Konačni iznos koji stiže
                                </span>
                                <span className={styles.finalAmount}>
                                    {Number(finalAmount).toLocaleString('sr-RS', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })} {isCrossCurrency ? rateInfo?.toCurrency ?? toCurrency : toCurrency}
                                </span>
                            </div>
                        </div>

                        {error && (
                            <Alert
                                tip="greska"
                                poruka={error}
                                style={{ margin: '20px 0' }}
                            />
                        )}

                        <div className={styles.actions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={handleBack}
                                disabled={submitting}
                            >
                                Nazad – izmeni
                            </button>

                            <button
                                className={styles.btnPrimary}
                                onClick={handleConfirm}
                                disabled={submitting}
                            >
                                {submitting ? 'Izvršavanje...' : 'Potvrdi transfer'}
                            </button>
                        </div>
                    </div>
                )}
            </main>

        </div>
        </>
    );
}