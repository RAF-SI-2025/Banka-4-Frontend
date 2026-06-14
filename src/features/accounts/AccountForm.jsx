import { useState, useEffect } from 'react';
import { companiesApi } from '../../api/endpoints/companies';
import styles from './AccountForm.module.css';

// eslint-disable-next-line react-refresh/only-export-components
export const ACCOUNT_TYPES = [
  {
    value: 'tekuci',
    label: 'Tekući račun',
    desc:  'Standardni račun za svakodnevne transakcije (RSD)',
  },
  {
    value: 'devizni',
    label: 'Devizni račun',
    desc:  'Račun u stranoj valuti (EUR, USD, CHF…)',
  },
];

// eslint-disable-next-line react-refresh/only-export-components
export const CURRENCIES = {
  tekuci:  [{ value: 'RSD', label: 'RSD' }],
  devizni: [
    { value: 'EUR', label: 'EUR' },
    { value: 'CHF', label: 'CHF' },
    { value: 'USD', label: 'USD' },
    { value: 'GBP', label: 'GBP' },
    { value: 'JPY', label: 'JPY' },
    { value: 'CAD', label: 'CAD' },
    { value: 'AUD', label: 'AUD' },
  ],
};

// eslint-disable-next-line react-refresh/only-export-components
export const ACCOUNT_CATEGORIES = [
  { group: 'Lični računi',    value: 'licni_standardni',    label: 'Standardni' },
  { group: 'Lični računi',    value: 'licni_stedni',         label: 'Štedni' },
  { group: 'Lični računi',    value: 'licni_penzionerski',   label: 'Penzionerski' },
  { group: 'Lični računi',    value: 'licni_mladi',          label: 'Za mlade / studente' },
  { group: 'Poslovni računi', value: 'poslovni_doo',         label: 'D.O.O.' },
  { group: 'Poslovni računi', value: 'poslovni_ad',          label: 'A.D.' },
  { group: 'Poslovni računi', value: 'poslovni_fondacija',   label: 'Fondacija' },
];


const isBusiness = (category) => category?.startsWith('poslovni');

