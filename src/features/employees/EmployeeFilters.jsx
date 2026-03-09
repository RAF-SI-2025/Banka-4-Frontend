import styles from './EmployeeFilters.module.css';

export default function EmployeeFilters({ filters, onFilterChange }) {
  function update(key, value) {
    onFilterChange({ ...filters, [key]: value });
  }

  return (
    <div className={styles.filters}>
      <input
        type="text"
        placeholder="Pretraži po imenu, prezimenu ili emailu..."
        value={filters.search}
        onChange={e => update('search', e.target.value)}
        className={styles.searchInput}
      />
      <select
        value={filters.status}
        onChange={e => update('status', e.target.value)}
        className={styles.selectInput}
      >
        <option value="">Svi statusi</option>
        <option value="aktivan">Aktivni</option>
        <option value="neaktivan">Neaktivni</option>
      </select>
      <input
        type="text"
        placeholder="Departman"
        value={filters.departman}
        onChange={e => update('departman', e.target.value)}
      />
      <input
        type="text"
        placeholder="Pozicija"
        value={filters.pozicija}
        onChange={e => update('pozicija', e.target.value)}
      />
    </div>
  );
}
