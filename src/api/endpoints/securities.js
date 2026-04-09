import { tradingApi as api } from '../client';

function unpack(res) {
  const raw = res?.data ?? res;
  if (typeof raw !== 'string') return raw;
  // Backend šalje duplirani JSON — uzimamo samo prvi objekat
  const firstJson = raw.slice(0, raw.indexOf('}]') + 2) + '}';
  try {
    return JSON.parse(firstJson);
  } catch {
    // Fallback: pokušaj da nađeš prvi kompletan JSON objekat
    const match = raw.match(/^\{.*?"pageSize":\d+\}/s);
    if (match) return JSON.parse(match[0]);
    return { data: [] };
  }
}

function mapStock(s) {
  return {
    id:               s.listing_id,
    type:             'STOCK',
    ticker:           s.ticker,
    name:             s.name,
    exchange:         s.exchange,
    price:            s.price,
    change:           s.change,
    changePercent:    s.change_percent ?? null,
    volume:           s.volume,
    bid:              s.bid,
    ask:              s.ask,
    maintenanceMargin: s.maintenance_margin,
    initialMarginCost: s.initial_margin_cost,
    dividendYield:    s.dividend_yield ?? null,
    outstandingShares: s.outstanding_shares ?? null,
    currency:         s.currency ?? 'USD',
    history:          s.history ?? null,
    options:          s.options ? s.options.map(mapOptionRaw) : null,
  };
}

function mapFutures(s) {
  return {
    id:               s.listing_id,
    type:             'FUTURES',
    ticker:           s.ticker,
    name:             s.name,
    exchange:         s.exchange,
    price:            s.price,
    change:           s.change,
    changePercent:    null,
    volume:           s.volume,
    bid:              s.bid,
    ask:              s.ask,
    maintenanceMargin: s.maintenance_margin,
    initialMarginCost: s.initial_margin_cost,
    settlementDate:   s.settlement_date ?? null,
    contractSize:     s.contract_size ?? null,
    contractUnit:     s.contract_unit ?? null,
    currency:         s.currency ?? 'USD',
    history:          s.history ?? null,
    options:          null,
  };
}

function mapForex(s) {
  return {
    id:               s.listing_id,
    type:             'FOREX',
    ticker:           s.ticker,
    name:             s.name,
    exchange:         s.exchange ?? '',
    price:            s.price,
    change:           s.change,
    changePercent:    null,
    volume:           s.volume,
    bid:              s.bid,
    ask:              s.ask,
    maintenanceMargin: s.maintenance_margin,
    initialMarginCost: s.initial_margin_cost,
    base:             s.base ?? null,
    quote:            s.quote ?? null,
    currency:         s.quote ?? 'USD',
    history:          s.history ?? null,
    options:          null,
  };
}

function mapOptionBase(s) {
  return {
    id:               s.listing_id,
    type:             'OPTION',
    ticker:           s.ticker,
    name:             s.name,
    exchange:         s.exchange ?? '',
    price:            s.price,
    change:           s.change,
    changePercent:    null,
    volume:           s.volume,
    bid:              s.bid,
    ask:              s.ask,
    maintenanceMargin: s.maintenance_margin,
    initialMarginCost: s.initial_margin_cost,
    
    // Specifična polja za opcije:
    strike:           s.strike,
    openInterest:     s.open_interest,
    settlementDate:   s.settlement_date,
    optionType:       s.option_type,
    impliedVolatility: s.implied_volatility,
    history:          s.history ?? null,
  };
}

function mapOptionRaw(o) {
  return {
    listing_id:         o.listing_id,
    option_type:        o.option_type,
    settlement_date:    o.settlement_date,
    strike:             o.strike,
    price:              o.price,
    bid:                o.bid,
    ask:                o.ask,
    volume:             o.volume,
    open_interest:      o.open_interest,
    implied_volatility: o.implied_volatility,
  };
}

