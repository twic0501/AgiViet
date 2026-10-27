// Luật giám sát giao dịch bất thường (chạy định kỳ trên dữ liệu đã chốt; kết quả là CỜ cho vận hành xem,
// không tự khóa tiền trừ luật ghi rõ). Ngưỡng là đề xuất ban đầu, cần chỉnh theo dữ liệu thật.
//
// Luật:
//  R1 giao dịch vòng: A→B→A hoặc A→B→C→A trong 30 ngày với giá trị tương tự (rửa tiền, thổi uy tín, kéo giá tham khảo)
//  R2 một số tài khoản ngân hàng (băm) dùng cho nhiều tổ chức
//  R3 cọc rồi hủy hoàn cọc lặp lại (đưa tiền vào rồi rút ra hợp thức)
//  R4 hoàn tiền tới tài khoản khác tài khoản nguồn đã nộp (phải không bao giờ xảy ra)
//  R5 cặp mua–bán lặp lại giá bất thường (< 60% giá tham khảo), dấu hiệu khai thấp né phí/cọc
//  R6 đổi tài khoản nhận tiền trong 72 giờ trước một lệnh chi
//  R7 chia nhỏ: nhiều đơn của cùng cặp sát dưới hạn mức duyệt/ngưỡng kiểm định trong 7 ngày
//  R8 bên mua báo "đã trả thẳng" mà người bán không xác nhận, lặp lại

const DAY = 86400;

export function r1Cycles(trades, { now, windowSec = 30 * DAY, minVnd = 10_000_000, tolerance = 0.2 } = {}) {
  // trades: [{ buyer, seller, amount_vnd, at }]
  const recent = trades.filter((t) => now - t.at <= windowSec && t.amount_vnd >= minVnd);
  const edges = new Map(); // from(seller paid by buyer): tiền đi buyer -> seller
  for (const t of recent) {
    const k = `${t.buyer}>${t.seller}`;
    edges.set(k, (edges.get(k) || 0) + t.amount_vnd);
  }
  const adj = new Map();
  for (const k of edges.keys()) {
    const [a, b] = k.split('>');
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  }
  const flags = [], seen = new Set();
  const similar = (vals) => Math.min(...vals) / Math.max(...vals) >= 1 - tolerance;
  for (const a of adj.keys()) {
    for (const b of adj.get(a) || []) {
      if (b === a) continue;
      if ((adj.get(b) || []).includes(a)) {
        const key = [a, b].sort().join('|');
        const vals = [edges.get(`${a}>${b}`), edges.get(`${b}>${a}`)];
        if (!seen.has(key) && similar(vals)) { seen.add(key); flags.push({ rule: 'R1', orgs: [a, b].sort(), amounts: vals }); }
      }
      for (const c of adj.get(b) || []) {
        if (c === a || c === b) continue;
        if ((adj.get(c) || []).includes(a)) {
          const key = [a, b, c].sort().join('|');
          const vals = [edges.get(`${a}>${b}`), edges.get(`${b}>${c}`), edges.get(`${c}>${a}`)];
          if (!seen.has(key) && similar(vals)) { seen.add(key); flags.push({ rule: 'R1', orgs: [a, b, c].sort(), amounts: vals }); }
        }
      }
    }
  }
  return flags;
}

export function r2SharedAccounts(accounts) {
  // accounts: [{ org, account_hash, status }]
  const by = new Map();
  for (const a of accounts) {
    if (!by.has(a.account_hash)) by.set(a.account_hash, new Set());
    by.get(a.account_hash).add(a.org);
  }
  return [...by].filter(([, s]) => s.size > 1).map(([h, s]) => ({ rule: 'R2', account_hash: h, orgs: [...s].sort() }));
}

export function r3DepositChurn(events, { now, windowSec = 14 * DAY, threshold = 3 } = {}) {
  // events: [{ buyer, kind:'deposit_refunded_on_cancel', at }]
  const cnt = new Map();
  for (const e of events) if (e.kind === 'deposit_refunded_on_cancel' && now - e.at <= windowSec) cnt.set(e.buyer, (cnt.get(e.buyer) || 0) + 1);
  return [...cnt].filter(([, n]) => n >= threshold).map(([buyer, n]) => ({ rule: 'R3', buyer, count: n }));
}

export function r4RefundDestination(refunds) {
  // refunds: [{ id, source_account_hash, destination_account_hash }]
  return refunds.filter((r) => r.source_account_hash !== r.destination_account_hash).map((r) => ({ rule: 'R4', refund: r.id, severity: 'P0' }));
}

export function r5AbnormalPricePairs(orders, { now, windowSec = 90 * DAY, threshold = 2 } = {}) {
  // orders: [{ buyer, seller, price_ratio_bps (giá/giá tham khảo), at }]
  const cnt = new Map();
  for (const o of orders) if (now - o.at <= windowSec && o.price_ratio_bps !== null && o.price_ratio_bps < 6000) {
    const k = `${o.buyer}|${o.seller}`;
    cnt.set(k, (cnt.get(k) || 0) + 1);
  }
  return [...cnt].filter(([, n]) => n >= threshold).map(([k, n]) => ({ rule: 'R5', pair: k.split('|'), count: n }));
}

export function r6PayoutAfterChange(payouts, accountChanges, { windowSec = 3 * DAY } = {}) {
  // payouts: [{ id, org, at }]; accountChanges: [{ org, activated_at }]
  return payouts.filter((p) => accountChanges.some((c) => c.org === p.org && p.at >= c.activated_at && p.at - c.activated_at < windowSec))
    .map((p) => ({ rule: 'R6', payout: p.id, org: p.org }));
}

export function r7Structuring(orders, { now, limitVnd, windowSec = 7 * DAY, band = 0.1, threshold = 3 } = {}) {
  // orders: [{ buyer, seller, amount_vnd, at }]; limitVnd: hạn mức duyệt chi/ngưỡng kiểm định
  const cnt = new Map();
  for (const o of orders) if (now - o.at <= windowSec && o.amount_vnd < limitVnd && o.amount_vnd >= limitVnd * (1 - band)) {
    const k = `${o.buyer}|${o.seller}`;
    cnt.set(k, (cnt.get(k) || 0) + 1);
  }
  return [...cnt].filter(([, n]) => n >= threshold).map(([k, n]) => ({ rule: 'R7', pair: k.split('|'), count: n }));
}

export function r8UnconfirmedDirectPay(claims, { now, windowSec = 30 * DAY, threshold = 2 } = {}) {
  // claims: [{ buyer, status: 'buyer_reported'|'confirmed'|'denied'|'partial', at }]
  const cnt = new Map();
  for (const c of claims) if (now - c.at <= windowSec && (c.status === 'denied' || c.status === 'buyer_reported_expired')) cnt.set(c.buyer, (cnt.get(c.buyer) || 0) + 1);
  return [...cnt].filter(([, n]) => n >= threshold).map(([buyer, n]) => ({ rule: 'R8', buyer, count: n }));
}
