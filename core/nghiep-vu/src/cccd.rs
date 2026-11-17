//! Đọc mã QR trên CCCD gắn chip và tự kiểm tính nhất quán.
//! Mã có dạng `số CCCD|số CMND cũ|họ tên|ngày sinh|giới tính|địa chỉ|ngày cấp`, ngày dạng ddmmyyyy.
//! Chỉ chứng minh người nộp cầm được thẻ; không thay việc đọc chip hay so khuôn mặt.

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct TheCccd {
    pub so: String,
    pub ho_ten: String,
    /// yyyy-mm-dd
    pub ngay_sinh: String,
    pub nu: bool,
    /// yyyy-mm-dd
    pub ngay_cap: String,
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum LoiCccd {
    ThieuTruong,
    SoKhongDu12ChuSo,
    NgaySai,
    GioiTinhSai,
    ThieuHoTen,
    SoKhongKhopNgaySinhGioiTinh,
    NgayCapKhongHopLy,
    ChuaDu18Tuoi,
}

impl LoiCccd {
    pub fn cau(self) -> &'static str {
        match self {
            Self::ThieuTruong => "Mã QR không phải của CCCD gắn chip: thiếu trường.",
            Self::SoKhongDu12ChuSo => "Mã QR không phải của CCCD gắn chip: số CCCD phải đủ 12 chữ số.",
            Self::NgaySai => "Mã QR không phải của CCCD gắn chip: ngày sinh hoặc ngày cấp sai.",
            Self::GioiTinhSai => "Mã QR không phải của CCCD gắn chip: giới tính sai.",
            Self::ThieuHoTen => "Mã QR không phải của CCCD gắn chip: thiếu họ tên.",
            Self::SoKhongKhopNgaySinhGioiTinh => "Mã QR không phải của CCCD gắn chip: số CCCD không khớp ngày sinh và giới tính.",
            Self::NgayCapKhongHopLy => "Mã QR không phải của CCCD gắn chip: ngày cấp không hợp lý.",
            Self::ChuaDu18Tuoi => "Người đứng tên giao dịch phải đủ 18 tuổi.",
        }
    }
}

/// ddmmyyyy → (năm, tháng, ngày) nếu là ngày có thật.
fn ngay(s: &str) -> Option<(u32, u32, u32)> {
    if s.len() != 8 || !s.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let (d, m, y): (u32, u32, u32) = (s[0..2].parse().ok()?, s[2..4].parse().ok()?, s[4..8].parse().ok()?);
    let nhuan = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
    let so_ngay = match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if nhuan => 29,
        2 => 28,
        _ => return None,
    };
    (d >= 1 && d <= so_ngay).then_some((y, m, d))
}

/// `hom_nay` là (năm, tháng, ngày) theo đồng hồ của bên gọi, để hàm này không phụ thuộc đồng hồ.
pub fn doc_qr_cccd(chuoi: &str, hom_nay: (u32, u32, u32)) -> Result<TheCccd, LoiCccd> {
    let p: Vec<&str> = chuoi.trim().split('|').map(str::trim).collect();
    if p.len() < 7 {
        return Err(LoiCccd::ThieuTruong);
    }
    let (so, ho_ten, gt) = (p[0], p[2], p[4]);
    if so.len() != 12 || !so.bytes().all(|b| b.is_ascii_digit()) {
        return Err(LoiCccd::SoKhongDu12ChuSo);
    }
    let (sinh, cap) = (ngay(p[3]).ok_or(LoiCccd::NgaySai)?, ngay(p[6]).ok_or(LoiCccd::NgaySai)?);
    let nu = match gt {
        "Nam" => false,
        "Nữ" => true,
        _ => return Err(LoiCccd::GioiTinhSai),
    };
    if ho_ten.chars().count() < 2 {
        return Err(LoiCccd::ThieuHoTen);
    }
    // Chữ số thứ 4 mang thế kỷ sinh + giới tính, chữ số 5-6 là hai số cuối năm sinh
    let ma = (so.as_bytes()[3] - b'0') as i64;
    let mong = (sinh.0 as i64 / 100 - 19) * 2 + nu as i64;
    if ma != mong || so[4..6] != format!("{:02}", sinh.0 % 100) {
        return Err(LoiCccd::SoKhongKhopNgaySinhGioiTinh);
    }
    if cap > hom_nay || cap < sinh {
        return Err(LoiCccd::NgayCapKhongHopLy);
    }
    if (sinh.0 + 18, sinh.1, sinh.2) > hom_nay {
        return Err(LoiCccd::ChuaDu18Tuoi);
    }
    let iso = |(y, m, d): (u32, u32, u32)| format!("{y:04}-{m:02}-{d:02}");
    Ok(TheCccd { so: so.to_string(), ho_ten: ho_ten.to_string(), ngay_sinh: iso(sinh), nu, ngay_cap: iso(cap) })
}

#[cfg(test)]
mod kiem {
    use super::*;
    const NAY: (u32, u32, u32) = (2026, 11, 17);

    // Số thẻ dưới đây là số bịa; cùng bộ ca với backend/test/kiem-dinh-danh.ts
    fn qr(so: &str, ns: &str, gt: &str, nc: &str) -> String {
        format!("{so}|123456789|Nguyễn Văn An|{ns}|{gt}|Ấp 1, Xã A, Huyện B, Tỉnh C|{nc}")
    }

    #[test]
    fn the_dung() {
        let t = doc_qr_cccd(&qr("079090001234", "15031990", "Nam", "10052021"), NAY).unwrap();
        assert_eq!((t.ngay_sinh.as_str(), t.ngay_cap.as_str(), t.nu, t.ho_ten.as_str()), ("1990-03-15", "2021-05-10", false, "Nguyễn Văn An"));
        assert!(doc_qr_cccd(&qr("079305001234", "02012005", "Nữ", "10052021"), NAY).unwrap().nu);
    }

    #[test]
    fn the_sai() {
        let ca = [
            ("không phải mã thẻ".to_string(), LoiCccd::ThieuTruong),
            (qr("07909000123", "15031990", "Nam", "10052021"), LoiCccd::SoKhongDu12ChuSo),
            (qr("079190001234", "15031990", "Nam", "10052021"), LoiCccd::SoKhongKhopNgaySinhGioiTinh),
            (qr("079091001234", "15031990", "Nam", "10052021"), LoiCccd::SoKhongKhopNgaySinhGioiTinh),
            (qr("079090001234", "31021990", "Nam", "10052021"), LoiCccd::NgaySai),
            (qr("079090001234", "15031990", "Nam", "10052031"), LoiCccd::NgayCapKhongHopLy),
            (qr("079210001234", "20112010", "Nam", "10052021"), LoiCccd::ChuaDu18Tuoi),
            (qr("079090001234", "15031990", "Khác", "10052021"), LoiCccd::GioiTinhSai),
        ];
        for (c, l) in ca {
            assert_eq!(doc_qr_cccd(&c, NAY), Err(l), "{c}");
        }
    }

    #[test]
    fn dung_18_tuoi_hom_nay_thi_duoc() {
        assert!(doc_qr_cccd(&qr("079208001234", "17112008", "Nam", "10052024"), NAY).is_ok());
        assert_eq!(doc_qr_cccd(&qr("079208001234", "18112008", "Nam", "10052024"), NAY), Err(LoiCccd::ChuaDu18Tuoi));
    }
}