export function groupOptions(flatOptions = []) {
  const byDate = {};
  for (const o of flatOptions) {
    const d = o.settlement_date;
    if (!byDate[d]) byDate[d] = {};
    const strike = o.strike;
    if (!byDate[d][strike]) byDate[d][strike] = { strike };
    const side = o.option_type === 'CALL' ? 'call' : 'put';
    byDate[d][strike][side] = {
      last:   o.price,
      bid:    o.bid,
      ask:    o.ask,
      volume: o.volume,
      oi:     o.open_interest,
      theta:  o.implied_volatility ?? null,
    };
  }
  return Object.entries(byDate).map(([settlementDate, strikesMap]) => ({
    settlementDate,
    strikes: Object.values(strikesMap).sort((a, b) => a.strike - b.strike),
  }));
}

function mapHistory(history = []) {
  return history.map((h, i) => ({ t: h.date ?? i, v: h.price }));
}

function attachHistory(mapped, history) {
  if (!history || !history.length) return mapped;
  const pts = mapHistory(history);
  return {
    ...mapped,
    priceHistory: {
      '1D': pts.slice(-24),
      '1W': pts.slice(-7),
      '1M': pts.slice(-30),
      '1Y': pts.slice(-365),
      '5Y': pts.slice(-1825),
    },
  };
}


export const securitiesApi = {

  getStocks(params = {}) {
  return api.get('/listings/stocks', { params }).then(res => {
    const parsed = unpack(res);
    console.log('TYPE OF RES:', typeof res, 'TYPE OF RES.DATA:', typeof res?.data);
    console.log('PARSED:', parsed);
    console.log('LIST:', Array.isArray(parsed) ? parsed : parsed?.data);
    const list = Array.isArray(parsed) ? parsed : parsed?.data ?? [];
    return list.map(mapStock);
  });
},

  getFutures(params = {}) {
    return api.get('/listings/futures', { params }).then(res => {
      const parsed = unpack(res);
      const list = Array.isArray(parsed) ? parsed : parsed?.data ?? [];
      return list.map(mapFutures);
    });
  },

  getForex(params = {}) {
    return api.get('/listings/forex', { params }).then(res => {
      const parsed = unpack(res);
      const list = Array.isArray(parsed) ? parsed : parsed?.data ?? [];
      return list.map(mapForex);
    });
  },

  getOptions(params = {}) {
    return api.get('/listings/options', { params }).then(res => {
      const parsed = unpack(res);
      const list = Array.isArray(parsed) ? parsed : parsed?.data ?? [];
      return list.map(mapOptionBase);
    });
  },

  getStockById(id, daysBack = 1825) {
    return api.get(`/listings/stock/${id}`, { params: { days_back: daysBack } }).then(res => {
      const s = unpack(res);
      const mapped = mapStock(s);
      const withHistory = attachHistory(mapped, s.history);
      if (s.options && s.options.length) {
        withHistory.options = groupOptions(s.options.map(mapOptionRaw));
      }
      return withHistory;
    });
  },

  getFuturesById(id, daysBack = 1825) {
    return api.get(`/listings/futures/${id}`, { params: { days_back: daysBack } }).then(res => {
      const s = unpack(res);
      return attachHistory(mapFutures(s), s.history);
    });
  },

  getForexById(id, daysBack = 1825) {
    return api.get(`/listings/forex/${id}`, { params: { days_back: daysBack } }).then(res => {
      const s = unpack(res);
      return attachHistory(mapForex(s), s.history);
    });
  },

  getOptionById(id, daysBack = 1825) {
    return api.get(`/listings/options/${id}`, { params: { days_back: daysBack } }).then(res => {
      const s = unpack(res);
      return attachHistory(mapOptionBase(s), s.history);
    });
  },

  buy(data) {
  return api.post('/orders', {
    account_number: data.accountNumber,
    listing_id:     data.listingId,
    direction:      'BUY',
    order_type:     data.orderType ?? 'MARKET',
    quantity:       data.quantity,
    all_or_none:    false,
    margin:         false,
    limit_value:    data.limitValue ?? 0,
    stop_value:     data.stopValue  ?? 0,
  });
}
};