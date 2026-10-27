// Kiểm phép quyết toán của đặc tả 04 bằng ví dụ số của chính đặc tả và bằng fuzz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settle, provisionalRelease, settleAfterDispute, checkInvariants } from '../../lib/settlement.mjs';

test('Ví dụ 7.1 (TH-006) khớp đặc tả', () => {
  const o = settle({ V: 44_350_000, D: 32_200_000, C: 13_800_000 });
  assert.deepEqual([o.C_nb, o.C_bm, o.T_bm, o.T_nb], [12_150_000, 1_650_000, 0, 0]);
});

test('Ví dụ 7.3 (TH-024) trả lại nhiều khớp đặc tả', () => {
  const o = settle({ V: 29_100_000, D: 32_200_000, C: 13_800_000 });
  assert.deepEqual([o.C_nb, o.C_bm, o.T_nb], [0, 13_800_000, 3_100_000]);
});

test('Ví dụ 7.6 giao vượt và 7.7 thiếu có phạt khớp đặc tả', () => {
  assert.equal(settle({ V: 48_300_000, D: 32_200_000, C: 13_800_000 }).T_bm, 2_300_000);
  const o = settle({ V: 42_550_000, D: 32_200_000, C: 13_800_000, X_nb: 1_035_000 });
  assert.deepEqual([o.N, o.C_nb, o.C_bm], [41_515_000, 9_315_000, 4_485_000]);
});

test('Ví dụ 7.12 kết quả A: chi tạm vượt thành T_nb 280.000, không thu hồi ngân hàng', () => {
  const tam = provisionalRelease({ V_kt: 42_050_000, D: 32_200_000, C: 13_800_000 });
  assert.equal(tam, 9_850_000);
  const a = settleAfterDispute({ V: 42_050_000, D: 32_200_000, C: 13_800_000, X_nb: 280_000, alreadyPaidFromDeposit: tam });
  assert.equal(a.C_bm, 3_950_000);
  assert.equal(a.T_nb, 280_000);
  assert.equal(a.overPaid, 280_000);
});

test('Ví dụ 7.12 kết quả B: chi thêm 2.300.000', () => {
  const b = settleAfterDispute({ V: 44_350_000, D: 32_200_000, C: 13_800_000, alreadyPaidFromDeposit: 9_850_000 });
  assert.equal(b.C_nb_more, 2_300_000);
  assert.equal(b.C_bm, 1_650_000);
});

// Bộ sinh ngẫu nhiên có hạt giống để tái lập.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

test('Fuzz 20.000 ca: bất biến mục 5 luôn đúng với mọi V, D, C, X', () => {
  const r = rng(20261025);
  for (let i = 0; i < 20000; i++) {
    const G = Math.floor(r() * 500_000_000);
    const C = Math.round((G * 0.3) / 1000) * 1000;
    const D = Math.floor(r() * (G + 1));
    const V = Math.floor(r() * (G * 1.1 + 1));
    const X_nb = r() < 0.3 ? Math.floor(r() * (C + 1)) : 0;
    const X_bm = r() < 0.1 ? Math.floor(r() * 2_000_000) : 0;
    const inp = { V, D, C, X_nb, X_bm };
    const out = settle(inp);
    const errs = checkInvariants(inp, out);
    assert.deepEqual(errs, [], JSON.stringify({ inp, out }));
  }
});

test('Fuzz: chi tạm + kết luận không bao giờ làm tổng chi từ cọc vượt C, không đòi lại ngân hàng', () => {
  const r = rng(7);
  let overPaidCases = 0;
  for (let i = 0; i < 20000; i++) {
    const C = 1000 * Math.floor(r() * 100_000);
    const D = Math.floor(r() * 300_000_000);
    const V_kt = Math.floor(r() * 300_000_000);
    const disputed = Math.floor(r() * 50_000_000);
    const sellerWins = r() < 0.5;
    const X_nb = sellerWins ? 0 : Math.floor(r() * 3_000_000); // phí kiểm định khi người bán sai
    const V = sellerWins ? V_kt + disputed : V_kt;
    const tam = provisionalRelease({ V_kt, D, C });
    const fin = settleAfterDispute({ V, D, C, X_nb, alreadyPaidFromDeposit: tam });
    assert.ok(tam + fin.C_nb_more + fin.C_bm === C, 'tổng chi + hoàn = C');
    assert.ok(fin.C_nb_more >= 0 && fin.C_bm >= 0);
    if (fin.overPaid > 0) overPaidCases++;
  }
  // Phát hiện về đặc tả: khi người bán thua tranh chấp và chịu phí kiểm định (X_nb), chi tạm có thể vượt,
  // phần vượt thành nợ ngoài app của người bán (rủi ro tín dụng cho bên mua). Xem 06-loi-tim-thay-trong-thiet-ke.md.
  assert.ok(overPaidCases > 0, 'mong đợi có ca chi tạm vượt khi X_nb > 0');
});

test('Đầu vào số thực hoặc âm bị từ chối (không tự làm tròn tiền)', () => {
  assert.throws(() => settle({ V: 1.5, D: 0, C: 0 }));
  assert.throws(() => settle({ V: -1, D: 0, C: 0 }));
});
