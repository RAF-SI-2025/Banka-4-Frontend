import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useNavigate }                        from 'react-router-dom';
import gsap                                   from 'gsap';
import { accountsApi }                        from '../../api/endpoints/accounts';
import { clientsApi }                         from '../../api/endpoints/clients';
import { companiesApi }                       from '../../api/endpoints/companies';
import { useAuthStore }                       from '../../store/authStore';
import { jeObavezno, jeValidanEmail }         from '../../utils/helpers';
import Navbar                                 from '../../components/layout/Navbar';
import Alert                                  from '../../components/ui/Alert';
import ClientSearch                           from '../../features/accounts/ClientSearch';
import ClientForm                             from '../../features/accounts/ClientForm';
import AccountForm                            from '../../features/accounts/AccountForm';
import AccountPreview                         from '../../features/accounts/AccountPreview';
import styles                                 from './NewAccount.module.css';

// eslint-disable-next-line react-refresh/only-export-components
export const CURRENCIES_BY_TYPE = {
  tekuci:  ['RSD'],
  devizni: ['EUR', 'CHF', 'USD', 'GBP', 'JPY', 'CAD', 'AUD'],
};

export default function NewAccount() {
  useEffect(() => { document.title = 'RAFBank | Novi račun'; }, []);
  const navigate = useNavigate();
  const pageRef  = useRef(null);
  const user     = useAuthStore(s => s.user);

  const [searchStatus,   setSearchStatus]   = useState('idle');

  const [clientMode,     setClientMode]     = useState(null);
  const [existingClient, setExistingClient] = useState(null);
  const [newClientData,  setNewClientData]  = useState({
    first_name: '',
    last_name:  '',
    email:      '',
    jmbg:       '',
  });

  const [accountData, setAccountData] = useState({
    account_type:    '',
    currency:        '',
    category:        '',
    initial_balance: '0',
    daily_limit:     '',
    monthly_limit:   '',
    create_card:     false,
  });

  const [companyData, setCompanyData] = useState({
    company_name:        '',
    registration_number: '',
    pib:                 '',
    work_code_id:        '',
    address:             '',
  });

  const [errors,         setErrors]         = useState({});
  const [companyErrors,  setCompanyErrors]  = useState({});
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [submitError,    setSubmitError]    = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.page-anim', {
        opacity:  0,
        y:        20,
        duration: 0.45,
        stagger:  0.08,
        ease:     'power2.out',
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  async function handleSearch(query) {
    setSearchStatus('searching');
    setSubmitError(null);

    try {
      const client = await accountsApi.searchClient(query);
      setExistingClient(client);
      setClientMode('existing');
      setSearchStatus('found');
      setErrors(prev => {
        const next = { ...prev };
        ['first_name', 'last_name', 'email', 'jmbg'].forEach(k => delete next[k]);
        return next;
      });
    } catch (err) {
      const status = err?.status ?? err?.response?.status;
      const code   = err?.code   ?? err?.error_code;

      if (status === 404 || code === 'NOT_FOUND') {
        setExistingClient(null);
        setClientMode('new');
        setSearchStatus('not_found');
      } else {
        setSearchStatus('error');
        setSubmitError(err?.message || err?.error || 'Greška pri pretrazi klijenta.');
      }
    }
  }

  function handleClearClient() {
    setExistingClient(null);
    setClientMode(null);
    setSearchStatus('idle');
    setNewClientData({ first_name: '', last_name: '', email: '', jmbg: '' });
  }

  function updateClientField(field, value) {
    setNewClientData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  }

  function updateCompanyField(field, value) {
    setCompanyData(prev => ({ ...prev, [field]: value }));
    if (companyErrors[field]) setCompanyErrors(prev => ({ ...prev, [field]: null }));
  }

  function updateAccountField(field, value) {
    setAccountData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'account_type') {
        next.currency = value === 'tekuci' ? 'RSD' : '';
      }
      return next;
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    if (field === 'category' && !value?.startsWith('poslovni')) {
      setCompanyErrors({});
    }
  }

  function validateForm() {
    const e = {};
    const check = (field, err) => { if (err) e[field] = err; };

    if (!clientMode) {
      setSubmitError('Morate izabrati ili kreirati klijenta pre kreiranja računa.');
      setErrors(e);
      return false;
    }

    if (clientMode === 'new') {
      check('first_name', jeObavezno(newClientData.first_name));
      check('last_name',  jeObavezno(newClientData.last_name));
      check('email',      jeObavezno(newClientData.email) ?? jeValidanEmail(newClientData.email));

      if (!newClientData.jmbg?.trim()) {
        e.jmbg = 'Polje je obavezno';
      } else if (!/^\d{13}$/.test(newClientData.jmbg.trim())) {
        e.jmbg = 'JMBG mora sadržati tačno 13 cifara';
      }
    }

    check('account_type',  jeObavezno(accountData.account_type));
    check('currency',      jeObavezno(accountData.currency));
    check('category',      jeObavezno(accountData.category));
    check('daily_limit',   jeObavezno(accountData.daily_limit));
    check('monthly_limit', jeObavezno(accountData.monthly_limit));

    // Company validation for business accounts
    const ce = {};
    if (accountData.category?.startsWith('poslovni')) {
      if (!companyData.company_name?.trim())        ce.company_name        = 'Polje je obavezno';
      if (!companyData.registration_number?.trim()) ce.registration_number = 'Polje je obavezno';
      else if (!/^\d{8}$/.test(companyData.registration_number)) ce.registration_number = 'Matični broj mora imati tačno 8 cifara';
      if (!companyData.pib?.trim())                 ce.pib                 = 'Polje je obavezno';
      else if (!/^\d{9}$/.test(companyData.pib))   ce.pib                 = 'PIB mora imati tačno 9 cifara';
      if (!companyData.work_code_id)                 ce.work_code_id        = 'Izaberite šifru delatnosti';
      if (!companyData.address?.trim())             ce.address             = 'Polje je obavezno';
    }
    setCompanyErrors(ce);
    if (Object.keys(ce).length > 0) {
      setErrors(e);
      return false;
    }

    const ib = Number(accountData.initial_balance);
    const dl = Number(accountData.daily_limit);
    const ml = Number(accountData.monthly_limit);

    if (accountData.initial_balance !== '' && ib < 0)
      e.initial_balance = 'Početno stanje ne može biti negativno';
    if (accountData.daily_limit !== '' && dl < 0)
      e.daily_limit = 'Dnevni limit ne može biti negativan';
    if (accountData.monthly_limit !== '' && ml < 0)
      e.monthly_limit = 'Mesečni limit ne može biti negativan';
    if (accountData.daily_limit !== '' && accountData.monthly_limit !== '' && ml < dl)
      e.monthly_limit = 'Mesečni limit ne može biti manji od dnevnog limita';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();        
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      let clientId = existingClient?.id ?? null;

      if (clientMode === 'new') {
        const created = await clientsApi.create({
          first_name: newClientData.first_name,
          last_name:  newClientData.last_name,
          email:      newClientData.email,
          jmbg:       newClientData.jmbg,
        });
        clientId = created?.data?.id ?? created?.id;
      }

      // Calculate expiration date (+5 years)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 5);

      const isBusiness = accountData.category.startsWith('poslovni');
      const accountTypeStr = isBusiness ? 'Business' : 'Personal';
      const accountKindStr = accountData.account_type === 'tekuci' ? 'Current' : 'Foreign';

      // Map subtype exactly to Go constants
      const subtypeMap = {
        'licni_standardni':   'Standard',
        'licni_stedni':       'Savings',
        'licni_penzionerski': 'Pension',
        'licni_mladi':        'Student',
        'poslovni_doo':       'LLC',
        'poslovni_ad':        'JointStock',
        'poslovni_fondacija': 'Foundation'
      };
      const subtypeStr = subtypeMap[accountData.category] || 'Standard';

      const employeeId = user?.employee_id || user?.id || 0;

      // Create company first for business accounts
      let companyId = null;
      if (isBusiness) {
        const createdCompany = await companiesApi.create({
          name:                companyData.company_name.trim(),
          registration_number: companyData.registration_number,
          tax_number:          companyData.pib,
          work_code_id:        Number(companyData.work_code_id),
          address:             companyData.address.trim(),
          owner_id:            clientId,
        });
        companyId = createdCompany?.id ?? createdCompany?.data?.id ?? createdCompany?.ID;
      }

      let apiPayload = {
        client_id:       clientId,
        employee_id:     employeeId,
        account_type:    accountTypeStr,
        account_kind:    accountKindStr,
        subtype:         subtypeStr,
        initial_balance: accountData.initial_balance !== '' ? Number(accountData.initial_balance) : 0,
        create_card:     accountData.create_card,
        generate_card:   accountData.create_card,
        name:            accountKindStr === 'Current' ? 'Tekući račun RSD' : `Devizni račun ${accountData.currency}`,
        expires_at:      expiresAt.toISOString(),
      };

      if (accountKindStr === 'Foreign') {
        apiPayload.currency_code = accountData.currency || 'EUR';
      }

      if (companyId) {
        apiPayload.company_id = companyId;
      }

      await accountsApi.create(apiPayload);

      setSuccessMessage('Račun je uspešno kreiran!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => navigate('/'), 2500);

    } catch (err) {
      setSubmitError(err?.message || err?.error || 'Greška pri kreiranju računa.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div ref={pageRef} className={styles.stranica}>
      <Navbar />

      <main className={styles.sadrzaj}>

        <div className="page-anim">
          <div className={styles.breadcrumb}>
            <span
              className={styles.breadcrumbLink}
              role="button"
              tabIndex={0}
              onClick={() => navigate(-1)}
              onKeyDown={e => e.key === 'Enter' && navigate(-1)}
            >
              Računi klijenta
            </span>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbAktivna}>Kreiranje računa</span>
          </div>

          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Kreiranje računa korisnika</h1>
              <p className={styles.pageDesc}>
                Popunite formular za otvaranje novog bankovnog računa
              </p>
            </div>
            <button type="button" className={styles.btnGhost} onClick={() => navigate(-1)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Nazad
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className={`page-anim ${styles.grid}`}>

          <div className={styles.formCard}>

            {successMessage && (
              <div className={styles.alertWrap}>
                <Alert tip="uspeh" poruka={successMessage} />
              </div>
            )}

            {submitError && (
              <div className={styles.alertWrap}>
                <Alert tip="greska" poruka={submitError} />
              </div>
            )}

            <ClientSearch
              onSearch={handleSearch}
              searchStatus={searchStatus}
            />

            {clientMode !== null && (
              <ClientForm
                clientMode={clientMode}
                existingClient={existingClient}
                onClear={handleClearClient}
                newClientData={newClientData}
                onClientChange={updateClientField}
                errors={errors}
              />
            )}

            <AccountForm
              form={accountData}
              onChange={updateAccountField}
              errors={errors}
              companyData={companyData}
              onCompanyChange={updateCompanyField}
              companyErrors={companyErrors}
            />

            <div className={styles.formActions}>
              <button type="button" className={styles.btnGhost} onClick={() => navigate(-1)}>
                Odustani
              </button>
              <button type="submit" disabled={isSubmitting} className={styles.btnPrimary}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {isSubmitting ? 'Kreiranje...' : 'Potvrdi kreiranje računa'}
              </button>
            </div>
          </div>

          <AccountPreview
            existingClient={existingClient}
            newClientData={newClientData}
            clientMode={clientMode}
            accountData={accountData}
          />

        </form>
      </main>
    </div>
  );
}