export default function AccountForm({ form, onChange, errors, companyData, onCompanyChange, companyErrors }) {
  const currencies = form.account_type ? CURRENCIES[form.account_type] : [];

  const [workCodes, setWorkCodes] = useState([]);
  useEffect(() => {
    if (!isBusiness(form.category)) return;
    companiesApi.getWorkCodes()
      .then(res => setWorkCodes(Array.isArray(res) ? res : res?.data ?? []))
      .catch(() => setWorkCodes([]));
  }, [form.category]);

  const licni    = ACCOUNT_CATEGORIES.filter(c => c.group === 'Lični računi');
  const poslovni = ACCOUNT_CATEGORIES.filter(c => c.group === 'Poslovni računi');

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <span className={styles.sectionTitle}>Tip i valuta računa</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Tip računa <span className={styles.required}>*</span>
          </label>
          <div className={styles.radioGroup}>
            {ACCOUNT_TYPES.map(type => (
              <label
                key={type.value}
                className={`${styles.radioOption} ${form.account_type === type.value ? styles.radioSelected : ''}`}
              >
                <input
                  type="radio"
                  name="account_type"
                  value={type.value}
                  checked={form.account_type === type.value}
                  onChange={e => onChange('account_type', e.target.value)}
                />
                <div>
                  <div className={styles.radioLabel}>{type.label}</div>
                  <div className={styles.radioDesc}>{type.desc}</div>
                </div>
              </label>
            ))}
          </div>
          {errors.account_type && <span className={styles.greska}>{errors.account_type}</span>}
        </div>

        {form.account_type && (
          <div className={styles.field} style={{ marginTop: '20px' }}>
            <label className={styles.label}>
              Valuta <span className={styles.required}>*</span>
            </label>
            <div className={styles.currencyGrid}>
              {currencies.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChange('currency', c.value)}
                  className={`${styles.currencyOpt} ${form.currency === c.value ? styles.currencySelected : ''}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {errors.currency && <span className={styles.greska}>{errors.currency}</span>}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
              <path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
            </svg>
          </div>
          <span className={styles.sectionTitle}>Kategorija računa</span>
        </div>

        <div className={styles.fieldGrid2}>
          <div className={styles.field}>
            <label className={styles.label}>
              Vrsta računa <span className={styles.required}>*</span>
            </label>
            <select
              value={form.category}
              onChange={e => onChange('category', e.target.value)}
              className={`${styles.select} ${errors.category ? styles.inputError : ''}`}
            >
              <option value="">Izaberite kategoriju...</option>
              <optgroup label="Lični računi">
                {licni.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </optgroup>
              <optgroup label="Poslovni računi">
                {poslovni.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </optgroup>
            </select>
            {errors.category && <span className={styles.greska}>{errors.category}</span>}
          </div>
        </div>
      </div>

      {isBusiness(form.category) && companyData && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/>
                <line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
            </div>
            <span className={styles.sectionTitle}>Podaci o firmi</span>
          </div>

          <div className={styles.fieldGrid2}>
            <div className={styles.field}>
              <label className={styles.label}>
                Naziv firme <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                placeholder="npr. Firma D.O.O."
                value={companyData.company_name}
                onChange={e => onCompanyChange('company_name', e.target.value)}
                className={`${styles.input} ${companyErrors?.company_name ? styles.inputError : ''}`}
              />
              {companyErrors?.company_name && <span className={styles.greska}>{companyErrors.company_name}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Matični broj (MB) <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="12345678"
                value={companyData.registration_number}
                onChange={e => onCompanyChange('registration_number', e.target.value.replace(/\D/g, ''))}
                className={`${styles.input} ${companyErrors?.registration_number ? styles.inputError : ''}`}
              />
              <span className={styles.fieldHint}>Tačno 8 cifara</span>
              {companyErrors?.registration_number && <span className={styles.greska}>{companyErrors.registration_number}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                PIB (poreski broj) <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                placeholder="123456789"
                value={companyData.pib}
                onChange={e => onCompanyChange('pib', e.target.value.replace(/\D/g, ''))}
                className={`${styles.input} ${companyErrors?.pib ? styles.inputError : ''}`}
              />
              <span className={styles.fieldHint}>Tačno 9 cifara</span>
              {companyErrors?.pib && <span className={styles.greska}>{companyErrors.pib}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Šifra delatnosti <span className={styles.required}>*</span>
              </label>
              <select
                value={companyData.work_code_id}
                onChange={e => onCompanyChange('work_code_id', e.target.value)}
                className={`${styles.select} ${companyErrors?.work_code_id ? styles.inputError : ''}`}
              >
                <option value="">Izaberite šifru delatnosti...</option>
                {workCodes.map(wc => (
                  <option key={wc.id ?? wc.ID} value={wc.id ?? wc.ID}>
                    {wc.code ?? wc.Code} — {wc.description ?? wc.name ?? wc.Name}
                  </option>
                ))}
              </select>
              {companyErrors?.work_code_id && <span className={styles.greska}>{companyErrors.work_code_id}</span>}
            </div>

            <div className={`${styles.field}`} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>
                Adresa <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                placeholder="npr. Trg Republike V/5, Beograd, Srbija"
                value={companyData.address}
                onChange={e => onCompanyChange('address', e.target.value)}
                className={`${styles.input} ${companyErrors?.address ? styles.inputError : ''}`}
              />
              {companyErrors?.address && <span className={styles.greska}>{companyErrors.address}</span>}
            </div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <span className={styles.sectionTitle}>Parametri i opcije</span>
        </div>

        <div className={styles.fieldGrid2}>
          <div className={styles.field}>
            <label className={styles.label}>
              Početno stanje <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={form.initial_balance}
              onChange={e => onChange('initial_balance', e.target.value)}
              className={`${styles.input} ${errors.initial_balance ? styles.inputError : ''}`}
            />
            <span className={styles.fieldHint}>Inicijalni depozit u valuti računa</span>
            {errors.initial_balance && <span className={styles.greska}>{errors.initial_balance}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Dnevni limit <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={form.daily_limit}
              onChange={e => onChange('daily_limit', e.target.value)}
              className={`${styles.input} ${errors.daily_limit ? styles.inputError : ''}`}
            />
            {errors.daily_limit && <span className={styles.greska}>{errors.daily_limit}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Mesečni limit <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={form.monthly_limit}
              onChange={e => onChange('monthly_limit', e.target.value)}
              className={`${styles.input} ${errors.monthly_limit ? styles.inputError : ''}`}
            />
            {errors.monthly_limit && <span className={styles.greska}>{errors.monthly_limit}</span>}
          </div>
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.create_card}
            onChange={e => onChange('create_card', e.target.checked)}
            className={styles.checkbox}
          />
          <div>
            <div className={styles.checkboxLabel}>Napravi karticu</div>
            <div className={styles.checkboxDesc}>
              Sistem automatski generiše zahtev i vezuje novu debitnu karticu za ovaj račun
            </div>
          </div>
        </label>
      </div>
    </>
  );
}
