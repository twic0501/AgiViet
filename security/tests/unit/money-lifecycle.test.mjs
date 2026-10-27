// Kiểm các tính chất an toàn của vòng đời tiền (dạng đồ thị).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MACHINES, canTransition } from '../../lib/money-lifecycle.mjs';

const entries = Object.entries(MACHINES);

function states(m) {
  const s = new Set([m.initial]);
  for (const x of m.transitions) { s.add(x.from); s.add(x.to); }
  return s;
}

function reachableFrom(m, start) {
  const seen = new Set([start]);
  const q = [start];
  while (q.length) {
    const cur = q.shift();
    for (const x of m.transitions) if (x.from === cur && !seen.has(x.to)) { seen.add(x.to); q.push(x.to); }
  }
  return seen;
}

test('Người giúp (NG) không xuất hiện ở bất kỳ bước tiền nào', () => {
  for (const [name, m] of entries) for (const x of m.transitions) assert.ok(!x.by.includes('NG'), `${name}: ${x.from}->${x.to}`);
  assert.equal(canTransition('tra_thang', 'den_han', 'da_nhan_du', 'NG').reason, 'nguoi_giup_khong_co_buoc_tien');
});

test('Bên trả tiền không bao giờ tự ghi được sự thật tiền (chỉ bên nhận, ngân hàng, hoặc VH hai người)', () => {
  const payer = { nop_coc: 'BM', tra_thang: 'BM', lenh_ngan_hang: null, coc: null, phi: null, quyet_toan: null };
  for (const [name, who] of Object.entries(payer)) {
    if (!who) continue;
    for (const x of MACHINES[name].transitions) if (x.moneyFact) assert.ok(!x.by.includes(who), `${name}: ${x.from}->${x.to} cho phép bên trả`);
  }
  // cong_no: bên nào xác nhận phải là bên nhận; bảng cho phép NB|BM vì nghĩa vụ có hai chiều — backend phải kiểm thêm
  // "người xác nhận thuộc tổ chức nhận" (xem 04-checklist mục BE-TIEN-07).
});

test('Sự thật tiền trong cọc/lệnh chỉ đến từ hạng A, hoặc hạng C qua VH2', () => {
  for (const name of ['nop_coc', 'lenh_ngan_hang', 'coc', 'phi']) {
    for (const x of MACHINES[name].transitions) {
      if (!x.moneyFact) continue;
      assert.ok(x.evidence === 'A' || (x.evidence === 'C' && x.by.every((a) => a === 'VH2')), `${name}: ${x.from}->${x.to}`);
    }
  }
});

test('L6: hẹn giờ/hệ thống không bao giờ tạo sự thật tiền nếu không có dữ liệu ngân hàng hạng A', () => {
  for (const [name, m] of entries) for (const x of m.transitions) {
    if (x.moneyFact && x.by.includes('HT')) assert.equal(x.evidence, 'A', `${name}: ${x.from}->${x.to}`);
  }
  for (const name of ['tra_thang', 'cong_no']) {
    for (const x of MACHINES[name].transitions) assert.ok(!(x.moneyFact && x.by.includes('HT')), `${name}: ${x.from}->${x.to} hệ thống tự cộng tiền`);
  }
});

test('Mọi sự thật tiền đều ghi hạng bằng chứng (không có "-")', () => {
  for (const [name, m] of entries) for (const x of m.transitions) {
    if (x.moneyFact) assert.notEqual(x.evidence, '-', `${name}: ${x.from}->${x.to}`);
  }
});

test('Hạng B (bên nhận tự xác nhận) chỉ dùng cho tiền ngoài tài khoản đảm bảo', () => {
  for (const name of ['nop_coc', 'lenh_ngan_hang', 'coc', 'phi', 'quyet_toan']) {
    for (const x of MACHINES[name].transitions) assert.notEqual(x.evidence, 'B', `${name}: ${x.from}->${x.to}`);
  }
});

test('Mọi bước thủ công của vận hành có hệ quả tiền phải là VH2 với bằng chứng hạng C', () => {
  for (const [name, m] of entries) for (const x of m.transitions) {
    if (x.by.includes('VH2')) assert.equal(x.evidence, 'C', `${name}: ${x.from}->${x.to}`);
  }
});

test('Không trạng thái nào chờ vô hạn: mọi trạng thái không cuối có lối ra và có ghi hạn/SLA', () => {
  for (const [name, m] of entries) {
    for (const s of states(m)) {
      if (m.terminal.includes(s)) {
        assert.ok(!m.transitions.some((x) => x.from === s), `${name}: trạng thái cuối ${s} còn lối ra`);
        continue;
      }
      assert.ok(m.transitions.some((x) => x.from === s), `${name}: ${s} không có lối ra`);
      assert.ok(m.waits[s], `${name}: ${s} không ghi hạn/SLA`);
    }
  }
});

test('Mọi trạng thái đi tới được một trạng thái cuối', () => {
  for (const [name, m] of entries) for (const s of states(m)) {
    const r = reachableFrom(m, s);
    assert.ok(m.terminal.some((t) => r.has(t)), `${name}: từ ${s} không tới trạng thái cuối`);
  }
});

test('Điểm không quay lại: từ trạng thái pnr không quay về trạng thái đứng trước nó', () => {
  for (const [name, m] of entries) {
    for (const p of m.pnr) {
      const before = new Set([...states(m)].filter((s) => s !== p && reachableFrom(m, s).has(p) && !reachableFrom(m, p).has(s)));
      const after = reachableFrom(m, p);
      for (const s of before) assert.ok(!after.has(s), `${name}: từ ${p} quay về ${s}`);
      // và không có chu trình đi qua p
      for (const x of m.transitions) if (x.from !== p && after.has(x.from)) assert.notEqual(x.to, p, `${name}: chu trình qua ${p}`);
    }
  }
});

test('Lệnh đã gửi không có đường "hủy"', () => {
  const m = MACHINES.lenh_ngan_hang;
  const after = reachableFrom(m, 'da_gui');
  assert.ok(!after.has('da_huy_truoc_gui'));
});
