// Bản tham chiếu (oracle) của phép quyết toán theo docs/nghiep-vu/04-tien-va-coc.md mục 5 và 6.
// Dùng để: (1) kiểm chính đặc tả bằng fuzz (bất biến có luôn đúng không); (2) làm kỳ vọng cho bài kiểm thử API
// khi backend có (so kết quả backend với oracle). Không thay thế mã backend.
//
// Mọi số là số nguyên đồng. Ném lỗi nếu đầu vào sai kiểu: phép tính tiền không được "tự sửa".

const int = (x, name) => {
  if (!Number.isSafeInteger(x)) throw new TypeError(`${name} phải là số nguyên đồng`);
  return x;
};

/**
 * Quyết toán đầy đủ (mục 5).
 * @param {{V:number, D:number, C:number, X_nb?:number, X_bm?:number}} p
 */
export function settle({ V, D, C, X_nb = 0, X_bm = 0 }) {
  int(V, 'V'); int(D, 'D'); int(C, 'C'); int(X_nb, 'X_nb'); int(X_bm, 'X_bm');
  if (V < 0 || D < 0 || C < 0 || X_nb < 0 || X_bm < 0) throw new RangeError('Đầu vào âm');
  const N = V - X_nb + X_bm;
  let C_nb, C_bm, T_bm, T_nb;
  if (N >= D + C) { C_nb = C; C_bm = 0; T_bm = N - D - C; T_nb = 0; }
  else if (N >= D) { C_nb = N - D; C_bm = C - (N - D); T_bm = 0; T_nb = 0; }
  else { C_nb = 0; C_bm = C; T_bm = 0; T_nb = D - N; }
  return { N, C_nb, C_bm, T_bm, T_nb };
}

/** Chi tạm khi có tranh chấp (mục 6, bước 2). */
export function provisionalRelease({ V_kt, D, C }) {
  int(V_kt, 'V_kt'); int(D, 'D'); int(C, 'C');
  return Math.min(C, Math.max(0, V_kt - D));
}

/**
 * Kết luận sau tranh chấp (mục 6, bước 4): chạy lại mục 5, trừ phần đã chi tạm.
 * Không bao giờ thu hồi từ ngân hàng: phần chi tạm quá tay thành T_nb.
 */
export function settleAfterDispute({ V, D, C, X_nb = 0, X_bm = 0, alreadyPaidFromDeposit }) {
  const f = settle({ V, D, C, X_nb, X_bm });
  const extra = f.C_nb - alreadyPaidFromDeposit;
  if (extra >= 0) {
    return { ...f, C_nb_more: extra, C_bm: C - f.C_nb, overPaid: 0 };
  }
  // chi tạm vượt: không đòi ngân hàng; người bán phải hoàn phần vượt ngoài app
  const over = -extra;
  return { ...f, C_nb_more: 0, C_bm: C - alreadyPaidFromDeposit, T_nb: f.T_nb + over, overPaid: over };
}

/** Kiểm bất biến của mục 5 (dùng trong fuzz và trong kiểm thử API). */
export function checkInvariants(inp, out) {
  const errs = [];
  const { D, C } = inp;
  if (out.C_nb + out.C_bm !== C) errs.push('C_nb + C_bm ≠ C');
  for (const k of ['C_nb', 'C_bm', 'T_bm', 'T_nb']) if (out[k] < 0) errs.push(`${k} âm`);
  if (out.T_bm > 0 && out.T_nb > 0) errs.push('cả hai bên cùng còn nợ');
  const sellerGets = D + out.C_nb + out.T_bm - out.T_nb;
  if (sellerGets !== out.N) errs.push(`người bán thực nhận ${sellerGets} ≠ N ${out.N}`);
  const buyerPays = D + C - out.C_bm + out.T_bm - out.T_nb;
  if (buyerPays !== out.N) errs.push(`bên mua chi ${buyerPays} ≠ N ${out.N}`);
  return errs;
}
