//! Công thức tiền. Mọi số là số nguyên (đồng, gam); không dùng số thực.

/// Chia làm tròn nửa lên. `b` phải dương.
pub fn chia_nua_len(a: i128, b: i128) -> i128 {
    assert!(b > 0, "mẫu số phải dương");
    if a < 0 {
        return -chia_nua_len(-a, b);
    }
    (a * 2 + b) / (2 * b)
}

/// Tiền một dòng = làm tròn nửa lên (gam × giá đồng/kg ÷ 1.000).
pub fn tien_dong(gam: i128, gia_dong_kg: i128) -> i128 {
    chia_nua_len(gam * gia_dong_kg, 1000)
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct QuyetToan {
    /// Giá trị bên mua thực phải trả cho hàng đã nhận.
    pub n: i128,
    /// Phần cọc ngân hàng chi cho người bán.
    pub coc_ve_nguoi_ban: i128,
    /// Phần cọc ngân hàng hoàn cho bên mua.
    pub coc_hoan_ben_mua: i128,
    /// Bên mua còn phải trả thêm.
    pub ben_mua_tra_them: i128,
    /// Người bán phải hoàn lại.
    pub nguoi_ban_hoan: i128,
}

/// Quyết toán một đơn. `v`: giá trị hàng nghiệm thu; `d`: bên mua đã trả thẳng; `c`: cọc đang giữ;
/// `x_nb`, `x_bm`: khoản người bán / bên mua chịu thêm. Trả `None` khi có đầu vào âm.
pub fn quyet_toan(v: i128, d: i128, c: i128, x_nb: i128, x_bm: i128) -> Option<QuyetToan> {
    if v < 0 || d < 0 || c < 0 || x_nb < 0 || x_bm < 0 {
        return None;
    }
    let n = v - x_nb + x_bm;
    Some(if n >= d + c {
        QuyetToan { n, coc_ve_nguoi_ban: c, coc_hoan_ben_mua: 0, ben_mua_tra_them: n - d - c, nguoi_ban_hoan: 0 }
    } else if n >= d {
        QuyetToan { n, coc_ve_nguoi_ban: n - d, coc_hoan_ben_mua: c - (n - d), ben_mua_tra_them: 0, nguoi_ban_hoan: 0 }
    } else {
        QuyetToan { n, coc_ve_nguoi_ban: 0, coc_hoan_ben_mua: c, ben_mua_tra_them: 0, nguoi_ban_hoan: d - n }
    })
}

#[cfg(test)]
mod kiem {
    use super::*;

    #[test]
    fn lam_tron_nua_len() {
        assert_eq!(chia_nua_len(5, 10), 1);
        assert_eq!(chia_nua_len(4, 10), 0);
        assert_eq!(chia_nua_len(-5, 10), -1);
        assert_eq!(tien_dong(100_000, 69_000), 6_900_000);
        assert_eq!(tien_dong(1_500, 333), 500); // 499,5 → 500
    }

    // Số thật của các đơn đã chạy trên host ngày 06/11/2026
    #[test]
    fn can_du_coc_ve_het_nguoi_ban() {
        // HĐ-3005: hàng 6.900.000, đã trả thẳng 4.830.000, cọc 2.070.000
        let q = quyet_toan(6_900_000, 4_830_000, 2_070_000, 0, 0).unwrap();
        assert_eq!((q.coc_ve_nguoi_ban, q.coc_hoan_ben_mua, q.ben_mua_tra_them, q.nguoi_ban_hoan), (2_070_000, 0, 0, 0));
    }

    #[test]
    fn hang_it_hon_coc_thi_hoan_phan_thua() {
        // HĐ-3008: hàng đạt 1.764.000, chưa trả thẳng, cọc 2.646.000 → hoàn 882.000
        let q = quyet_toan(1_764_000, 0, 2_646_000, 0, 0).unwrap();
        assert_eq!((q.coc_ve_nguoi_ban, q.coc_hoan_ben_mua), (1_764_000, 882_000));
    }

    #[test]
    fn tra_thua_thi_nguoi_ban_hoan_va_coc_ve_ben_mua() {
        let q = quyet_toan(1_000_000, 1_500_000, 300_000, 0, 0).unwrap();
        assert_eq!((q.coc_ve_nguoi_ban, q.coc_hoan_ben_mua, q.nguoi_ban_hoan), (0, 300_000, 500_000));
    }

    #[test]
    fn tien_khong_sinh_ra_hay_mat_di() {
        // Với mọi đầu vào: cọc chia đủ, và người bán nhận đúng n
        for (v, d, c) in [(0, 0, 0), (7, 3, 2), (5, 3, 9), (2, 9, 4), (10, 4, 6), (11, 4, 6)] {
            let q = quyet_toan(v, d, c, 0, 0).unwrap();
            assert_eq!(q.coc_ve_nguoi_ban + q.coc_hoan_ben_mua, c);
            assert_eq!(d + q.coc_ve_nguoi_ban + q.ben_mua_tra_them - q.nguoi_ban_hoan, q.n);
        }
    }

    #[test]
    fn dau_vao_am_bi_tu_choi() {
        assert_eq!(quyet_toan(-1, 0, 0, 0, 0), None);
    }
}
