import { useState } from 'react';
import Pagination from '../../components/ui/Pagination';
import styles from './PortfolioTable.module.css';

const PAGE_SIZE = 10;

export default function PortfolioTable({ assets, isAdmin, onSell, onPublish, onViewDividends}) {
  const [page, setPage] = useState(1);
  const [qtyMap, setQtyMap] = useState({});
  const paged = assets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const getDividendYield = (asset) =>
    asset?.dividend_yield ??
    asset?.dividendYield ??
    asset?.DividendYield ??
    null;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>TIKERI</th>
            <th>TIP</th>
            <th>KOLIČINA</th>
            <th>CENA</th>
            <th>JAVNO</th>
            <th>REZERVISANO</th>
            <th>PROFIT</th>
            <th>PRINOS OD DIVIDENDI</th>
            <th>POSLEDNJA IZMENA</th>
            <th>DIVIDENDE</th>
            <th>AKCIJE</th>
          </tr>
        </thead>
        <tbody>
          {paged.length === 0 && (
            <tr>
              <td colSpan="11" style={{ textAlign: 'center', padding: '24px', color: 'var(--tx-3)' }}>                
                Nema hartija za prikaz.
              </td>
            </tr>
          )}
          {paged.map((asset, idx) => {
            const key = asset.ownership_id ?? asset.asset_ownership_id ?? asset.ownershipId ?? asset.assetId ?? asset.id ?? `${asset.ticker || 'asset'}-${(page - 1) * PAGE_SIZE + idx}`;
            return (
              <tr key={key}>
                <td className={styles.ticker}>{asset.ticker}</td>
                <td style={{ fontSize: 12, color: 'var(--tx-2)' }}>{asset.type}</td>
                <td>{asset.amount}</td>
                <td>{asset.public_amount ?? asset.publicAmount ?? '—'}</td>
                <td>{asset.reserved_amount ?? asset.reservedAmount ?? '—'}</td>
                <td>{asset.pricePerUnitRSD != null
                  ? `${Number(asset.pricePerUnitRSD).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD`
                  : asset.price != null ? `$${asset.price}` : '—'}
                </td>
                                <td className={asset.profit >= 0 ? styles.pos : styles.neg}>
                  {asset.profit >= 0 ? '+' : ''}{Number(asset.profit ?? 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  {getDividendYield(asset) != null
                    ? `${Number(getDividendYield(asset)).toLocaleString('sr-RS', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}%`
                    : '—'}
                </td>
                <td style={{ color: '#64748b', fontSize: '12px' }}>
                  {asset.lastModified ? new Date(asset.lastModified).toLocaleDateString('sr-RS') : '—'}
                </td>
                <td>
                  {String(asset.type ?? '').toUpperCase() === 'STOCK' ? (
                    <button
                      type="button"
                      className={styles.dividendBtn}
                      onClick={() => onViewDividends?.(asset)}
                    >
                      Dividende
                    </button>
                  ) : '—'}
                </td>
                <td>
                  <div className={styles.actionCell}>
                    <button className={styles.sellBtn} onClick={() => onSell?.(asset)}>
                      PRODAJ
                    </button>
                    {isAdmin && (
                      <div className={styles.otcWrapper}>
                        <div className={styles.divider} />
                        <input
                          type="number"
                          placeholder="Qty"
                          className={styles.miniInput}
                          min={1}
                          max={asset.amount - (asset.public_amount ?? asset.publicAmount ?? 0) - (asset.reserved_amount ?? asset.reservedAmount ?? 0)}
                          value={qtyMap[key] ?? ''}
                          onChange={e => setQtyMap(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                        <button
                          className={styles.publicBtn}
                          disabled={!qtyMap[key] || Number(qtyMap[key]) <= 0}
                          onClick={() => onPublish?.(asset, Number(qtyMap[key]))}
                        >
                          Javno
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={assets.length} onPageChange={setPage} />
    </div>
  );
}
