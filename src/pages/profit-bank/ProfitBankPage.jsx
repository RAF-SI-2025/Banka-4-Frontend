import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import Navbar from '../../components/layout/Navbar';
import Alert from '../../components/ui/Alert';
import { useFetch } from '../../hooks/useFetch';
import { investmentFundsApi } from '../../api/endpoints/investmentFunds';
import { accountsApi } from '../../api/endpoints/accounts';
import styles from './ProfitBankPage.module.css';

const TAB = {
  ACTUARIES: 'ACTUARIES',
  FUNDS: 'FUNDS',
};

const ACTION = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAW: 'WITHDRAW',
};

export default function ProfitBankPage() {
  useEffect(() => { document.title = 'RAFBank | Prihodi banke'; }, []);
  const pageRef = useRef(null);

  const [activeTab, setActiveTab] = useState(TAB.ACTUARIES);
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedFundId, setSelectedFundId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [modalState, setModalState] = useState({
    open: false,
    type: null,
    fund: null,
  });

  const [form, setForm] = useState({
    bankAccountNumber: '',
    amount: '',
  });

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
  }, [activeTab, selectedFundId, modalState.open]);

  const {
    data: actuariesResponse,
    loading: actuariesLoading,
    error: actuariesError,
    refetch: refetchActuaries,
  } = useFetch(() => investmentFundsApi.getActuaryPerformances(), []);

  const {
    data: fundsResponse,
    loading: fundsLoading,
    error: fundsError,
    refetch: refetchFunds,
  } = useFetch(() => investmentFundsApi.getFundPositions(), []);

  const {
    data: selectedFundResponse,
    loading: fundDetailsLoading,
    error: fundDetailsError,
    refetch: refetchFundDetails,
  } = useFetch(
    () => (selectedFundId ? investmentFundsApi.getFundDetails(selectedFundId) : Promise.resolve(null)),
    [selectedFundId]
  );

  const {
    data: bankAccountsResponse,
    loading: bankAccountsLoading,
  } = useFetch(() => accountsApi.getBankAccounts(), []);

  const actuaries = useMemo(() => {
    const raw = Array.isArray(actuariesResponse)
      ? actuariesResponse
      : actuariesResponse?.data ?? [];

    const next = [...raw];
    next.sort((a, b) => {
      const aProfit = Number(a.profit_rsd ?? 0);
      const bProfit = Number(b.profit_rsd ?? 0);
      return sortDirection === 'desc' ? bProfit - aProfit : aProfit - bProfit;
    });

    return next;
  }, [actuariesResponse, sortDirection]);

  const funds = useMemo(() => {
    return Array.isArray(fundsResponse)
      ? fundsResponse
      : fundsResponse?.data ?? [];
  }, [fundsResponse]);

  const selectedFund = useMemo(() => {
    if (!selectedFundResponse) return null;
    return Array.isArray(selectedFundResponse)
      ? selectedFundResponse[0]
      : selectedFundResponse?.data ?? selectedFundResponse;
  }, [selectedFundResponse]);

  const bankAccounts = useMemo(() => {
    return Array.isArray(bankAccountsResponse)
      ? bankAccountsResponse
      : bankAccountsResponse?.data ?? bankAccountsResponse?.content ?? [];
  }, [bankAccountsResponse]);

  const { data: allFundsResponse } = useFetch(
    () => investmentFundsApi.getFunds({ page: 1, page_size: 200 }),
    []
  );

  

 const allFunds = useMemo(() => {
    if (Array.isArray(allFundsResponse?.data)) return allFundsResponse.data;
    if (Array.isArray(allFundsResponse)) return allFundsResponse;
    return [];
  }, [allFundsResponse]);

  const fundByName = useMemo(() => {
    const map = new Map();

    allFunds.forEach((f) => {
      const name = f?.name ?? f?.fund_name;
      if (name) map.set(name, f);
    });

    return map;
  }, [allFunds]);



  function openFundAction(type, fund) {
    const firstBankAccount = bankAccounts[0];

    const fullFund = fundByName.get(fund?.fund_name ?? fund?.name);


    setForm({
      bankAccountNumber:
        firstBankAccount?.AccountNumber ??
        firstBankAccount?.account_number ??
        firstBankAccount?.accountNumber ??
        '',
      amount: '',
    });

    setModalState({
      open: true,
      type,
      fund: {
        ...fund,
        fund_id: fullFund?.fund_id ?? fund?.fund_id ?? fund?.id,
        name: fullFund?.name ?? fund?.fund_name ?? fund?.name,
        liquid_assets: fullFund?.liquid_assets ?? 0,
        account_number: fullFund?.account_number ?? '',
        minimum_contribution: fullFund?.minimum_contribution,
        description: fullFund?.description,
      },
    });
  }

  function closeFundAction() {
    setModalState({
      open: false,
      type: null,
      fund: null,
    });

    setForm({
      bankAccountNumber: '',
      amount: '',
    });
  }

  async function handleSubmitFundAction(e) {
    e.preventDefault();

    const amount = Number(form.amount);
    const fund = modalState.fund;
    const fundId = fund?.fund_id ?? fund?.id;

    if (!form.bankAccountNumber) {
      setFeedback({ type: 'greska', text: 'Izaberite bankovni račun.' });
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      setFeedback({ type: 'greska', text: 'Unesite validan iznos.' });
      return;
    }

    if (
      modalState.type === ACTION.WITHDRAW &&
      amount > Number(fund?.liquidity_rsd ?? fund?.available_liquidity_rsd ?? fund?.liquid_assets ?? 0)) {
      setFeedback({
        type: 'greska',
        text: 'Fond nema dovoljno raspoložive likvidnosti.',
      });
      return;
    }

    try {
      if (modalState.type === ACTION.DEPOSIT) {
        await investmentFundsApi.investInFund(fundId, {
          account_number: form.bankAccountNumber,
          amount,
        });

        setFeedback({ type: 'uspeh', text: 'Uplata u fond je uspešno evidentirana.' });
      } else {
        await investmentFundsApi.withdrawFromFund(fundId, {
          account_number: form.bankAccountNumber,
          amount,
        });

        setFeedback({ type: 'uspeh', text: 'Povlačenje iz fonda je uspešno evidentirano.' });
      }

      closeFundAction();
      refetchFunds?.();
      refetchFundDetails?.();
    } catch (err) {
      setFeedback({
        type: 'greska',
        text: err?.message || 'Akcija nad fondom nije uspela.',
      });
    }
  }

  const showActuaries = activeTab === TAB.ACTUARIES;
  const showFunds = activeTab === TAB.FUNDS && !selectedFundId;
  const showFundDetails = activeTab === TAB.FUNDS && !!selectedFundId;

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>
        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span>Profit Banke</span>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbAktivna}>
              {showFundDetails ? 'Detalji fonda' : 'Pregled'}
            </span>
          </div>

          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Profit Banke</h1>
              <p className={styles.pageDesc}>
                Portal dostupan isključivo supervizorima. Sve vrednosti su prikazane u RSD.
              </p>
            </div>
          </div>
        </div>

        {feedback && (
          <div className="page-anim">
            <Alert tip={feedback.type} poruka={feedback.text} />
          </div>
        )}

        <section className={`page-anim ${styles.tabsCard}`}>
          <div className={styles.tabsRow}>
            <button
              type="button"
              className={`${styles.tabButton} ${showActuaries ? styles.tabButtonActive : ''}`}
              onClick={() => {
                setSelectedFundId(null);
                setActiveTab(TAB.ACTUARIES);
              }}
            >
              Profit aktuara
            </button>

            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === TAB.FUNDS ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab(TAB.FUNDS)}
            >
              Pozicije u fondovima
            </button>
          </div>
        </section>

        {showActuaries && (
          <section className={`page-anim ${styles.card}`}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionEyebrow}>Actuary Performances</div>
                <h2 className={styles.sectionTitle}>Tabela svih aktuara</h2>
              </div>

              <button
                type="button"
                className={styles.btnGhost}
                onClick={() =>
                  setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'))
                }
              >
                Sortiraj po profitu: {sortDirection === 'desc' ? 'Opadajuće' : 'Rastuće'}
              </button>
            </div>

            {actuariesLoading ? (
              <div className={styles.loadingState}>Učitavanje podataka...</div>
            ) : actuariesError ? (
              <div className={styles.inlineState}>
                <Alert tip="greska" poruka={actuariesError?.message || 'Greška pri učitavanju.'} />
                <button type="button" className={styles.btnGhost} onClick={refetchActuaries}>
                  Pokušaj ponovo
                </button>
              </div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Ime</th>
                        <th>Prezime</th>
                        <th>Pozicija</th>
                        <th>Profit u RSD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actuaries.length === 0 ? (
                        <tr>
                          <td colSpan="4" className={styles.emptyTable}>
                            Nema podataka za prikaz.
                          </td>
                        </tr>
                      ) : (
                        actuaries.map((item) => (
                          <tr key={item.actuary_id}>
                            <td>{item.first_name}</td>
                            <td>{item.last_name}</td>
                            <td>{formatPosition(item.position)}</td>
                            <td>{formatRSD(item.profit_rsd)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {showFunds && (
          <section className={`page-anim ${styles.card}`}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionEyebrow}>Investment Funds Positions</div>
                <h2 className={styles.sectionTitle}>Pozicije banke u fondovima</h2>
              </div>
            </div>

            {fundsLoading ? (
              <div className={styles.loadingState}>Učitavanje fondova...</div>
            ) : fundsError ? (
              <div className={styles.inlineState}>
                <Alert tip="greska" poruka={fundsError?.message || 'Greška pri učitavanju fondova.'} />
                <button type="button" className={styles.btnGhost} onClick={refetchFunds}>
                  Pokušaj ponovo
                </button>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Naziv fonda</th>
                      <th>Ime i prezime menadžera</th>
                      <th>Udeo banke (%)</th>
                      <th>Udeo banke (RSD)</th>
                      <th>Profit u RSD</th>
                      <th>Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funds.length === 0 ? (
                      <tr>
                        <td colSpan="6" className={styles.emptyTable}>
                          Nema fondova za prikaz.
                        </td>
                      </tr>
                    ) : (
                      funds.map((fund) => (
                        <tr key={fund.fund_id}>
                          <td>
                            <button
                              type="button"
                              className={styles.linkButton}
                              onClick={() => setSelectedFundId(fund.fund_id)}
                            >
                              {fund.fund_name}
                            </button>
                          </td>
                          <td>
                            {fund.manager_name ?? '—'}
                          </td>
                          <td>{formatPercent(fund.bank_share_pct)}</td>
                          <td>{formatRSD(fund.bank_share_value)}</td>
                          <td>{formatRSD(fund.profit)}</td>
                          <td>
                            <div className={styles.actionRow}>
                              <button
                                type="button"
                                className={styles.btnPrimary}
                                onClick={() => openFundAction(ACTION.DEPOSIT, fund)}
                              >
                                Uplata u fond
                              </button>
                              <button
                                type="button"
                                className={styles.btnGhost}
                                onClick={() => openFundAction(ACTION.WITHDRAW, fund)}
                              >
                                Povlačenje iz fonda
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {showFundDetails && (
          <section className={`page-anim ${styles.card}`}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionEyebrow}>Detaljan prikaz fonda</div>
                <h2 className={styles.sectionTitle}>{selectedFund?.name || 'Fond'}</h2>
              </div>

              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setSelectedFundId(null)}
              >
                Nazad na fondove
              </button>
            </div>

            {fundDetailsLoading ? (
              <div className={styles.loadingState}>Učitavanje detalja fonda...</div>
            ) : fundDetailsError ? (
              <div className={styles.inlineState}>
                <Alert tip="greska" poruka={fundDetailsError?.message || 'Greška pri učitavanju detalja fonda.'} />
                <button type="button" className={styles.btnGhost} onClick={refetchFundDetails}>
                  Pokušaj ponovo
                </button>
              </div>
            ) : !selectedFund ? (
              <div className={styles.loadingState}>Nema detalja fonda.</div>
            ) : (
              <>
                <div className={styles.detailGrid}>
                  <InfoCard
                    label="Menadžer"
                    value={`${selectedFund.manager?.first_name ?? ''} ${selectedFund.manager?.last_name ?? ''}`.trim() || '—'}
                  />
                  <InfoCard label="Udeo banke (%)" value={formatPercent(selectedFund.bank_share_percent)} />
                  <InfoCard label="Udeo banke (RSD)" value={formatRSD(selectedFund.bank_share_rsd)} />
                  <InfoCard label="Profit u RSD" value={formatRSD(selectedFund.profit_rsd)} />
                  <InfoCard label="Dostupna likvidnost" value={formatRSD(selectedFund.liquidity_rsd ?? selectedFund.liquid_assets)}/>
                  <InfoCard label="Opis" value={selectedFund.description || '—'} />
                </div>

                <div className={styles.sectionDivider} />

                <div className={styles.accountsBlock}>
                  <h3 className={styles.subTitle}>Bankovni račun fonda</h3>

                  {selectedFund.fund_account || selectedFund.account_number ? (
                    <div className={styles.accountItem}>
                      <strong>{selectedFund.fund_account?.name || 'Račun fonda'}</strong>
                      <span>{selectedFund.fund_account?.account_number || selectedFund.account_number}</span>
                    </div>
                  ) : (
                    <div className={styles.accountItem}>
                      <strong>Nema povezanog računa</strong>
                      <span>—</span>
                    </div>
                  )}
                </div>

                <div className={styles.sectionDivider} />

                <div className={styles.actionRow} style={{ padding: '0 28px 28px' }}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => openFundAction(ACTION.DEPOSIT, selectedFund)}
                  >
                    Uplata u fond
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => openFundAction(ACTION.WITHDRAW, selectedFund)}
                  >
                    Povlačenje iz fonda
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {modalState.open && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  {modalState.type === ACTION.DEPOSIT ? 'Uplata u fond' : 'Povlačenje iz fonda'}
                </h3>
                <p className={styles.modalText}>
                  Fond: <strong>{modalState.fund?.name ?? modalState.fund?.fund_name ?? '—'}</strong>
                </p>
              </div>

              <button
                type="button"
                className={styles.closeIconButton}
                onClick={closeFundAction}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitFundAction} className={styles.modalBody}>
              <div className={styles.fieldGrid2}>
                <Polje label="Bankovni račun" required>
                  <select
                    value={form.bankAccountNumber}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bankAccountNumber: e.target.value,
                      }))
                    }
                  >
                    <option value="">
                      {bankAccountsLoading ? 'Učitavanje računa...' : 'Izaberite račun...'}
                    </option>

                    {bankAccounts.map((a, i) => {
                      const num = a.AccountNumber ?? a.account_number ?? a.accountNumber ?? a.number ?? '';
                      const name = a.Name ?? a.name ?? a.owner_name ?? a.ownerName ?? a.owner ?? `Račun ${i + 1}`;
                      const bal = a.Balance ?? a.AvailableBalance ?? a.balance ?? a.available_balance ?? a.availableBalance;
                      const cur = a.Currency?.Code ?? a.currency ?? '';

                      return (
                        <option key={num || i} value={num}>
                          {name}{num ? ` — ${num}` : ''}
                          {bal != null
                            ? ` (${Number(bal).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}${cur ? ` ${cur}` : ''})`
                            : ''}
                        </option>
                      );
                    })}
                  </select>
                </Polje>

                <Polje label="Iznos u RSD" required>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                  />
                </Polje>
              </div>

              {modalState.type === ACTION.WITHDRAW && (
                <div className={styles.infoStrip}>
                  Dostupna likvidnost fonda:{' '}
                  {formatRSD(
                    modalState.fund?.liquidity_rsd ??
                    modalState.fund?.available_liquidity_rsd ??
                    modalState.fund?.liquid_assets ??
                    0
                  )}
                </div>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.btnGhost} onClick={closeFundAction}>
                  Otkaži
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Potvrdi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Polje({ label, required, children }) {
  return (
    <div className={styles.field}>
      <label>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      {children}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <strong className={styles.infoValue}>{value}</strong>
    </div>
  );
}

function formatRSD(value) {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))} RSD`;
}

function formatPercent(value) {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number(value))}%`;
}

function formatPosition(value) {
  if (!value) return '—';
  if (value === 'SUPERVISOR') return 'Supervizor';
  if (value === 'AGENT') return 'Agent';
  return value;
}