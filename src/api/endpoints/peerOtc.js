import { interbankApi as api } from '../client';

export const OUR_ROUTING_NUMBER = 444;

export function getBankName(routingNumber) {
  return routingNumber === OUR_ROUTING_NUMBER ? 'Banka 4' : `Banka ${routingNumber}`;
}

export function isSelfPeer(foreignBankId, user) {
  if (!foreignBankId || !user) return false;
  const myId = user?.identity_type === 'client'
    ? (user?.client_id ?? user?.id)
    : (user?.employee_id ?? user?.id);
  return foreignBankId.routingNumber === OUR_ROUTING_NUMBER
    && String(foreignBankId.id) === String(myId);
}

export function isMyTurnPeer(offer, _user) {
  return offer?.lastModifiedBy?.routingNumber !== OUR_ROUTING_NUMBER;
}

export function extractPeerName(res) {
  return res?.displayName ?? null;
}

export function getPeerCounterparty(offer) {
  const amBuyer = offer?.buyerId?.routingNumber === OUR_ROUTING_NUMBER;
  return {
    amBuyer,
    role: amBuyer ? 'Prodavac' : 'Kupac',
    foreignBankId: amBuyer ? offer?.sellerId : offer?.buyerId,
  };
}

export function peerCounterpartyLabel(role, info, foreignBankId) {
  const bank = info?.bankDisplayName ?? getBankName(foreignBankId?.routingNumber);
  const name = extractPeerName(info);
  return name ? `${role} — ${name} (${bank})` : `${role} (${bank})`;
}

export const peerOtcApi = {
  getPublicStocks:     ()              => api.get('/peer-otc/public-stocks'),
  getMyNegotiations:   ()              => api.get('/peer-otc/negotiations'),
  createNegotiation:   (payload)       => api.post('/peer-otc/negotiations', payload),
  counterNegotiation:  (rn, id, body)  => api.put(`/peer-otc/negotiations/${rn}/${id}/counter`, body),
  acceptNegotiation:   (rn, id)        => api.post(`/peer-otc/negotiations/${rn}/${id}/accept`),
  withdrawNegotiation: (rn, id)        => api.delete(`/peer-otc/negotiations/${rn}/${id}`),
  getMyContracts:      ()              => api.get('/peer-otc/contracts'),
  exerciseContract:    (rn, id, acct)  => api.post(`/peer-otc/contracts/${rn}/${id}/exercise`, { accountNumber: acct }),
  getPeerUser:         (rn, id)        => api.get(`/peer-otc/user/${rn}/${id}`),
};
