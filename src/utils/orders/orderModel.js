export const ORDER_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  DONE: 'DONE',
};

export const ORDER_TYPE = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  STOP: 'STOP',
  STOP_LIMIT: 'STOP_LIMIT',
};

export const ORDER_DIRECTION = {
  BUY: 'BUY',
  SELL: 'SELL',
};

export const USER_ROLE = {
  CLIENT: 'CLIENT',
  AGENT: 'AGENT',
  SUPERVISOR: 'SUPERVISOR',
  ADMIN: 'ADMIN',
};

export const APPROVAL_DECISION = {
  APPROVE: 'APPROVE',
  DECLINE: 'DECLINE',
};

export function normalizeOrder(raw) {
  return {
    id: raw.id,
    userId: raw.user_id ?? raw.userId,
    agentName: raw.agent_name ?? raw.agentName ?? '—',
    assetId: raw.asset_id ?? raw.assetId,
    assetName: raw.asset_name ?? raw.assetName ?? '—',
    assetType: raw.asset_type ?? raw.assetType ?? '—',
    orderType: raw.order_type ?? raw.orderType,
    quantity: raw.quantity ?? 0,
    contractSize: raw.contract_size ?? raw.contractSize ?? 1,
    pricePerUnit: raw.price_per_unit ?? raw.pricePerUnit ?? 0,
    direction: raw.direction,
    remainingPortions: raw.remaining_portions ?? raw.remainingPortions ?? 0,
    status: raw.status,
    approvedBy: raw.approved_by ?? raw.approvedBy ?? 'No need for approval',
    lastModification: raw.last_modification ?? raw.lastModification ?? null,
    settlementDate: raw.settlement_date ?? raw.settlementDate ?? null,
    afterHours: raw.after_hours ?? raw.afterHours ?? false,
    isDone: raw.is_done ?? raw.isDone ?? false,
    canApprove: false,
    canDecline: false,
    canCancel: false,
  };
}