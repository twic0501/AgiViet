SELECT set_config('app.nap_du_lieu_cu','on',false); -- dữ liệu ảo cũ có thương lái, người giúp (bản 23 không tạo mới)
-- Tự sinh từ du-lieu-ao.json bằng db/tools/tao-seed.py. Không sửa tay.
DO $seed$ BEGIN
IF EXISTS(SELECT 1 FROM ops.seed_sources WHERE source_key='du-lieu-ao.json') THEN
 IF NOT EXISTS(SELECT 1 FROM ops.seed_sources WHERE source_key='du-lieu-ao.json' AND sha256=decode('b3f13865269747601b70aa80a3f79d3d33d8a175a4cb28a0d8c5e3d731025c45','hex')) THEN RAISE EXCEPTION 'Nguồn seed đổi: dùng DB thử mới'; END IF;
 RETURN; END IF;
ALTER TABLE core.membership_role_grants DISABLE TRIGGER a_privilege;
ALTER TABLE core.membership_role_grants DISABLE TRIGGER z_notify_grant;
PERFORM set_config('app.allow_any_initial','on',true);
PERFORM set_config('app.actor_kind','system',true);
PERFORM set_config('app.test_time','2026-11-02T08:00:00+07:00',true);
INSERT INTO ops.seed_sources(source_key,sha256,payload) VALUES('du-lieu-ao.json',decode('b3f13865269747601b70aa80a3f79d3d33d8a175a4cb28a0d8c5e3d731025c45','hex'),'{
  "meta": {
    "ten": "Dữ liệu ảo AgiViet production v2",
    "phien_ban": "2026-10-25",
    "dong_ho_nen": "2026-11-02T08:00:00+07:00",
    "ghi_chu": "Mọi tên, mã số, tài khoản là hư cấu. Tiền là số nguyên đồng. Mỗi tình huống nạp lại bộ nền này rồi thêm tiền điều kiện."
  },
  "chinh_sach": {
    "ty_le_coc": 0.3,
    "ty_le_gia_tinh_coc": 0.7,
    "nguong_gia_thap": 0.8,
    "nguong_gia_bat_thuong": 0.6,
    "nguong_gia_cao": 1.3,
    "so_don_tham_khao_toi_thieu": 3,
    "so_cap_toi_thieu": 2,
    "loi_cho_phep_mac_dinh": 0.05,
    "dung_sai_luong_mac_dinh": 0.05,
    "phat_thieu_luong": {
      "bat_kha_khang": 0,
      "bao_truoc_3_ngay": 0.1,
      "bao_duoi_3_ngay": 0.5,
      "khong_bao": 1.0
    },
    "nguong_mo_lien_lac_dong": 3000000,
    "nguong_mo_lien_lac_don_hoan_tat": 2,
    "han_gio": {
      "tra_loi_loi_chao": 24,
      "tra_loi_loi_chao_vua": [
        6,
        12
      ],
      "giu_luong": 24,
      "nguoi_ban_ky": 24,
      "coc": 48,
      "coc_hang_tuoi": 12,
      "tra_loi_de_nghi": 24,
      "xac_nhan_tra_thang": 48,
      "nb_xac_nhan_tai_cho_phut": 60,
      "nb_xac_nhan_tai_kho": 24,
      "kiem_den": 2,
      "gia_han_kiem_den": 2,
      "nghiem_thu_giao_gan_tuoi": 12,
      "nghiem_thu_giao_gan_khac": 24,
      "can_lai": 24,
      "kiem_dinh": 48,
      "thoa_thuan_khong_ket_luan_ngay": 14,
      "cong_no": 72,
      "hien_thi_lo_ngay": 14,
      "ban_gap_ngay": 3,
      "kem_loai_khong_ai_hoi": 24,
      "doi_tai_khoan": 24,
      "doi_tai_khoan_sau_khoi_phuc": 72,
      "khung_chot_lan_goi": 24
    },
    "otp_thu": {
      "dung": "123456",
      "sai": "000000"
    }
  },
  "goi": [
    {
      "ma": "mien_phi",
      "gia_thang": 0,
      "phi_don_dau": 0.01,
      "phi_don_sau": 0.005,
      "san": 20000,
      "tran": 2000000,
      "thanh_vien": 1,
      "nhu_cau_thang": 5,
      "ket_noi_moi_thang": 5
    },
    {
      "ma": "thu_mua",
      "gia_thang": 1500000,
      "phi_don_dau": 0.003,
      "phi_don_sau": 0.0,
      "san": 20000,
      "tran": 1500000,
      "thanh_vien": 5,
      "nhu_cau_thang": 30,
      "ket_noi_moi_thang": 50
    },
    {
      "ma": "doanh_nghiep",
      "gia_thang": 4000000,
      "ky": "nam",
      "phi_don_dau": 0.002,
      "phi_don_sau": 0.002,
      "san": 20000,
      "tran": 3000000,
      "thanh_vien": 10,
      "nhu_cau_thang": 100,
      "ket_noi_moi_thang": 200
    },
    {
      "ma": "bep",
      "gia_thang": 490000,
      "phi_don_dau": 0.0,
      "phi_don_sau": 0.0,
      "san": 0,
      "tran": 0,
      "thanh_vien": 2,
      "nhu_cau_thang": 10,
      "ket_noi_moi_thang": 10
    }
  ],
  "nguoi_dung": [
    {
      "ma": "ND-001",
      "ho_ten": "Nguyễn Thị Năm",
      "dien_thoai": "0918000421",
      "to_chuc": "TC-B01",
      "vai": "chu"
    },
    {
      "ma": "ND-002",
      "ho_ten": "Nguyễn Văn Tèo",
      "dien_thoai": "0918000422",
      "to_chuc": "TC-B01",
      "vai": "nguoi_giup"
    },
    {
      "ma": "ND-003",
      "ho_ten": "Trần Văn Sáu",
      "dien_thoai": "0939000160",
      "to_chuc": "TC-B02",
      "vai": "chu"
    },
    {
      "ma": "ND-004",
      "ho_ten": "Lê Văn Hòa",
      "dien_thoai": "0907000300",
      "to_chuc": "TC-B03",
      "vai": "chu_nhiem"
    },
    {
      "ma": "ND-005",
      "ho_ten": "Phạm Thị Mai",
      "dien_thoai": "0907000301",
      "to_chuc": "TC-B03",
      "vai": "ke_toan_htx"
    },
    {
      "ma": "ND-006",
      "ho_ten": "Đỗ Văn Lợi",
      "dien_thoai": "0907000302",
      "to_chuc": "TC-B03",
      "vai": "nhan_vien_diem_gom"
    },
    {
      "ma": "ND-007",
      "ho_ten": "Võ Thị Lan",
      "dien_thoai": "0939000140",
      "to_chuc": "TC-B04",
      "vai": "chu"
    },
    {
      "ma": "ND-008",
      "ho_ten": "Lê Thị Hai",
      "dien_thoai": "0939000120",
      "to_chuc": "TC-B05",
      "vai": "chu"
    },
    {
      "ma": "ND-009",
      "ho_ten": "Lý Văn Tư",
      "dien_thoai": "0977000610",
      "to_chuc": "TC-B06",
      "vai": "chu"
    },
    {
      "ma": "ND-010",
      "ho_ten": "Đặng Thị Bích",
      "dien_thoai": "0966000520",
      "to_chuc": "TC-B07",
      "vai": "chu"
    },
    {
      "ma": "ND-011",
      "ho_ten": "Huỳnh Văn Bảy",
      "dien_thoai": "0988000770",
      "to_chuc": "TC-B08",
      "vai": "chu"
    },
    {
      "ma": "ND-012",
      "ho_ten": "Châu Văn Lực",
      "dien_thoai": "0945000880",
      "to_chuc": "TC-B09",
      "vai": "chu"
    },
    {
      "ma": "ND-013",
      "ho_ten": "Lâm Văn Đức",
      "dien_thoai": "0945000890",
      "to_chuc": "TC-B10",
      "vai": "to_truong"
    },
    {
      "ma": "ND-014",
      "ho_ten": "Nguyễn Văn Chín",
      "dien_thoai": "0919000950",
      "to_chuc": "TC-B11",
      "vai": "chu"
    },
    {
      "ma": "ND-015",
      "ho_ten": "Phan Thị Hồng",
      "dien_thoai": "0916000330",
      "to_chuc": "TC-B12",
      "vai": "chu"
    },
    {
      "ma": "ND-016",
      "ho_ten": "Thạch Sơn",
      "dien_thoai": "0977000620",
      "to_chuc": "TC-B13",
      "vai": "chu"
    },
    {
      "ma": "ND-017",
      "ho_ten": "Trịnh Văn Mười",
      "dien_thoai": "0917000101",
      "to_chuc": "TC-B14",
      "vai": "chu"
    },
    {
      "ma": "ND-018",
      "ho_ten": "Huỳnh Thị Nga",
      "dien_thoai": "0977000630",
      "to_chuc": "TC-B15",
      "vai": "chu"
    },
    {
      "ma": "ND-019",
      "ho_ten": "Lê Văn Phát",
      "dien_thoai": "0977000640",
      "to_chuc": "TC-B16",
      "vai": "chu"
    },
    {
      "ma": "ND-020",
      "ho_ten": "Ngô Văn Hậu",
      "dien_thoai": "0977000650",
      "to_chuc": "TC-B17",
      "vai": "chu"
    },
    {
      "ma": "ND-021",
      "ho_ten": "Trần Thị Kim",
      "dien_thoai": "0977000660",
      "to_chuc": "TC-B18",
      "vai": "chu"
    },
    {
      "ma": "ND-022",
      "ho_ten": "Đinh Văn Toàn",
      "dien_thoai": "0977000670",
      "to_chuc": "TC-B19",
      "vai": "chu"
    },
    {
      "ma": "ND-101",
      "ho_ten": "Trần Thu Hà",
      "dien_thoai": "0909000210",
      "to_chuc": "TC-M01",
      "vai": "mua_hang"
    },
    {
      "ma": "ND-102",
      "ho_ten": "Lê Thị Lan",
      "dien_thoai": "0909000211",
      "to_chuc": "TC-M01",
      "vai": "ke_toan"
    },
    {
      "ma": "ND-103",
      "ho_ten": "Võ Hoàng Phúc",
      "dien_thoai": "0909000212",
      "to_chuc": "TC-M01",
      "vai": "kho"
    },
    {
      "ma": "ND-104",
      "ho_ten": "Nguyễn Đức Thịnh",
      "dien_thoai": "0909000213",
      "to_chuc": "TC-M01",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-105",
      "ho_ten": "Phạm Minh Quân",
      "dien_thoai": "0903000410",
      "to_chuc": "TC-M02",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-106",
      "ho_ten": "Nguyễn Thị Ngọc",
      "dien_thoai": "0903000411",
      "to_chuc": "TC-M02",
      "vai": "kho"
    },
    {
      "ma": "ND-107",
      "ho_ten": "Huỳnh Văn Bình",
      "dien_thoai": "0903000412",
      "to_chuc": "TC-M02",
      "vai": "ke_toan"
    },
    {
      "ma": "ND-108",
      "ho_ten": "Lý Thanh Tùng",
      "dien_thoai": "0902000810",
      "to_chuc": "TC-M03",
      "vai": "mua_hang"
    },
    {
      "ma": "ND-109",
      "ho_ten": "Trương Thị Hạnh",
      "dien_thoai": "0902000811",
      "to_chuc": "TC-M03",
      "vai": "kho"
    },
    {
      "ma": "ND-110",
      "ho_ten": "Đặng Quốc Việt",
      "dien_thoai": "0901000710",
      "to_chuc": "TC-M04",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-111",
      "ho_ten": "Mai Thị Thủy",
      "dien_thoai": "0901000711",
      "to_chuc": "TC-M04",
      "vai": "ke_toan"
    },
    {
      "ma": "ND-112",
      "ho_ten": "Võ Thanh Sen",
      "dien_thoai": "0908000510",
      "to_chuc": "TC-M05",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-113",
      "ho_ten": "Lê Văn Tài",
      "dien_thoai": "0908000511",
      "to_chuc": "TC-M05",
      "vai": "nguoi_nhan"
    },
    {
      "ma": "ND-114",
      "ho_ten": "Nguyễn Thị Mười",
      "dien_thoai": "0906000105",
      "to_chuc": "TC-M06",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-115",
      "ho_ten": "Tạ Văn Hùng",
      "dien_thoai": "0938000610",
      "to_chuc": "TC-M07",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-116",
      "ho_ten": "Trần Văn Thành",
      "dien_thoai": "0937000910",
      "to_chuc": "TC-M08",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-201",
      "ho_ten": "Phan Văn Lâm",
      "dien_thoai": "0913000444",
      "to_chuc": "DT-KD",
      "vai": "kiem_dinh_vien"
    },
    {
      "ma": "ND-202",
      "ho_ten": "Hồ Văn Lộc",
      "dien_thoai": "0912000123",
      "to_chuc": "DT-XE",
      "vai": "tai_xe"
    },
    {
      "ma": "ND-203",
      "ho_ten": "Trần Văn Nghĩa",
      "dien_thoai": "0912000124",
      "to_chuc": "DT-XE",
      "vai": "tai_xe"
    },
    {
      "ma": "ND-204",
      "ho_ten": "Võ Thị Diễm",
      "dien_thoai": "0909000920",
      "to_chuc": "DT-KHO",
      "vai": "quan_ly_kho"
    },
    {
      "ma": "ND-301",
      "ho_ten": "Ngô Thị Vy",
      "dien_thoai": "0901000001",
      "to_chuc": "AGV",
      "vai": "VH-DP"
    },
    {
      "ma": "ND-302",
      "ho_ten": "Trần Văn Khoa",
      "dien_thoai": "0901000002",
      "to_chuc": "AGV",
      "vai": "VH-HT"
    },
    {
      "ma": "ND-303",
      "ho_ten": "Lâm Thị Thu",
      "dien_thoai": "0901000003",
      "to_chuc": "AGV",
      "vai": "VH-HT"
    },
    {
      "ma": "ND-304",
      "ho_ten": "Bùi Thị Thảo",
      "dien_thoai": "0901000004",
      "to_chuc": "AGV",
      "vai": "VH-DS-lap"
    },
    {
      "ma": "ND-305",
      "ho_ten": "Đỗ Minh Trí",
      "dien_thoai": "0901000005",
      "to_chuc": "AGV",
      "vai": "VH-DS-duyet"
    },
    {
      "ma": "ND-306",
      "ho_ten": "Phạm Quốc Bảo",
      "dien_thoai": "0901000006",
      "to_chuc": "AGV",
      "vai": "VH-RR"
    },
    {
      "ma": "ND-307",
      "ho_ten": "Lê Minh Châu",
      "dien_thoai": "0901000007",
      "to_chuc": "AGV",
      "vai": "VH-DM"
    },
    {
      "ma": "ND-308",
      "ho_ten": "Nguyễn Hữu Tâm",
      "dien_thoai": "0901000008",
      "to_chuc": "AGV",
      "vai": "VH-QL"
    }
  ],
  "to_chuc_ban": [
    {
      "ma": "TC-B01",
      "ten": "Hộ Nguyễn Thị Năm",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Mỹ Xương, Cao Lãnh, Đồng Tháp",
      "mat_hang": [
        "XOAI_CAT_CHU"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000002186",
        "chu": "Nguyễn Thị Năm"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 92,
      "so_don_hoan_tat": 18,
      "giay_to": [
        {
          "loai": "vietgap",
          "trang_thai": "da_xac_minh"
        },
        {
          "loai": "ma_vung_trong",
          "ma": "MVT-DT-0412",
          "thi_truong": [
            "TQ",
            "HQ"
          ],
          "trang_thai": "da_xac_minh",
          "hieu_luc_den": "2027-06-30"
        }
      ],
      "nguoi_giup": [
        "ND-002"
      ]
    },
    {
      "ma": "TC-B02",
      "ten": "Hộ Trần Văn Sáu",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Mỹ Xương, Cao Lãnh, Đồng Tháp",
      "mat_hang": [
        "XOAI_CAT_CHU"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Vietcombank",
        "so": "THU-0110000001606",
        "chu": "Trần Văn Sáu"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 85,
      "so_don_hoan_tat": 6,
      "giay_to": []
    },
    {
      "ma": "TC-B03",
      "ten": "HTX Mỹ Xương",
      "phia": "ban",
      "loai": "htx",
      "dia_ban": "Mỹ Xương, Cao Lãnh, Đồng Tháp",
      "mat_hang": [
        "XOAI_CAT_CHU",
        "THANH_LONG"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "BIDV",
        "so": "THU-6500000003000",
        "chu": "HTX Mỹ Xương"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 88,
      "so_don_hoan_tat": 25,
      "giay_to": [],
      "thanh_vien_htx": [
        "TC-B01",
        "TC-B02",
        "TC-B04",
        "TC-B05"
      ],
      "diem_gom": "ĐG-01"
    },
    {
      "ma": "TC-B04",
      "ten": "Hộ Võ Thị Lan",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Mỹ Xương, Cao Lãnh, Đồng Tháp",
      "mat_hang": [
        "XOAI_CAT_CHU"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000001400",
        "chu": "Võ Thị Lan"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": null,
      "so_don_hoan_tat": 0,
      "giay_to": []
    },
    {
      "ma": "TC-B05",
      "ten": "Hộ Lê Thị Hai",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Mỹ Xương, Cao Lãnh, Đồng Tháp",
      "mat_hang": [
        "XOAI_CAT_CHU"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000001200",
        "chu": "Lê Thị Hai"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 70,
      "so_don_hoan_tat": 3,
      "giay_to": []
    },
    {
      "ma": "TC-B06",
      "ten": "Hộ Lý Văn Tư",
      "phia": "ban",
      "loai": "trang_trai",
      "dia_ban": "Cai Lậy, Đồng Tháp",
      "mat_hang": [
        "SAU_RIENG"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Sacombank",
        "so": "THU-0600000006100",
        "chu": "Lý Văn Tư"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 90,
      "so_don_hoan_tat": 9,
      "giay_to": [
        {
          "loai": "ma_vung_trong",
          "ma": "MVT-DT-0610",
          "thi_truong": [
            "TQ"
          ],
          "trang_thai": "da_xac_minh",
          "hieu_luc_den": "2027-06-30"
        }
      ]
    },
    {
      "ma": "TC-B07",
      "ten": "Hộ Đặng Thị Bích",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Bến Lức, Tây Ninh",
      "mat_hang": [
        "CHANH_KHONG_HAT"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000005200",
        "chu": "Đặng Thị Bích"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 87,
      "so_don_hoan_tat": 11,
      "giay_to": []
    },
    {
      "ma": "TC-B08",
      "ten": "Hộ Huỳnh Văn Bảy",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Mỏ Cày Nam, Vĩnh Long",
      "mat_hang": [
        "BUOI_DA_XANH"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Vietinbank",
        "so": "THU-1080000007700",
        "chu": "Huỳnh Văn Bảy"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 83,
      "so_don_hoan_tat": 5,
      "giay_to": []
    },
    {
      "ma": "TC-B09",
      "ten": "Hộ Châu Văn Lực",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Mỹ Xuyên, Cần Thơ",
      "mat_hang": [
        "TOM_THE"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000008800",
        "chu": "Châu Văn Lực"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 89,
      "so_don_hoan_tat": 7,
      "giay_to": [
        {
          "loai": "nhat_ky_ao",
          "trang_thai": "da_xac_minh"
        }
      ]
    },
    {
      "ma": "TC-B10",
      "ten": "Tổ hợp tác Tôm sạch Hòa Tú",
      "phia": "ban",
      "loai": "to_hop_tac",
      "dia_ban": "Mỹ Xuyên, Cần Thơ",
      "mat_hang": [
        "TOM_THE"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000008900",
        "chu": "Lâm Văn Đức"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 80,
      "so_don_hoan_tat": 4,
      "giay_to": [],
      "uy_quyen_ho": 4
    },
    {
      "ma": "TC-B11",
      "ten": "Hộ Nguyễn Văn Chín",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Tháp Mười, Đồng Tháp",
      "mat_hang": [
        "LUA_TUOI"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000009500",
        "chu": "Nguyễn Văn Chín"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 86,
      "so_don_hoan_tat": 8,
      "giay_to": []
    },
    {
      "ma": "TC-B12",
      "ten": "Hộ Phan Thị Hồng",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Chợ Gạo, Đồng Tháp",
      "mat_hang": [
        "THANH_LONG"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000003300",
        "chu": "Phan Thị Hồng"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 81,
      "so_don_hoan_tat": 4,
      "giay_to": []
    },
    {
      "ma": "TC-B13",
      "ten": "Hộ Thạch Sơn",
      "phia": "ban",
      "loai": "trang_trai",
      "dia_ban": "Cai Lậy, Đồng Tháp",
      "mat_hang": [
        "SAU_RIENG"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Sacombank",
        "so": "THU-0600000006200",
        "chu": "Thạch Sơn"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 84,
      "so_don_hoan_tat": 6,
      "giay_to": [
        {
          "loai": "ma_vung_trong",
          "ma": "MVT-DT-0620",
          "thi_truong": [
            "TQ"
          ],
          "trang_thai": "da_xac_minh",
          "hieu_luc_den": "2027-06-30"
        }
      ]
    },
    {
      "ma": "TC-B14",
      "ten": "Hộ Trịnh Văn Mười",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Châu Phú, An Giang",
      "mat_hang": [
        "CA_TRA"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000001010",
        "chu": "Trịnh Văn Mười"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 82,
      "so_don_hoan_tat": 5,
      "giay_to": []
    },
    {
      "ma": "TC-B15",
      "ten": "Hộ Huỳnh Thị Nga",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Cai Lậy, Đồng Tháp",
      "mat_hang": [
        "SAU_RIENG"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Sacombank",
        "so": "THU-0600000006300",
        "chu": "Huỳnh Thị Nga"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 86,
      "so_don_hoan_tat": 5,
      "giay_to": [
        {
          "loai": "ma_vung_trong",
          "ma": "MVT-DT-0630",
          "thi_truong": [
            "TQ"
          ],
          "trang_thai": "da_xac_minh",
          "hieu_luc_den": "2027-06-30"
        }
      ]
    },
    {
      "ma": "TC-B16",
      "ten": "Hộ Lê Văn Phát",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Cai Lậy, Đồng Tháp",
      "mat_hang": [
        "SAU_RIENG"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Sacombank",
        "so": "THU-0600000006400",
        "chu": "Lê Văn Phát"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 88,
      "so_don_hoan_tat": 5,
      "giay_to": [
        {
          "loai": "ma_vung_trong",
          "ma": "MVT-DT-0640",
          "thi_truong": [
            "TQ"
          ],
          "trang_thai": "da_xac_minh",
          "hieu_luc_den": "2027-06-30"
        }
      ]
    },
    {
      "ma": "TC-B17",
      "ten": "Hộ Ngô Văn Hậu",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Cai Lậy, Đồng Tháp",
      "mat_hang": [
        "SAU_RIENG"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Sacombank",
        "so": "THU-0600000006500",
        "chu": "Ngô Văn Hậu"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 85,
      "so_don_hoan_tat": 5,
      "giay_to": [
        {
          "loai": "ma_vung_trong",
          "ma": "MVT-DT-0650",
          "thi_truong": [
            "TQ"
          ],
          "trang_thai": "da_xac_minh",
          "hieu_luc_den": "2027-06-30"
        }
      ]
    },
    {
      "ma": "TC-B18",
      "ten": "Hộ Trần Thị Kim",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Cai Lậy, Đồng Tháp",
      "mat_hang": [
        "SAU_RIENG"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Sacombank",
        "so": "THU-0600000006600",
        "chu": "Trần Thị Kim"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 87,
      "so_don_hoan_tat": 5,
      "giay_to": [
        {
          "loai": "ma_vung_trong",
          "ma": "MVT-DT-0660",
          "thi_truong": [
            "TQ"
          ],
          "trang_thai": "da_xac_minh",
          "hieu_luc_den": "2027-06-30"
        }
      ]
    },
    {
      "ma": "TC-B19",
      "ten": "Hộ Đinh Văn Toàn",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Cai Lậy, Đồng Tháp",
      "mat_hang": [
        "SAU_RIENG"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Sacombank",
        "so": "THU-0600000006700",
        "chu": "Đinh Văn Toàn"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 83,
      "so_don_hoan_tat": 5,
      "giay_to": [
        {
          "loai": "ma_vung_trong",
          "ma": "MVT-DT-0670",
          "thi_truong": [
            "TQ"
          ],
          "trang_thai": "da_xac_minh",
          "hieu_luc_den": "2027-06-30"
        }
      ]
    }
  ],
  "to_chuc_mua": [
    {
      "ma": "TC-M01",
      "ten": "Nhà máy sấy Đồng Xanh",
      "phia": "mua",
      "phan_khuc": [
        "che_bien"
      ],
      "goi": "thu_mua",
      "mst": "0319990001",
      "dia_chi_nhan": "KCN Hiệp Phước, TP.HCM",
      "xac_minh": "da_xac_minh",
      "han_muc_ky": {
        "ND-101": 50000000
      },
      "nhan_hang_kem_loai": [
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": "L2",
          "kg_toi_thieu": 500,
          "ban_kinh_km": 200
        }
      ]
    },
    {
      "ma": "TC-M02",
      "ten": "Công ty XNK Sông Tiền",
      "phia": "mua",
      "phan_khuc": [
        "xuat_khau"
      ],
      "goi": "doanh_nghiep",
      "mst": "0319990002",
      "dia_chi_nhan": "Kho đóng gói Mỹ Tho, Đồng Tháp",
      "xac_minh": "da_xac_minh",
      "ma_co_so_dong_goi": "CSĐG-DT-02"
    },
    {
      "ma": "TC-M03",
      "ten": "Công ty Thủy sản Cửu Long Xanh",
      "phia": "mua",
      "phan_khuc": [
        "xuat_khau"
      ],
      "goi": "doanh_nghiep",
      "mst": "0319990003",
      "dia_chi_nhan": "Nhà máy Trà Nóc, Cần Thơ",
      "xac_minh": "da_xac_minh",
      "han_muc_ky": {
        "ND-108": 300000000
      }
    },
    {
      "ma": "TC-M04",
      "ten": "Nhà máy chế biến Mekong",
      "phia": "mua",
      "phan_khuc": [
        "che_bien"
      ],
      "goi": "thu_mua",
      "mst": "0319990004",
      "dia_chi_nhan": "Cao Lãnh, Đồng Tháp",
      "xac_minh": "da_xac_minh",
      "doi_tac_bao_tieu": true,
      "gia_san_bao_tieu": [
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": "L2",
          "gia": 9000
        },
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": "L3",
          "gia": 5000
        },
        {
          "mat_hang": "THANH_LONG",
          "loai": "L2",
          "gia": 6000
        },
        {
          "mat_hang": "CHANH_KHONG_HAT",
          "loai": "L2",
          "gia": 6000
        },
        {
          "mat_hang": "CA_TRA",
          "loai": "ngoai_co",
          "gia": 26000
        }
      ],
      "nhan_hang_kem_loai": [
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": "L2",
          "kg_toi_thieu": 300,
          "ban_kinh_km": 100
        },
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": "L3",
          "kg_toi_thieu": 300,
          "ban_kinh_km": 100
        },
        {
          "mat_hang": "THANH_LONG",
          "loai": "L2",
          "kg_toi_thieu": 500,
          "ban_kinh_km": 100
        },
        {
          "mat_hang": "THANH_LONG",
          "loai": "DAT",
          "kg_toi_thieu": 500,
          "ban_kinh_km": 100
        }
      ]
    },
    {
      "ma": "TC-M05",
      "ten": "Nhà hàng Bếp Sen",
      "phia": "mua",
      "phan_khuc": [
        "nha_hang"
      ],
      "goi": "bep",
      "mst": "0319990005",
      "dia_chi_nhan": "TP Cao Lãnh",
      "xac_minh": "da_xac_minh"
    },
    {
      "ma": "TC-M06",
      "ten": "Quán Cơm Nhà Mười",
      "phia": "mua",
      "phan_khuc": [
        "nha_hang"
      ],
      "goi": "mien_phi",
      "mst": "8099990006",
      "dia_chi_nhan": "TP Cao Lãnh",
      "xac_minh": "da_xac_minh"
    },
    {
      "ma": "TC-M07",
      "ten": "Vựa trái cây Tư Hùng",
      "phia": "mua",
      "phan_khuc": [
        "dau_moi"
      ],
      "goi": "mien_phi",
      "mst": "0319990007",
      "dia_chi_nhan": "Cao Lãnh",
      "xac_minh": "da_xac_minh",
      "hai_vai": true
    },
    {
      "ma": "TC-M08",
      "ten": "Vựa lúa Ba Thành",
      "phia": "mua",
      "phan_khuc": [
        "dau_moi"
      ],
      "goi": "mien_phi",
      "mst": "0319990008",
      "dia_chi_nhan": "Tháp Mười",
      "xac_minh": "da_xac_minh"
    }
  ],
  "doi_tac": [
    {
      "ma": "DT-NH",
      "ten": "Ngân hàng TMCP Thử Nghiệm (mô phỏng)",
      "tai_khoan_coc_mau": "THU-COC-<madon>",
      "tai_khoan_doanh_thu": "THU-AGV-DOANHTHU"
    },
    {
      "ma": "DT-KD",
      "ten": "Trung tâm kiểm định Phương Nam (mô phỏng)",
      "nguoi": [
        "ND-201"
      ],
      "bang_gia": {
        "cam_quan_can_lai": 280000,
        "cadimi_vang_o_mau": 1500000,
        "test_khang_sinh_tom": 450000,
        "do_am_lua": 200000
      }
    },
    {
      "ma": "DT-XE",
      "ten": "Nhà xe Lộc Phát",
      "xe": [
        {
          "bien_so": "66C-123.45",
          "loai": "lanh",
          "tai_kg": 2500,
          "tai_xe": "ND-202"
        },
        {
          "bien_so": "66C-678.90",
          "loai": "thuong",
          "tai_kg": 5000,
          "tai_xe": "ND-203"
        }
      ],
      "cuoc": {
        "CaoLanh-TPHCM-lanh-2.5t": 3200000,
        "CaoLanh-TPHCM-thuong-5t": 2400000
      }
    },
    {
      "ma": "DT-KHO",
      "ten": "Kho lạnh Tân Phú Lạnh",
      "dia_chi": "Cao Lãnh, Đồng Tháp",
      "nguoi": [
        "ND-204"
      ],
      "gia_dong_kg_ngay": 300,
      "dai_nhiet": [
        "2-8",
        "10-13"
      ]
    },
    {
      "ma": "ĐG-01",
      "ten": "Điểm gom HTX Mỹ Xương",
      "to_chuc": "TC-B03",
      "nguoi": [
        "ND-006"
      ],
      "phi_gom_dong_kg": 300
    }
  ],
  "gia_tham_khao": [
    {
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 25000,
      "so_don": 14,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L2",
      "gia": 15000,
      "so_don": 6,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L3",
      "gia": 6000,
      "so_don": 4,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "CHANH_KHONG_HAT",
      "loai": "L1",
      "gia": 14000,
      "so_don": 9,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "CHANH_KHONG_HAT",
      "loai": "L2",
      "gia": 9000,
      "so_don": 5,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "TOM_THE",
      "loai": "48-52",
      "gia": 120000,
      "so_don": 7,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "LUA_TUOI",
      "loai": "OM18-am25",
      "gia": 6600,
      "so_don": 12,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "gia": 75000,
      "so_don": 8,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "BUOI_DA_XANH",
      "loai": "L1",
      "gia": 32000,
      "so_don": 6,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "THANH_LONG",
      "loai": "L1",
      "gia": 18000,
      "so_don": 5,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "THANH_LONG",
      "loai": "L2",
      "gia": 9000,
      "so_don": 4,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    },
    {
      "mat_hang": "CA_TRA",
      "loai": "0.8-1.2",
      "gia": 30000,
      "so_don": 5,
      "vung": "DBSCL",
      "den_ngay": "2026-11-02",
      "ghi_chu": "giá giả định cho dữ liệu ảo"
    }
  ],
  "don_nen": [
    {
      "ma": "HĐ-1901",
      "ban": "TC-B02",
      "mua": "TC-M07",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 23500,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-05",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1902",
      "ban": "TC-B05",
      "mua": "TC-M04",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 24000,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-06",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1903",
      "ban": "TC-B03",
      "mua": "TC-M01",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 24000,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-07",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1904",
      "ban": "TC-B04",
      "mua": "TC-M07",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 24500,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-08",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1905",
      "ban": "TC-B02",
      "mua": "TC-M07",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 24500,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-09",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1906",
      "ban": "TC-B05",
      "mua": "TC-M04",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 25000,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-10",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1907",
      "ban": "TC-B03",
      "mua": "TC-M01",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 25000,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-11",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1908",
      "ban": "TC-B04",
      "mua": "TC-M07",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 25000,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-12",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1909",
      "ban": "TC-B02",
      "mua": "TC-M07",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 25000,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-13",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1910",
      "ban": "TC-B05",
      "mua": "TC-M04",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 25500,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-14",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1911",
      "ban": "TC-B03",
      "mua": "TC-M01",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 25500,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-15",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1912",
      "ban": "TC-B04",
      "mua": "TC-M07",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 26000,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-16",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1913",
      "ban": "TC-B02",
      "mua": "TC-M07",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 26000,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-17",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1914",
      "ban": "TC-B05",
      "mua": "TC-M04",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 26500,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-18",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1015",
      "ban": "TC-B01",
      "mua": "TC-M07",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 24500,
      "kg_dat": 800,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-15",
      "trang_thai": "hoan_tat",
      "ghi_chu": "Đơn lịch sử tạo mối quen Năm–Tư Hùng; đánh dấu loai_khoi_gia_tham_khao để bộ nền 14 đơn giữ trung vị 25.000",
      "loai_khoi_gia_tham_khao": true
    }
  ],
  "lo": [
    {
      "ma": "L-0412",
      "ban": "TC-B01",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "luong_kg": 4000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-02",
      "het_cach_ly": "2026-11-01",
      "gia_mong_muon": 24000,
      "gia_thap_nhat_kin": 21500,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0413",
      "ban": "TC-B01",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L2",
      "luong_kg": 600,
      "uoc_tinh": false,
      "ngay_co_hang": "2026-11-02",
      "het_cach_ly": "2026-11-01",
      "gia_mong_muon": 15000,
      "gia_thap_nhat_kin": 12000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0414",
      "ban": "TC-B01",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "luong_kg": 2000,
      "uoc_tinh": false,
      "ngay_co_hang": "2026-11-05",
      "het_cach_ly": "2026-11-03",
      "gia_mong_muon": 24000,
      "gia_thap_nhat_kin": 22000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0420",
      "ban": "TC-B02",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "luong_kg": 1500,
      "uoc_tinh": false,
      "ngay_co_hang": "2026-11-02",
      "het_cach_ly": "2026-10-30",
      "gia_mong_muon": 24000,
      "gia_thap_nhat_kin": 21000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0430",
      "ban": "TC-B04",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "luong_kg": 1000,
      "uoc_tinh": false,
      "ngay_co_hang": "2026-11-03",
      "het_cach_ly": "2026-10-30",
      "gia_mong_muon": 24000,
      "gia_thap_nhat_kin": 21000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0431",
      "ban": "TC-B05",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "luong_kg": 500,
      "uoc_tinh": false,
      "ngay_co_hang": "2026-11-03",
      "het_cach_ly": "2026-10-30",
      "gia_mong_muon": 23500,
      "gia_thap_nhat_kin": 21000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0440",
      "ban": "TC-B06",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "luong_kg": 4000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-06",
      "het_cach_ly": "2026-10-25",
      "gia_mong_muon": 75000,
      "gia_thap_nhat_kin": 70000,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0441",
      "ban": "TC-B15",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "luong_kg": 3800,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-06",
      "het_cach_ly": "2026-10-25",
      "gia_mong_muon": 74000,
      "gia_thap_nhat_kin": 70000,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0442",
      "ban": "TC-B16",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "luong_kg": 3800,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-06",
      "het_cach_ly": "2026-10-25",
      "gia_mong_muon": 74000,
      "gia_thap_nhat_kin": 70000,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0443",
      "ban": "TC-B17",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "luong_kg": 3800,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-06",
      "het_cach_ly": "2026-10-25",
      "gia_mong_muon": 74000,
      "gia_thap_nhat_kin": 70000,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0444",
      "ban": "TC-B18",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "luong_kg": 3800,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-06",
      "het_cach_ly": "2026-10-25",
      "gia_mong_muon": 74000,
      "gia_thap_nhat_kin": 70000,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0445",
      "ban": "TC-B19",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "luong_kg": 3800,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-06",
      "het_cach_ly": "2026-10-25",
      "gia_mong_muon": 74000,
      "gia_thap_nhat_kin": 70000,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0447",
      "ban": "TC-B13",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "luong_kg": 3800,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-07",
      "het_cach_ly": "2026-10-25",
      "gia_mong_muon": 74000,
      "gia_thap_nhat_kin": 70000,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0450",
      "ban": "TC-B07",
      "mat_hang": "CHANH_KHONG_HAT",
      "loai": "L1",
      "luong_kg": 2000,
      "uoc_tinh": false,
      "ngay_co_hang": "2026-11-02",
      "het_cach_ly": "2026-10-28",
      "gia_mong_muon": 14000,
      "gia_thap_nhat_kin": 12500,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0451",
      "ban": "TC-B07",
      "mat_hang": "CHANH_KHONG_HAT",
      "loai": "L2",
      "luong_kg": 400,
      "uoc_tinh": false,
      "ngay_co_hang": "2026-11-02",
      "het_cach_ly": "2026-10-28",
      "gia_mong_muon": 9000,
      "gia_thap_nhat_kin": 7000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0460",
      "ban": "TC-B08",
      "mat_hang": "BUOI_DA_XANH",
      "loai": "L1",
      "luong_kg": 3000,
      "uoc_tinh": false,
      "ngay_co_hang": "2026-11-02",
      "het_cach_ly": "2026-10-20",
      "gia_mong_muon": 31000,
      "gia_thap_nhat_kin": 28000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0470",
      "ban": "TC-B09",
      "mat_hang": "TOM_THE",
      "loai": "48-52",
      "luong_kg": 1500,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-05",
      "het_cach_ly": "2026-10-22",
      "gia_mong_muon": 120000,
      "gia_thap_nhat_kin": 112000,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0480",
      "ban": "TC-B11",
      "mat_hang": "LUA_TUOI",
      "loai": "OM18-am25",
      "luong_kg": 30000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-04",
      "het_cach_ly": null,
      "gia_mong_muon": 6700,
      "gia_thap_nhat_kin": 6400,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0490",
      "ban": "TC-B12",
      "mat_hang": "THANH_LONG",
      "loai": "chua_tach",
      "luong_kg": 5000,
      "uoc_tinh": false,
      "ngay_co_hang": "2026-11-02",
      "het_cach_ly": "2026-10-28",
      "gia_mong_muon": null,
      "gia_thap_nhat_kin": null,
      "trang_thai": "nhap"
    },
    {
      "ma": "L-0495",
      "ban": "TC-B14",
      "mat_hang": "CA_TRA",
      "loai": "0.8-1.2",
      "luong_kg": 20000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-10",
      "het_cach_ly": "2026-10-25",
      "gia_mong_muon": 30000,
      "gia_thap_nhat_kin": 28000,
      "trang_thai": "sap_co_hang"
    }
  ],
  "nhu_cau": [
    {
      "ma": "NC-3001",
      "mua": "TC-M01",
      "dong": [
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": [
            "L1"
          ],
          "kg": 2000,
          "gia_toi_da_kin": 24000
        }
      ],
      "cua_so": [
        "2026-11-03",
        "2026-11-05"
      ],
      "kieu_giao": "tai_vuon",
      "giay_to_bat_buoc": [],
      "dang": "lo_mot_lan"
    },
    {
      "ma": "NC-3002",
      "mua": "TC-M01",
      "dong": [
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": [
            "L2"
          ],
          "kg": 3000,
          "gia_toi_da_kin": 16000
        },
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": [
            "L3"
          ],
          "kg": 2000,
          "gia_toi_da_kin": 7000
        }
      ],
      "cua_so": [
        "2026-11-03",
        "2026-11-15"
      ],
      "kieu_giao": "tai_kho_ben_mua",
      "giay_to_bat_buoc": [],
      "dang": "can_gom"
    },
    {
      "ma": "NC-3003",
      "mua": "TC-M02",
      "dong": [
        {
          "mat_hang": "SAU_RIENG",
          "loai": [
            "A"
          ],
          "kg": 18000,
          "gia_toi_da_kin": 74000,
          "kg_toi_thieu_moi_nguon": 1000
        }
      ],
      "cua_so": [
        "2026-11-06",
        "2026-11-09"
      ],
      "kieu_giao": "tai_vuon",
      "giay_to_bat_buoc": [
        "ma_vung_trong:TQ",
        "nhat_ky_cach_ly",
        "kiem_dinh:cadimi_vang_o"
      ],
      "dang": "can_gom"
    },
    {
      "ma": "NC-3004",
      "mua": "TC-M03",
      "dong": [
        {
          "mat_hang": "TOM_THE",
          "loai": [
            "48-52"
          ],
          "kg": 1500,
          "gia_toi_da_kin": 120000
        }
      ],
      "cua_so": [
        "2026-11-05",
        "2026-11-06"
      ],
      "kieu_giao": "tai_vuon",
      "giay_to_bat_buoc": [
        "nhat_ky_ao",
        "kiem_dinh:khang_sinh"
      ],
      "dang": "lo_mot_lan"
    },
    {
      "ma": "NC-3005",
      "mua": "TC-M07",
      "dong": [
        {
          "mat_hang": "BUOI_DA_XANH",
          "loai": [
            "L1"
          ],
          "kg": 3000,
          "gia_toi_da_kin": 31000
        }
      ],
      "cua_so": [
        "2026-11-02",
        "2026-11-04"
      ],
      "kieu_giao": "tai_vuon",
      "giay_to_bat_buoc": [],
      "dang": "lo_mot_lan"
    },
    {
      "ma": "NC-3006",
      "mua": "TC-M08",
      "dong": [
        {
          "mat_hang": "LUA_TUOI",
          "loai": [
            "OM18-am25"
          ],
          "kg": 30000,
          "gia_toi_da_kin": 6800
        }
      ],
      "cua_so": [
        "2026-11-04",
        "2026-11-05"
      ],
      "kieu_giao": "tai_vuon",
      "giay_to_bat_buoc": [],
      "dang": "lo_mot_lan"
    },
    {
      "ma": "NC-3007",
      "mua": "TC-M07",
      "dong": [
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": [
            "L1"
          ],
          "kg": 200,
          "gia_toi_da_kin": 23500
        }
      ],
      "cua_so": [
        "2026-11-04",
        "2026-11-04"
      ],
      "kieu_giao": "tai_diem_gom",
      "giay_to_bat_buoc": [],
      "dang": "can_gom"
    },
    {
      "ma": "NC-3008",
      "mua": "TC-M01",
      "dong": [
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": [
            "L1"
          ],
          "kg": 2500,
          "gia_toi_da_kin": 24000
        }
      ],
      "cua_so": [
        "2026-11-03",
        "2026-11-06"
      ],
      "kieu_giao": "tai_vuon",
      "giay_to_bat_buoc": [],
      "dang": "lo_mot_lan"
    }
  ],
  "hop_dong_khung": [
    {
      "ma": "KH-2003",
      "ban": "TC-B03",
      "mua": "TC-M05",
      "lich": [
        "thu_2",
        "thu_5"
      ],
      "mon": [
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": "L1",
          "kg": 30,
          "gia": 26000
        },
        {
          "mat_hang": "THANH_LONG",
          "loai": "L1",
          "kg": 20,
          "gia": 19000
        }
      ],
      "coc_khung": 1160000,
      "cho_no_them": 1500000,
      "da_giao_chua_tra": 1160000,
      "da_chot_sap_giao": 1420000,
      "ky_thanh_toan": "tuan"
    },
    {
      "ma": "KH-2006",
      "ban": "TC-M07",
      "mua": "TC-M06",
      "lich": [
        "thu_3",
        "thu_6"
      ],
      "mon": [
        {
          "mat_hang": "CHANH_KHONG_HAT",
          "loai": "L1",
          "kg": 10,
          "gia": 16000
        },
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": "L2",
          "kg": 15,
          "gia": 18000
        }
      ],
      "coc_khung": 860000,
      "cho_no_them": 200000,
      "da_giao_chua_tra": 0,
      "da_chot_sap_giao": 0,
      "ky_thanh_toan": "tuan_thu_7"
    }
  ],
  "bao_tieu": [
    {
      "ma": "BT-2005",
      "mua": "TC-M04",
      "ban": "TC-B01",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "dot": [
        {
          "so": 1,
          "kg_cam_ket": 3000,
          "trang_thai": "da_chot"
        },
        {
          "so": 2,
          "kg_cam_ket": 2800,
          "trang_thai": "cho_chuan_bi"
        },
        {
          "so": 3,
          "kg_cam_ket": 3200,
          "trang_thai": "cho_chuan_bi"
        }
      ],
      "cong_thuc_gia": "max(18000, 0.9 * P_tk_L1_ngay_giao)",
      "coc_vu": 9000000,
      "vat_tu_ung": 15000000,
      "tru_vat_tu_moi_dot": 5000000,
      "han_tra_dot_ngay": 7
    }
  ]
}'::jsonb);
INSERT INTO ref.provinces(code,name_vi) VALUES('DT','Đồng Tháp (mã thử)');
INSERT INTO ref.provinces(code,name_vi) VALUES('CT','Cần Thơ (mã thử)');
INSERT INTO ref.provinces(code,name_vi) VALUES('TN','Tây Ninh (mã thử)');
INSERT INTO ref.provinces(code,name_vi) VALUES('VL','Vĩnh Long (mã thử)');
INSERT INTO ref.provinces(code,name_vi) VALUES('AG','An Giang (mã thử)');
INSERT INTO ref.provinces(code,name_vi) VALUES('HCM','TP.HCM (mã thử)');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('91020315-f111-5802-ae6e-81df0b59def1','TC-B01','household','Hộ Nguyễn Thị Năm',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('7ed1d074-9269-579f-bd58-252d11f24586','TC-B02','household','Hộ Trần Văn Sáu',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('d191fddf-821f-503c-b45c-2461f1c1eba7','TC-B03','cooperative','HTX Mỹ Xương',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','TC-B04','household','Hộ Võ Thị Lan',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('7895283a-cbd1-5055-bafb-af5de4f9a570','TC-B05','household','Hộ Lê Thị Hai',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('8a156877-0fdb-530f-9e5e-9edc90407a76','TC-B06','household','Hộ Lý Văn Tư',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('b1e78de3-922a-54aa-a02c-e6b7c326a667','TC-B07','household','Hộ Đặng Thị Bích',NULL,true,false,false,'TN',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('b57a1a80-943c-5fc3-93f1-3bf25dd35ea5','TC-B08','household','Hộ Huỳnh Văn Bảy',NULL,true,false,false,'VL',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('7fcb5c94-36cb-5ecb-a5e3-fb7217cf38c7','TC-B09','household','Hộ Châu Văn Lực',NULL,true,false,false,'CT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('2c77b992-6510-5526-a265-800366ba8f0a','TC-B10','coop_group','Tổ hợp tác Tôm sạch Hòa Tú',NULL,true,false,false,'CT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('d4942162-e8a5-52e0-af80-950d32834e9b','TC-B11','household','Hộ Nguyễn Văn Chín',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('9aa68b07-b920-5863-9bcb-5715b1ebb886','TC-B12','household','Hộ Phan Thị Hồng',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('7fd4ec19-e445-577f-83bf-968df80a6db1','TC-B13','household','Hộ Thạch Sơn',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('c417ced1-dace-5ca9-8906-bf1d40cc689d','TC-B14','household','Hộ Trịnh Văn Mười',NULL,true,false,false,'AG',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('eb3a16c1-7742-57c2-82d2-ff9b0ffc44c4','TC-B15','household','Hộ Huỳnh Thị Nga',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('49744023-6298-5f6d-9ba5-20373d61c78f','TC-B16','household','Hộ Lê Văn Phát',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('ef15a063-699a-5cdb-a830-16411b107217','TC-B17','household','Hộ Ngô Văn Hậu',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('c7ac93c5-acb1-54dc-86ca-24aa0aadd0a9','TC-B18','household','Hộ Trần Thị Kim',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('e4af89b0-068e-5d4a-8c07-9fe4c8fde075','TC-B19','household','Hộ Đinh Văn Toàn',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('d45094f9-fea4-519a-a3c3-c9a50c9808a5','TC-M01','enterprise','Nhà máy sấy Đồng Xanh','0319990001',false,true,false,'HCM',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('d45094f9-fea4-519a-a3c3-c9a50c9808a5','processor','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('d45094f9-fea4-519a-a3c3-c9a50c9808a5','procurement',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('5dafca77-a17a-5f90-b68a-7766e3c64f71','TC-M02','enterprise','Công ty XNK Sông Tiền','0319990002',false,true,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('5dafca77-a17a-5f90-b68a-7766e3c64f71','export','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('5dafca77-a17a-5f90-b68a-7766e3c64f71','enterprise',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('a9179290-5f66-5741-8c32-412e6df6659a','TC-M03','enterprise','Công ty Thủy sản Cửu Long Xanh','0319990003',false,true,false,'CT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('a9179290-5f66-5741-8c32-412e6df6659a','export','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('a9179290-5f66-5741-8c32-412e6df6659a','enterprise',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','TC-M04','enterprise','Nhà máy chế biến Mekong','0319990004',false,true,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','processor','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','procurement',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('0c4280e9-e23b-55f1-898e-ce29dfe45ace','TC-M05','enterprise','Nhà hàng Bếp Sen','0319990005',false,true,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('0c4280e9-e23b-55f1-898e-ce29dfe45ace','horeca','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('0c4280e9-e23b-55f1-898e-ce29dfe45ace','kitchen',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('e8571283-c2ff-578c-8e7a-becaa244774a','TC-M06','enterprise','Quán Cơm Nhà Mười','8099990006',false,true,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('e8571283-c2ff-578c-8e7a-becaa244774a','horeca','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('e8571283-c2ff-578c-8e7a-becaa244774a','free',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('82ccf63a-b708-55a4-919d-3d94904bc60d','TC-M07','trader','Vựa trái cây Tư Hùng','0319990007',true,true,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('82ccf63a-b708-55a4-919d-3d94904bc60d','wholesaler','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('82ccf63a-b708-55a4-919d-3d94904bc60d','free',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('53d91dba-4084-5f67-a40a-73bf4c3c74e2','TC-M08','trader','Vựa lúa Ba Thành','0319990008',false,true,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('53d91dba-4084-5f67-a40a-73bf4c3c74e2','wholesaler','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('53d91dba-4084-5f67-a40a-73bf4c3c74e2','free',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('1702acf7-d345-5968-b614-56a14408b33a','DT-NH','service_partner','Ngân hàng TMCP Thử Nghiệm (mô phỏng)',NULL,false,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('f985623a-39b4-5ba2-a5fb-d6071d24080b','DT-KD','service_partner','Trung tâm kiểm định Phương Nam (mô phỏng)',NULL,false,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('c0a22526-e753-5915-b4d0-d0a3ee4076a4','DT-XE','service_partner','Nhà xe Lộc Phát',NULL,false,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('41d17c73-7e0f-5630-b13a-4e3bf39bbf52','DT-KHO','service_partner','Kho lạnh Tân Phú Lạnh',NULL,false,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('e0e5975b-29c5-59aa-8a83-8c3792d488ec','AGV','platform','AgiViet',NULL,false,false,true,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('3bc485dc-fc01-58ca-8708-2c60aceb8680','Nguyễn Thị Năm',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('3bc485dc-fc01-58ca-8708-2c60aceb8680',convert_to('TEST-PLAINTEXT:0918000421','UTF8'),digest('0918000421','sha256'),'0918***421','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('d8d160b7-d9ea-5203-8f46-b23f333276ff','91020315-f111-5802-ae6e-81df0b59def1','3bc485dc-fc01-58ca-8708-2c60aceb8680',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('d8d160b7-d9ea-5203-8f46-b23f333276ff','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('7b7e6c93-4397-5ca8-9b31-2abed6d958ee','Nguyễn Văn Tèo',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('7b7e6c93-4397-5ca8-9b31-2abed6d958ee',convert_to('TEST-PLAINTEXT:0918000422','UTF8'),digest('0918000422','sha256'),'0918***422','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('0788efcc-dcf9-50e5-ab5e-09a5e2fcefd0','Trần Văn Sáu',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('0788efcc-dcf9-50e5-ab5e-09a5e2fcefd0',convert_to('TEST-PLAINTEXT:0939000160','UTF8'),digest('0939000160','sha256'),'0939***160','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('bcff9aed-da7a-5733-8024-3e28dc78302a','7ed1d074-9269-579f-bd58-252d11f24586','0788efcc-dcf9-50e5-ab5e-09a5e2fcefd0',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('bcff9aed-da7a-5733-8024-3e28dc78302a','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('74f0dc16-541e-51ef-9ced-abeb3538fb09','Lê Văn Hòa',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('74f0dc16-541e-51ef-9ced-abeb3538fb09',convert_to('TEST-PLAINTEXT:0907000300','UTF8'),digest('0907000300','sha256'),'0907***300','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('43b6d483-efdb-58c4-87e4-b95fae3f7c5b','d191fddf-821f-503c-b45c-2461f1c1eba7','74f0dc16-541e-51ef-9ced-abeb3538fb09',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('43b6d483-efdb-58c4-87e4-b95fae3f7c5b','coop_board');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('43b6d483-efdb-58c4-87e4-b95fae3f7c5b','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('54f264dc-073f-5992-bff3-c80ed49cf7bd','Phạm Thị Mai',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('54f264dc-073f-5992-bff3-c80ed49cf7bd',convert_to('TEST-PLAINTEXT:0907000301','UTF8'),digest('0907000301','sha256'),'0907***301','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('336ab533-66f9-5c0e-a3da-eb945bd3936f','d191fddf-821f-503c-b45c-2461f1c1eba7','54f264dc-073f-5992-bff3-c80ed49cf7bd',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('336ab533-66f9-5c0e-a3da-eb945bd3936f','accountant');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('b3c6b22c-91bd-5c44-ab8f-d1ad5fc33eb7','Đỗ Văn Lợi',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('b3c6b22c-91bd-5c44-ab8f-d1ad5fc33eb7',convert_to('TEST-PLAINTEXT:0907000302','UTF8'),digest('0907000302','sha256'),'0907***302','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('d95615e1-5e3d-5f1e-a1fd-4c5d748d9b90','d191fddf-821f-503c-b45c-2461f1c1eba7','b3c6b22c-91bd-5c44-ab8f-d1ad5fc33eb7',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('d95615e1-5e3d-5f1e-a1fd-4c5d748d9b90','collection_staff');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('61e76ff5-2b14-5337-8afa-cade45a55574','Võ Thị Lan',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('61e76ff5-2b14-5337-8afa-cade45a55574',convert_to('TEST-PLAINTEXT:0939000140','UTF8'),digest('0939000140','sha256'),'0939***140','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('73de6947-ab4c-5b3a-a801-3baa81f4c416','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','61e76ff5-2b14-5337-8afa-cade45a55574',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('73de6947-ab4c-5b3a-a801-3baa81f4c416','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('c358c79b-f2a9-5274-acd9-5f22cfe5d588','Lê Thị Hai',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('c358c79b-f2a9-5274-acd9-5f22cfe5d588',convert_to('TEST-PLAINTEXT:0939000120','UTF8'),digest('0939000120','sha256'),'0939***120','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('80295c17-b19f-5491-ac18-64b701bbe1c4','7895283a-cbd1-5055-bafb-af5de4f9a570','c358c79b-f2a9-5274-acd9-5f22cfe5d588',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('80295c17-b19f-5491-ac18-64b701bbe1c4','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('effbf978-4e95-5961-b361-6b888c11e412','Lý Văn Tư',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('effbf978-4e95-5961-b361-6b888c11e412',convert_to('TEST-PLAINTEXT:0977000610','UTF8'),digest('0977000610','sha256'),'0977***610','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('4a5be8d6-843f-5fb9-a452-045a63c8568e','8a156877-0fdb-530f-9e5e-9edc90407a76','effbf978-4e95-5961-b361-6b888c11e412',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('4a5be8d6-843f-5fb9-a452-045a63c8568e','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('24babf51-dc96-504b-8e8a-6e039ddc713d','Đặng Thị Bích',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('24babf51-dc96-504b-8e8a-6e039ddc713d',convert_to('TEST-PLAINTEXT:0966000520','UTF8'),digest('0966000520','sha256'),'0966***520','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('8287370b-d0a7-570e-979c-a7cd1b1f9e90','b1e78de3-922a-54aa-a02c-e6b7c326a667','24babf51-dc96-504b-8e8a-6e039ddc713d',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('8287370b-d0a7-570e-979c-a7cd1b1f9e90','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('cdf5a785-4fcf-5d19-9a25-de85e0d54b34','Huỳnh Văn Bảy',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('cdf5a785-4fcf-5d19-9a25-de85e0d54b34',convert_to('TEST-PLAINTEXT:0988000770','UTF8'),digest('0988000770','sha256'),'0988***770','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('09654dd0-b8b7-554a-bcce-201de7feec60','b57a1a80-943c-5fc3-93f1-3bf25dd35ea5','cdf5a785-4fcf-5d19-9a25-de85e0d54b34',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('09654dd0-b8b7-554a-bcce-201de7feec60','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('c4664208-8860-5c0c-a700-284951ac521b','Châu Văn Lực',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('c4664208-8860-5c0c-a700-284951ac521b',convert_to('TEST-PLAINTEXT:0945000880','UTF8'),digest('0945000880','sha256'),'0945***880','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('26359d44-fa6c-58f7-8e1e-916e7bce82be','7fcb5c94-36cb-5ecb-a5e3-fb7217cf38c7','c4664208-8860-5c0c-a700-284951ac521b',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('26359d44-fa6c-58f7-8e1e-916e7bce82be','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('8ba64606-81e7-54b6-8d27-d7c3dbda7325','Lâm Văn Đức',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('8ba64606-81e7-54b6-8d27-d7c3dbda7325',convert_to('TEST-PLAINTEXT:0945000890','UTF8'),digest('0945000890','sha256'),'0945***890','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('3f9bbb3a-2929-543b-ae4b-938ff75ab784','2c77b992-6510-5526-a265-800366ba8f0a','8ba64606-81e7-54b6-8d27-d7c3dbda7325',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('3f9bbb3a-2929-543b-ae4b-938ff75ab784','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('597c23fe-2d9d-506b-98c6-8883621f43d3','Nguyễn Văn Chín',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('597c23fe-2d9d-506b-98c6-8883621f43d3',convert_to('TEST-PLAINTEXT:0919000950','UTF8'),digest('0919000950','sha256'),'0919***950','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('1e072afa-a938-5887-b1b5-6e06c5ece9cb','d4942162-e8a5-52e0-af80-950d32834e9b','597c23fe-2d9d-506b-98c6-8883621f43d3',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('1e072afa-a938-5887-b1b5-6e06c5ece9cb','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('f7d820bf-fb4f-5e2a-b994-892051568905','Phan Thị Hồng',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('f7d820bf-fb4f-5e2a-b994-892051568905',convert_to('TEST-PLAINTEXT:0916000330','UTF8'),digest('0916000330','sha256'),'0916***330','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('695eee97-78bd-57bf-8ee4-cc3add59fb4d','9aa68b07-b920-5863-9bcb-5715b1ebb886','f7d820bf-fb4f-5e2a-b994-892051568905',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('695eee97-78bd-57bf-8ee4-cc3add59fb4d','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('787d8137-f056-5661-bc27-f0def2cc53cc','Thạch Sơn',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('787d8137-f056-5661-bc27-f0def2cc53cc',convert_to('TEST-PLAINTEXT:0977000620','UTF8'),digest('0977000620','sha256'),'0977***620','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('9d2c80f5-213e-5b05-8014-49427ebcf72b','7fd4ec19-e445-577f-83bf-968df80a6db1','787d8137-f056-5661-bc27-f0def2cc53cc',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('9d2c80f5-213e-5b05-8014-49427ebcf72b','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('9bbe397e-0d2e-53bb-b63e-9bff7ed2dc9a','Trịnh Văn Mười',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('9bbe397e-0d2e-53bb-b63e-9bff7ed2dc9a',convert_to('TEST-PLAINTEXT:0917000101','UTF8'),digest('0917000101','sha256'),'0917***101','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('4f561131-b633-5180-9c00-29687b8f0d36','c417ced1-dace-5ca9-8906-bf1d40cc689d','9bbe397e-0d2e-53bb-b63e-9bff7ed2dc9a',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('4f561131-b633-5180-9c00-29687b8f0d36','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('488e2317-fe9a-5049-818f-ad14d9dbe7ba','Huỳnh Thị Nga',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('488e2317-fe9a-5049-818f-ad14d9dbe7ba',convert_to('TEST-PLAINTEXT:0977000630','UTF8'),digest('0977000630','sha256'),'0977***630','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('a944a068-cb13-59c8-9590-f5ee09133a0a','eb3a16c1-7742-57c2-82d2-ff9b0ffc44c4','488e2317-fe9a-5049-818f-ad14d9dbe7ba',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('a944a068-cb13-59c8-9590-f5ee09133a0a','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('32148416-b1f2-5673-b260-6910f9f673da','Lê Văn Phát',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('32148416-b1f2-5673-b260-6910f9f673da',convert_to('TEST-PLAINTEXT:0977000640','UTF8'),digest('0977000640','sha256'),'0977***640','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('3d0ac789-56d7-5619-af83-5ba6887ed91c','49744023-6298-5f6d-9ba5-20373d61c78f','32148416-b1f2-5673-b260-6910f9f673da',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('3d0ac789-56d7-5619-af83-5ba6887ed91c','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('0355662c-bd53-55a9-b6c9-f20e8eaa1f5f','Ngô Văn Hậu',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('0355662c-bd53-55a9-b6c9-f20e8eaa1f5f',convert_to('TEST-PLAINTEXT:0977000650','UTF8'),digest('0977000650','sha256'),'0977***650','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('7f049319-ed2c-52e6-9ef7-127d4774825d','ef15a063-699a-5cdb-a830-16411b107217','0355662c-bd53-55a9-b6c9-f20e8eaa1f5f',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('7f049319-ed2c-52e6-9ef7-127d4774825d','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('d8c56a72-15a5-5036-aaf2-6a4885559e5b','Trần Thị Kim',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('d8c56a72-15a5-5036-aaf2-6a4885559e5b',convert_to('TEST-PLAINTEXT:0977000660','UTF8'),digest('0977000660','sha256'),'0977***660','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('84481789-99a7-57f5-badd-e36e96f5e4d0','c7ac93c5-acb1-54dc-86ca-24aa0aadd0a9','d8c56a72-15a5-5036-aaf2-6a4885559e5b',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('84481789-99a7-57f5-badd-e36e96f5e4d0','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('4fd32a95-d3fc-52f9-93fe-97991fd8c7fb','Đinh Văn Toàn',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('4fd32a95-d3fc-52f9-93fe-97991fd8c7fb',convert_to('TEST-PLAINTEXT:0977000670','UTF8'),digest('0977000670','sha256'),'0977***670','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('d21f2cf6-a774-5f94-ac88-fe2e66a90b62','e4af89b0-068e-5d4a-8c07-9fe4c8fde075','4fd32a95-d3fc-52f9-93fe-97991fd8c7fb',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('d21f2cf6-a774-5f94-ac88-fe2e66a90b62','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('ab32ad11-4893-58b2-b41d-703710175c8e','Trần Thu Hà',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('ab32ad11-4893-58b2-b41d-703710175c8e',convert_to('TEST-PLAINTEXT:0909000210','UTF8'),digest('0909000210','sha256'),'0909***210','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('22b3b509-523b-5fdc-96c3-dbdf752e94f4','d45094f9-fea4-519a-a3c3-c9a50c9808a5','ab32ad11-4893-58b2-b41d-703710175c8e',50000000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('22b3b509-523b-5fdc-96c3-dbdf752e94f4','purchaser');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('92ac5f3d-3658-5767-8b8d-c933a4b6cf66','Lê Thị Lan',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('92ac5f3d-3658-5767-8b8d-c933a4b6cf66',convert_to('TEST-PLAINTEXT:0909000211','UTF8'),digest('0909000211','sha256'),'0909***211','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('bb63e7e6-0b49-5296-be23-6ba4faa0ddd8','d45094f9-fea4-519a-a3c3-c9a50c9808a5','92ac5f3d-3658-5767-8b8d-c933a4b6cf66',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('bb63e7e6-0b49-5296-be23-6ba4faa0ddd8','accountant');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('50f841d1-2e92-5405-94e2-495e98a46908','Võ Hoàng Phúc',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('50f841d1-2e92-5405-94e2-495e98a46908',convert_to('TEST-PLAINTEXT:0909000212','UTF8'),digest('0909000212','sha256'),'0909***212','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('5418183c-3847-536a-84e9-c03e2602c02c','d45094f9-fea4-519a-a3c3-c9a50c9808a5','50f841d1-2e92-5405-94e2-495e98a46908',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('5418183c-3847-536a-84e9-c03e2602c02c','warehouse');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('473a2319-83db-5dbb-b06c-7512bd71cd8b','Nguyễn Đức Thịnh',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('473a2319-83db-5dbb-b06c-7512bd71cd8b',convert_to('TEST-PLAINTEXT:0909000213','UTF8'),digest('0909000213','sha256'),'0909***213','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('6c8df91d-6994-58cb-bd3a-8b895b179686','d45094f9-fea4-519a-a3c3-c9a50c9808a5','473a2319-83db-5dbb-b06c-7512bd71cd8b',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('6c8df91d-6994-58cb-bd3a-8b895b179686','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('56637769-2257-5058-b120-4522b1f42d46','Phạm Minh Quân',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('56637769-2257-5058-b120-4522b1f42d46',convert_to('TEST-PLAINTEXT:0903000410','UTF8'),digest('0903000410','sha256'),'0903***410','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('28a3c43c-503c-59ce-891e-9699d5d4706e','5dafca77-a17a-5f90-b68a-7766e3c64f71','56637769-2257-5058-b120-4522b1f42d46',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('28a3c43c-503c-59ce-891e-9699d5d4706e','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('0ba91433-a6b3-5d0a-850c-79f7ee5c6e62','Nguyễn Thị Ngọc',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('0ba91433-a6b3-5d0a-850c-79f7ee5c6e62',convert_to('TEST-PLAINTEXT:0903000411','UTF8'),digest('0903000411','sha256'),'0903***411','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('5b89bd50-6eec-5910-a967-86a21794e340','5dafca77-a17a-5f90-b68a-7766e3c64f71','0ba91433-a6b3-5d0a-850c-79f7ee5c6e62',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('5b89bd50-6eec-5910-a967-86a21794e340','warehouse');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('4dbb2d9c-7dcd-521d-a944-0eba0089a323','Huỳnh Văn Bình',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('4dbb2d9c-7dcd-521d-a944-0eba0089a323',convert_to('TEST-PLAINTEXT:0903000412','UTF8'),digest('0903000412','sha256'),'0903***412','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('bf6f97cf-5b80-5aa7-8686-bb31fb856f24','5dafca77-a17a-5f90-b68a-7766e3c64f71','4dbb2d9c-7dcd-521d-a944-0eba0089a323',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('bf6f97cf-5b80-5aa7-8686-bb31fb856f24','accountant');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('2743fa1d-68b2-5bce-8456-9f13fa0c2bab','Lý Thanh Tùng',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('2743fa1d-68b2-5bce-8456-9f13fa0c2bab',convert_to('TEST-PLAINTEXT:0902000810','UTF8'),digest('0902000810','sha256'),'0902***810','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('364f172a-b8b5-5dcf-90a1-75af4a01b86e','a9179290-5f66-5741-8c32-412e6df6659a','2743fa1d-68b2-5bce-8456-9f13fa0c2bab',300000000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('364f172a-b8b5-5dcf-90a1-75af4a01b86e','purchaser');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('06b48028-1d5a-5742-9371-2f6cb5a30e8c','Trương Thị Hạnh',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('06b48028-1d5a-5742-9371-2f6cb5a30e8c',convert_to('TEST-PLAINTEXT:0902000811','UTF8'),digest('0902000811','sha256'),'0902***811','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('6b89edb5-aae6-5dc7-9d1c-1430ba50254e','a9179290-5f66-5741-8c32-412e6df6659a','06b48028-1d5a-5742-9371-2f6cb5a30e8c',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('6b89edb5-aae6-5dc7-9d1c-1430ba50254e','warehouse');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('900a59cf-a91d-5b41-a844-fe2de9772052','Đặng Quốc Việt',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('900a59cf-a91d-5b41-a844-fe2de9772052',convert_to('TEST-PLAINTEXT:0901000710','UTF8'),digest('0901000710','sha256'),'0901***710','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('4d9228b8-7f06-5323-b8dc-090c16b6f8c4','99177a1f-dc84-588e-95bd-199401da0ed3','900a59cf-a91d-5b41-a844-fe2de9772052',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('4d9228b8-7f06-5323-b8dc-090c16b6f8c4','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('904fcd84-a638-52ac-96e3-827f7bd14f6d','Mai Thị Thủy',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('904fcd84-a638-52ac-96e3-827f7bd14f6d',convert_to('TEST-PLAINTEXT:0901000711','UTF8'),digest('0901000711','sha256'),'0901***711','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('cf32dcbb-c3e6-54e8-b454-65c81cece41c','99177a1f-dc84-588e-95bd-199401da0ed3','904fcd84-a638-52ac-96e3-827f7bd14f6d',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('cf32dcbb-c3e6-54e8-b454-65c81cece41c','accountant');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('2de50563-e01a-5202-839a-effccb79aaad','Võ Thanh Sen',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('2de50563-e01a-5202-839a-effccb79aaad',convert_to('TEST-PLAINTEXT:0908000510','UTF8'),digest('0908000510','sha256'),'0908***510','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('cb30b1b4-1827-53a5-b284-08b38c7bce78','0c4280e9-e23b-55f1-898e-ce29dfe45ace','2de50563-e01a-5202-839a-effccb79aaad',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('cb30b1b4-1827-53a5-b284-08b38c7bce78','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('b88b7e79-14da-5c66-9d67-20423e90856d','Lê Văn Tài',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('b88b7e79-14da-5c66-9d67-20423e90856d',convert_to('TEST-PLAINTEXT:0908000511','UTF8'),digest('0908000511','sha256'),'0908***511','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('181f5fcb-8bf3-5f40-b0d3-0d2efc8943f5','0c4280e9-e23b-55f1-898e-ce29dfe45ace','b88b7e79-14da-5c66-9d67-20423e90856d',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('181f5fcb-8bf3-5f40-b0d3-0d2efc8943f5','site_receiver');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('e20df3b2-c197-5967-8962-b311b21bfa3a','Nguyễn Thị Mười',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('e20df3b2-c197-5967-8962-b311b21bfa3a',convert_to('TEST-PLAINTEXT:0906000105','UTF8'),digest('0906000105','sha256'),'0906***105','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('22464f58-7d4c-5180-ad0e-f5fa6c1a82d5','e8571283-c2ff-578c-8e7a-becaa244774a','e20df3b2-c197-5967-8962-b311b21bfa3a',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('22464f58-7d4c-5180-ad0e-f5fa6c1a82d5','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('2632886b-7f9f-56a2-9d5e-3ae5b7bc8ca8','Tạ Văn Hùng',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('2632886b-7f9f-56a2-9d5e-3ae5b7bc8ca8',convert_to('TEST-PLAINTEXT:0938000610','UTF8'),digest('0938000610','sha256'),'0938***610','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('f571cdd1-41ef-58eb-b594-a6facb58d20f','82ccf63a-b708-55a4-919d-3d94904bc60d','2632886b-7f9f-56a2-9d5e-3ae5b7bc8ca8',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('f571cdd1-41ef-58eb-b594-a6facb58d20f','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('ed7fc04f-c3b0-5f7b-a59d-b888319fca92','Trần Văn Thành',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('ed7fc04f-c3b0-5f7b-a59d-b888319fca92',convert_to('TEST-PLAINTEXT:0937000910','UTF8'),digest('0937000910','sha256'),'0937***910','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('85cb9f0a-a24c-5ff8-a032-129f27b27c20','53d91dba-4084-5f67-a40a-73bf4c3c74e2','ed7fc04f-c3b0-5f7b-a59d-b888319fca92',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('85cb9f0a-a24c-5ff8-a032-129f27b27c20','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('f5d7857f-0f30-5114-886d-fd5688cdad9e','Phan Văn Lâm',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('f5d7857f-0f30-5114-886d-fd5688cdad9e',convert_to('TEST-PLAINTEXT:0913000444','UTF8'),digest('0913000444','sha256'),'0913***444','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO ops.staff_assignments(user_id,role_code) VALUES('f5d7857f-0f30-5114-886d-fd5688cdad9e','inspector');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('5f56ab11-8f76-5d42-9ba3-20a8acaceaaf','f985623a-39b4-5ba2-a5fb-d6071d24080b','f5d7857f-0f30-5114-886d-fd5688cdad9e',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('89e1efb2-a798-56b0-9af7-c4a65c19a55c','Hồ Văn Lộc',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('89e1efb2-a798-56b0-9af7-c4a65c19a55c',convert_to('TEST-PLAINTEXT:0912000123','UTF8'),digest('0912000123','sha256'),'0912***123','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('43089f91-4ff4-58a4-ae79-f02899ee55cc','c0a22526-e753-5915-b4d0-d0a3ee4076a4','89e1efb2-a798-56b0-9af7-c4a65c19a55c',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('2717353b-fc8c-51e0-84fe-a819d4f2948a','Trần Văn Nghĩa',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('2717353b-fc8c-51e0-84fe-a819d4f2948a',convert_to('TEST-PLAINTEXT:0912000124','UTF8'),digest('0912000124','sha256'),'0912***124','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('97948e48-9a15-5d81-8d58-f9612e49751e','c0a22526-e753-5915-b4d0-d0a3ee4076a4','2717353b-fc8c-51e0-84fe-a819d4f2948a',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('cf715ffa-160e-554f-8ff0-358027482002','Võ Thị Diễm',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('cf715ffa-160e-554f-8ff0-358027482002',convert_to('TEST-PLAINTEXT:0909000920','UTF8'),digest('0909000920','sha256'),'0909***920','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('38c004bb-ac75-54bc-8f25-f7d951422dcc','41d17c73-7e0f-5630-b13a-4e3bf39bbf52','cf715ffa-160e-554f-8ff0-358027482002',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('38c004bb-ac75-54bc-8f25-f7d951422dcc','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('bbadf645-9c07-51bb-908d-642ea108c216','Ngô Thị Vy',true,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('bbadf645-9c07-51bb-908d-642ea108c216',convert_to('TEST-PLAINTEXT:0901000001','UTF8'),digest('0901000001','sha256'),'0901***001','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO ops.staff_assignments(user_id,role_code) VALUES('bbadf645-9c07-51bb-908d-642ea108c216','dispatcher');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('05b6fe52-0f3d-523d-ab4e-371833bebf10','e0e5975b-29c5-59aa-8a83-8c3792d488ec','bbadf645-9c07-51bb-908d-642ea108c216',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('6366054e-de5b-5cd6-831f-bd5ba4326f45','Trần Văn Khoa',true,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('6366054e-de5b-5cd6-831f-bd5ba4326f45',convert_to('TEST-PLAINTEXT:0901000002','UTF8'),digest('0901000002','sha256'),'0901***002','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO ops.staff_assignments(user_id,role_code) VALUES('6366054e-de5b-5cd6-831f-bd5ba4326f45','field');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('cf4ebdfc-e9bb-521e-aff3-b2e9b4bfc584','e0e5975b-29c5-59aa-8a83-8c3792d488ec','6366054e-de5b-5cd6-831f-bd5ba4326f45',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('6509f8d2-039d-5b4e-9f2d-b8adc573794b','Lâm Thị Thu',true,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('6509f8d2-039d-5b4e-9f2d-b8adc573794b',convert_to('TEST-PLAINTEXT:0901000003','UTF8'),digest('0901000003','sha256'),'0901***003','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO ops.staff_assignments(user_id,role_code) VALUES('6509f8d2-039d-5b4e-9f2d-b8adc573794b','field');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('06297c49-6951-5def-81c9-251a30a82e34','e0e5975b-29c5-59aa-8a83-8c3792d488ec','6509f8d2-039d-5b4e-9f2d-b8adc573794b',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('d3f73755-f74c-5842-b5ee-5f11f28f0053','Bùi Thị Thảo',true,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('d3f73755-f74c-5842-b5ee-5f11f28f0053',convert_to('TEST-PLAINTEXT:0901000004','UTF8'),digest('0901000004','sha256'),'0901***004','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO ops.staff_assignments(user_id,role_code) VALUES('d3f73755-f74c-5842-b5ee-5f11f28f0053','finance');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('219d6129-70c5-57f8-a035-fdc6e7875ef1','e0e5975b-29c5-59aa-8a83-8c3792d488ec','d3f73755-f74c-5842-b5ee-5f11f28f0053',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('4010ec3c-2a8d-5033-972b-9bdf751f4166','Đỗ Minh Trí',true,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('4010ec3c-2a8d-5033-972b-9bdf751f4166',convert_to('TEST-PLAINTEXT:0901000005','UTF8'),digest('0901000005','sha256'),'0901***005','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO ops.staff_assignments(user_id,role_code) VALUES('4010ec3c-2a8d-5033-972b-9bdf751f4166','finance');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('8f48d688-fa69-5b90-be9e-941ad04b3585','e0e5975b-29c5-59aa-8a83-8c3792d488ec','4010ec3c-2a8d-5033-972b-9bdf751f4166',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('ceb6d055-0b79-5bdb-9466-89e2dc95f5e6','Phạm Quốc Bảo',true,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('ceb6d055-0b79-5bdb-9466-89e2dc95f5e6',convert_to('TEST-PLAINTEXT:0901000006','UTF8'),digest('0901000006','sha256'),'0901***006','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO ops.staff_assignments(user_id,role_code) VALUES('ceb6d055-0b79-5bdb-9466-89e2dc95f5e6','risk');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('bdd61d39-3f3f-56eb-98a5-e4157c2127f1','e0e5975b-29c5-59aa-8a83-8c3792d488ec','ceb6d055-0b79-5bdb-9466-89e2dc95f5e6',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('33e12bc3-91de-58db-8dbf-bc3d058cdbbe','Lê Minh Châu',true,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('33e12bc3-91de-58db-8dbf-bc3d058cdbbe',convert_to('TEST-PLAINTEXT:0901000007','UTF8'),digest('0901000007','sha256'),'0901***007','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO ops.staff_assignments(user_id,role_code) VALUES('33e12bc3-91de-58db-8dbf-bc3d058cdbbe','catalog');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('68247c16-7fab-5ab2-85c7-bd98f733d922','e0e5975b-29c5-59aa-8a83-8c3792d488ec','33e12bc3-91de-58db-8dbf-bc3d058cdbbe',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('cecb6cb9-535c-53fd-98bd-053adfc71219','Nguyễn Hữu Tâm',true,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('cecb6cb9-535c-53fd-98bd-053adfc71219',convert_to('TEST-PLAINTEXT:0901000008','UTF8'),digest('0901000008','sha256'),'0901***008','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO ops.staff_assignments(user_id,role_code) VALUES('cecb6cb9-535c-53fd-98bd-053adfc71219','supervisor');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('c22fcd60-f0a2-5c7e-9157-9ddc43f4b932','e0e5975b-29c5-59aa-8a83-8c3792d488ec','cecb6cb9-535c-53fd-98bd-053adfc71219',NULL,'2026-11-02T08:00:00+07:00');
UPDATE core.membership_role_grants SET effective_at='2026-10-01';
ALTER TABLE core.membership_role_grants ENABLE TRIGGER a_privilege;
ALTER TABLE core.membership_role_grants ENABLE TRIGGER z_notify_grant;
INSERT INTO core.delegations(org_id,principal_user_id,helper_user_id,actions,valid_during) VALUES('91020315-f111-5802-ae6e-81df0b59def1','3bc485dc-fc01-58ca-8708-2c60aceb8680','7b7e6c93-4397-5ca8-9b31-2abed6d958ee',ARRAY['view','lot.draft','message.send','delivery.record'],tstzrange('2026-10-01','2027-01-01','[)'));
ALTER TABLE pii.bank_accounts DISABLE TRIGGER a_activation_clock;
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('f9a50056-3052-5531-aad5-4da258a0ee47','91020315-f111-5802-ae6e-81df0b59def1','Agribank',convert_to('TEST:THU-7300000002186','UTF8'),digest('THU-7300000002186','sha256'),'****2186','Nguyễn Thị Năm',true,'3bc485dc-fc01-58ca-8708-2c60aceb8680',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('05c58fa7-622f-58e7-ab2d-c7f8985a93e4','91020315-f111-5802-ae6e-81df0b59def1','orchard','Mỹ Xương, Cao Lãnh, Đồng Tháp');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('91020315-f111-5802-ae6e-81df0b59def1','05c58fa7-622f-58e7-ab2d-c7f8985a93e4','vietgap',NULL,NULL,daterange('2026-01-01','2027-01-01'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('91020315-f111-5802-ae6e-81df0b59def1','05c58fa7-622f-58e7-ab2d-c7f8985a93e4','growing_area_code','MVT-DT-0412','TQ',daterange('2026-01-01','2027-06-30'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('91020315-f111-5802-ae6e-81df0b59def1','05c58fa7-622f-58e7-ab2d-c7f8985a93e4','growing_area_code','MVT-DT-0412','HQ',daterange('2026-01-01','2027-06-30'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('b2ab1419-1ba7-5c1e-865c-5a7f73a89e82','7ed1d074-9269-579f-bd58-252d11f24586','Vietcombank',convert_to('TEST:THU-0110000001606','UTF8'),digest('THU-0110000001606','sha256'),'****1606','Trần Văn Sáu',true,'0788efcc-dcf9-50e5-ab5e-09a5e2fcefd0',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('e80011a5-c5d3-5491-bff9-35bf84be51aa','7ed1d074-9269-579f-bd58-252d11f24586','orchard','Mỹ Xương, Cao Lãnh, Đồng Tháp');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('0a8e1621-67e6-5d28-8ede-0fd9a7a80fe5','d191fddf-821f-503c-b45c-2461f1c1eba7','BIDV',convert_to('TEST:THU-6500000003000','UTF8'),digest('THU-6500000003000','sha256'),'****3000','HTX Mỹ Xương',true,'74f0dc16-541e-51ef-9ced-abeb3538fb09',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('a2ffd0c1-a973-5d7c-a943-540e7a25256b','d191fddf-821f-503c-b45c-2461f1c1eba7','orchard','Mỹ Xương, Cao Lãnh, Đồng Tháp');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('8b5e5782-3300-51ab-941a-3af10d10e0ec','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','Agribank',convert_to('TEST:THU-7300000001400','UTF8'),digest('THU-7300000001400','sha256'),'****1400','Võ Thị Lan',true,'61e76ff5-2b14-5337-8afa-cade45a55574',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('a3c59f94-22f0-5904-a369-4879931e9953','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','orchard','Mỹ Xương, Cao Lãnh, Đồng Tháp');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('e40f38d6-8e22-5cc4-9ca2-4d0ac59bf3a6','7895283a-cbd1-5055-bafb-af5de4f9a570','Agribank',convert_to('TEST:THU-7300000001200','UTF8'),digest('THU-7300000001200','sha256'),'****1200','Lê Thị Hai',true,'c358c79b-f2a9-5274-acd9-5f22cfe5d588',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('c19e3589-929e-53cb-826f-485ceedffb02','7895283a-cbd1-5055-bafb-af5de4f9a570','orchard','Mỹ Xương, Cao Lãnh, Đồng Tháp');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('cf5658c5-70be-5268-a655-3443c9553bd4','8a156877-0fdb-530f-9e5e-9edc90407a76','Sacombank',convert_to('TEST:THU-0600000006100','UTF8'),digest('THU-0600000006100','sha256'),'****6100','Lý Văn Tư',true,'effbf978-4e95-5961-b361-6b888c11e412',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('aa96521e-588a-5358-a144-a00234034579','8a156877-0fdb-530f-9e5e-9edc90407a76','orchard','Cai Lậy, Đồng Tháp');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('8a156877-0fdb-530f-9e5e-9edc90407a76','aa96521e-588a-5358-a144-a00234034579','growing_area_code','MVT-DT-0610','TQ',daterange('2026-01-01','2027-06-30'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('798c2d08-1456-5a0e-be07-de35b4af3142','b1e78de3-922a-54aa-a02c-e6b7c326a667','Agribank',convert_to('TEST:THU-7300000005200','UTF8'),digest('THU-7300000005200','sha256'),'****5200','Đặng Thị Bích',true,'24babf51-dc96-504b-8e8a-6e039ddc713d',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('574d25bb-b204-56d9-a486-c439458256b0','b1e78de3-922a-54aa-a02c-e6b7c326a667','orchard','Bến Lức, Tây Ninh');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('e397b9d0-4096-533d-810f-e03185b1c69d','b57a1a80-943c-5fc3-93f1-3bf25dd35ea5','Vietinbank',convert_to('TEST:THU-1080000007700','UTF8'),digest('THU-1080000007700','sha256'),'****7700','Huỳnh Văn Bảy',true,'cdf5a785-4fcf-5d19-9a25-de85e0d54b34',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('c4efb127-1ce9-582b-b8e5-1858c100756c','b57a1a80-943c-5fc3-93f1-3bf25dd35ea5','orchard','Mỏ Cày Nam, Vĩnh Long');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('b2ff5aa8-240e-5e99-9374-76acb8c896e2','7fcb5c94-36cb-5ecb-a5e3-fb7217cf38c7','Agribank',convert_to('TEST:THU-7300000008800','UTF8'),digest('THU-7300000008800','sha256'),'****8800','Châu Văn Lực',true,'c4664208-8860-5c0c-a700-284951ac521b',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('589d52a6-9ed2-5fb6-a6a8-2b7a3020c1b2','7fcb5c94-36cb-5ecb-a5e3-fb7217cf38c7','pond','Mỹ Xuyên, Cần Thơ');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('7fcb5c94-36cb-5ecb-a5e3-fb7217cf38c7','589d52a6-9ed2-5fb6-a6a8-2b7a3020c1b2','pond_diary',NULL,NULL,daterange('2026-01-01','2027-01-01'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('9d9abad0-024b-5ba4-9898-e1af6abbe890','2c77b992-6510-5526-a265-800366ba8f0a','pond','Mỹ Xuyên, Cần Thơ');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('cda0ce70-e4bc-56c6-a582-140b34b432df','d4942162-e8a5-52e0-af80-950d32834e9b','Agribank',convert_to('TEST:THU-7300000009500','UTF8'),digest('THU-7300000009500','sha256'),'****9500','Nguyễn Văn Chín',true,'597c23fe-2d9d-506b-98c6-8883621f43d3',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('942abec7-43a7-59cb-8466-80bd0e8e21d4','d4942162-e8a5-52e0-af80-950d32834e9b','field','Tháp Mười, Đồng Tháp');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('3572673e-7d24-5961-9a2c-4802ca9a131a','9aa68b07-b920-5863-9bcb-5715b1ebb886','Agribank',convert_to('TEST:THU-7300000003300','UTF8'),digest('THU-7300000003300','sha256'),'****3300','Phan Thị Hồng',true,'f7d820bf-fb4f-5e2a-b994-892051568905',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('4b2bedaa-6b27-57c9-9c6f-dafecc233c4a','9aa68b07-b920-5863-9bcb-5715b1ebb886','orchard','Chợ Gạo, Đồng Tháp');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('1292f9b5-38a2-521c-84cf-e6df9472cb95','7fd4ec19-e445-577f-83bf-968df80a6db1','Sacombank',convert_to('TEST:THU-0600000006200','UTF8'),digest('THU-0600000006200','sha256'),'****6200','Thạch Sơn',true,'787d8137-f056-5661-bc27-f0def2cc53cc',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('e9791763-7248-583b-a4ed-8c48fee512c5','7fd4ec19-e445-577f-83bf-968df80a6db1','orchard','Cai Lậy, Đồng Tháp');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('7fd4ec19-e445-577f-83bf-968df80a6db1','e9791763-7248-583b-a4ed-8c48fee512c5','growing_area_code','MVT-DT-0620','TQ',daterange('2026-01-01','2027-06-30'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('16d953b0-ad1a-5816-9abd-26e2ead41ae5','c417ced1-dace-5ca9-8906-bf1d40cc689d','Agribank',convert_to('TEST:THU-7300000001010','UTF8'),digest('THU-7300000001010','sha256'),'****1010','Trịnh Văn Mười',true,'9bbe397e-0d2e-53bb-b63e-9bff7ed2dc9a',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('9d7bb148-2ea3-5f6a-b85f-331bd5d9a4f2','c417ced1-dace-5ca9-8906-bf1d40cc689d','pond','Châu Phú, An Giang');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('96faa263-7bed-51ef-b9e5-a1c9e658c5e1','eb3a16c1-7742-57c2-82d2-ff9b0ffc44c4','Sacombank',convert_to('TEST:THU-0600000006300','UTF8'),digest('THU-0600000006300','sha256'),'****6300','Huỳnh Thị Nga',true,'488e2317-fe9a-5049-818f-ad14d9dbe7ba',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('4fd9ebc3-1d96-574c-bbc8-b25541ed027a','eb3a16c1-7742-57c2-82d2-ff9b0ffc44c4','orchard','Cai Lậy, Đồng Tháp');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('eb3a16c1-7742-57c2-82d2-ff9b0ffc44c4','4fd9ebc3-1d96-574c-bbc8-b25541ed027a','growing_area_code','MVT-DT-0630','TQ',daterange('2026-01-01','2027-06-30'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('68cc8416-531a-5fad-9d36-b21a7430ff81','49744023-6298-5f6d-9ba5-20373d61c78f','Sacombank',convert_to('TEST:THU-0600000006400','UTF8'),digest('THU-0600000006400','sha256'),'****6400','Lê Văn Phát',true,'32148416-b1f2-5673-b260-6910f9f673da',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('d2d680ef-de5e-50e7-8b10-c28d35705b22','49744023-6298-5f6d-9ba5-20373d61c78f','orchard','Cai Lậy, Đồng Tháp');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('49744023-6298-5f6d-9ba5-20373d61c78f','d2d680ef-de5e-50e7-8b10-c28d35705b22','growing_area_code','MVT-DT-0640','TQ',daterange('2026-01-01','2027-06-30'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('73bd541a-f179-528c-8995-a627585d517b','ef15a063-699a-5cdb-a830-16411b107217','Sacombank',convert_to('TEST:THU-0600000006500','UTF8'),digest('THU-0600000006500','sha256'),'****6500','Ngô Văn Hậu',true,'0355662c-bd53-55a9-b6c9-f20e8eaa1f5f',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('19d6f57b-911f-51c6-8bae-92de2686ab32','ef15a063-699a-5cdb-a830-16411b107217','orchard','Cai Lậy, Đồng Tháp');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('ef15a063-699a-5cdb-a830-16411b107217','19d6f57b-911f-51c6-8bae-92de2686ab32','growing_area_code','MVT-DT-0650','TQ',daterange('2026-01-01','2027-06-30'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('1db65504-b080-5f7d-be10-12d6d398b24f','c7ac93c5-acb1-54dc-86ca-24aa0aadd0a9','Sacombank',convert_to('TEST:THU-0600000006600','UTF8'),digest('THU-0600000006600','sha256'),'****6600','Trần Thị Kim',true,'d8c56a72-15a5-5036-aaf2-6a4885559e5b',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('a701b690-79d7-5e31-83cb-20a9e9bd0582','c7ac93c5-acb1-54dc-86ca-24aa0aadd0a9','orchard','Cai Lậy, Đồng Tháp');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('c7ac93c5-acb1-54dc-86ca-24aa0aadd0a9','a701b690-79d7-5e31-83cb-20a9e9bd0582','growing_area_code','MVT-DT-0660','TQ',daterange('2026-01-01','2027-06-30'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('85028ca2-adbf-5c95-821e-961d22c52118','e4af89b0-068e-5d4a-8c07-9fe4c8fde075','Sacombank',convert_to('TEST:THU-0600000006700','UTF8'),digest('THU-0600000006700','sha256'),'****6700','Đinh Văn Toàn',true,'4fd32a95-d3fc-52f9-93fe-97991fd8c7fb',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('051d6e9f-ed6b-58a5-8a1a-51e3a23f9f7c','e4af89b0-068e-5d4a-8c07-9fe4c8fde075','orchard','Cai Lậy, Đồng Tháp');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('e4af89b0-068e-5d4a-8c07-9fe4c8fde075','051d6e9f-ed6b-58a5-8a1a-51e3a23f9f7c','growing_area_code','MVT-DT-0670','TQ',daterange('2026-01-01','2027-06-30'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
ALTER TABLE pii.bank_accounts ENABLE TRIGGER a_activation_clock;
INSERT INTO core.products(id,code,name_vi,group_code,open_tier) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313','XOAI_CAT_CHU','Xoài cát Chu','fresh_fruit',1);
INSERT INTO core.product_profiles(product_id,profile_version,quality_mode,qty_tolerance_bps,reject_allowance_bps,shelf_life_days,config) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313',1,'grade',500,500,7,'{"source": "docs/nghiep-vu/01-mat-hang.md", "test_parameters": true}'::jsonb);
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313',1,'L1','L1',1,false,'300–450 g/trái, không vết đen quá 5%, không dập, già 80–85%');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313',1,'L2','L2',2,true,'220–299 g hoặc vết vỏ 5–20%');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313',1,'L3','L3',3,true,'Dưới 220 g, trầy nặng, chín ép');
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313',1,'DAP','Dập',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313',1,'THOI','Thối',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313',1,'SAU_DUC','Sâu đục',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313',1,'TRAY_VO','Trầy vỏ',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313',1,'SAI_GIONG','Sai giống',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313',1,'AN_TOAN','Không đạt an toàn',true);
UPDATE core.products SET current_profile_version=1 WHERE id='c833b2d4-badc-5575-98cd-83c9c6293313';
INSERT INTO core.products(id,code,name_vi,group_code,open_tier) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed','CHANH_KHONG_HAT','Chanh không hạt','fresh_fruit',1);
INSERT INTO core.product_profiles(product_id,profile_version,quality_mode,qty_tolerance_bps,reject_allowance_bps,shelf_life_days,config) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'grade',500,500,21,'{"source": "docs/nghiep-vu/01-mat-hang.md", "test_parameters": true}'::jsonb);
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'L1','L1',1,false,'Thông số thử theo 01-mat-hang.md; khoảng L1');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'L2','L2',2,true,'Thông số thử theo 01-mat-hang.md; khoảng L2');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'DAT','DAT',3,true,'Thông số thử theo 01-mat-hang.md; khoảng DAT');
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'DAP','Dập',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'THOI','Thối',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'SAU_DUC','Sâu đục',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'TRAY_VO','Trầy vỏ',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'SAI_GIONG','Sai giống',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'AN_TOAN','Không đạt an toàn',true);
UPDATE core.products SET current_profile_version=1 WHERE id='c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed';
INSERT INTO core.products(id,code,name_vi,group_code,open_tier) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2','TOM_THE','Tôm thẻ chân trắng','aquaculture',1);
INSERT INTO core.product_profiles(product_id,profile_version,quality_mode,qty_tolerance_bps,reject_allowance_bps,shelf_life_days,config) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'size_table',500,500,1,'{"source": "docs/nghiep-vu/01-mat-hang.md", "test_parameters": true}'::jsonb);
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'48-52','48-52',1,false,'Thông số thử theo 01-mat-hang.md; khoảng 48-52');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'53-60','53-60',2,false,'Thông số thử theo 01-mat-hang.md; khoảng 53-60');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'61-70','61-70',3,false,'Thông số thử theo 01-mat-hang.md; khoảng 61-70');
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'DAP','Dập',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'THOI','Thối',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'SAU_DUC','Sâu đục',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'TRAY_VO','Trầy vỏ',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'SAI_GIONG','Sai giống',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'AN_TOAN','Không đạt an toàn',true);
UPDATE core.products SET current_profile_version=1 WHERE id='9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2';
INSERT INTO core.products(id,code,name_vi,group_code,open_tier) VALUES('5aded288-3224-5d1e-b474-7b59d2098852','LUA_TUOI','Lúa tươi','grain',1);
INSERT INTO core.product_profiles(product_id,profile_version,quality_mode,qty_tolerance_bps,reject_allowance_bps,shelf_life_days,config) VALUES('5aded288-3224-5d1e-b474-7b59d2098852',1,'moisture',1000,500,1,'{"source": "docs/nghiep-vu/01-mat-hang.md", "test_parameters": true}'::jsonb);
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('5aded288-3224-5d1e-b474-7b59d2098852',1,'OM18-am25','OM18-am25',1,false,'Thông số thử theo 01-mat-hang.md; khoảng OM18-am25');
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('5aded288-3224-5d1e-b474-7b59d2098852',1,'DAP','Dập',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('5aded288-3224-5d1e-b474-7b59d2098852',1,'THOI','Thối',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('5aded288-3224-5d1e-b474-7b59d2098852',1,'SAU_DUC','Sâu đục',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('5aded288-3224-5d1e-b474-7b59d2098852',1,'TRAY_VO','Trầy vỏ',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('5aded288-3224-5d1e-b474-7b59d2098852',1,'SAI_GIONG','Sai giống',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('5aded288-3224-5d1e-b474-7b59d2098852',1,'AN_TOAN','Không đạt an toàn',true);
UPDATE core.products SET current_profile_version=1 WHERE id='5aded288-3224-5d1e-b474-7b59d2098852';
INSERT INTO core.products(id,code,name_vi,group_code,open_tier) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc','SAU_RIENG','Sầu riêng','fresh_fruit',2);
INSERT INTO core.product_profiles(product_id,profile_version,quality_mode,qty_tolerance_bps,reject_allowance_bps,shelf_life_days,config) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'grade',500,300,5,'{"source": "docs/nghiep-vu/01-mat-hang.md", "test_parameters": true}'::jsonb);
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'A','A',1,false,'2–5 kg/trái, ít nhất 4 múi đầy, không sâu nứt');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'B','B',2,false,'1,5–2 kg hoặc thiếu một múi');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'C','C',3,true,'Dưới 1,5 kg, méo, thiếu múi');
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'DAP','Dập',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'THOI','Thối',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'SAU_DUC','Sâu đục',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'TRAY_VO','Trầy vỏ',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'SAI_GIONG','Sai giống',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'AN_TOAN','Không đạt an toàn',true);
UPDATE core.products SET current_profile_version=1 WHERE id='8ebec77f-09a6-5ef3-b660-69a681ca86bc';
INSERT INTO core.products(id,code,name_vi,group_code,open_tier) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e','BUOI_DA_XANH','Bưởi da xanh','fresh_fruit',2);
INSERT INTO core.product_profiles(product_id,profile_version,quality_mode,qty_tolerance_bps,reject_allowance_bps,shelf_life_days,config) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e',1,'grade',500,500,28,'{"source": "docs/nghiep-vu/01-mat-hang.md", "test_parameters": true}'::jsonb);
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e',1,'L1','L1',1,false,'Thông số thử theo 01-mat-hang.md; khoảng L1');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e',1,'L2','L2',2,true,'Thông số thử theo 01-mat-hang.md; khoảng L2');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e',1,'DAT','DAT',3,true,'Thông số thử theo 01-mat-hang.md; khoảng DAT');
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e',1,'DAP','Dập',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e',1,'THOI','Thối',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e',1,'SAU_DUC','Sâu đục',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e',1,'TRAY_VO','Trầy vỏ',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e',1,'SAI_GIONG','Sai giống',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e',1,'AN_TOAN','Không đạt an toàn',true);
UPDATE core.products SET current_profile_version=1 WHERE id='3197ac78-8690-508d-ab58-eba8e7df742e';
INSERT INTO core.products(id,code,name_vi,group_code,open_tier) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055','THANH_LONG','Thanh long','fresh_fruit',3);
INSERT INTO core.product_profiles(product_id,profile_version,quality_mode,qty_tolerance_bps,reject_allowance_bps,shelf_life_days,config) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'grade',500,500,7,'{"source": "docs/nghiep-vu/01-mat-hang.md", "test_parameters": true}'::jsonb);
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'L1','L1',1,false,'Thông số thử theo 01-mat-hang.md; khoảng L1');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'L2','L2',2,true,'Thông số thử theo 01-mat-hang.md; khoảng L2');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'DAT','DAT',3,true,'Thông số thử theo 01-mat-hang.md; khoảng DAT');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'chua_tach','chua_tach',4,false,'Thông số thử theo 01-mat-hang.md; khoảng chua_tach');
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'DAP','Dập',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'THOI','Thối',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'SAU_DUC','Sâu đục',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'TRAY_VO','Trầy vỏ',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'SAI_GIONG','Sai giống',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'AN_TOAN','Không đạt an toàn',true);
UPDATE core.products SET current_profile_version=1 WHERE id='e6b1cf34-b6af-556f-a9ff-f65abcb58055';
INSERT INTO core.products(id,code,name_vi,group_code,open_tier) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8','CA_TRA','Cá tra nguyên liệu','aquaculture',3);
INSERT INTO core.product_profiles(product_id,profile_version,quality_mode,qty_tolerance_bps,reject_allowance_bps,shelf_life_days,config) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8',1,'size_table',1000,500,1,'{"source": "docs/nghiep-vu/01-mat-hang.md", "test_parameters": true}'::jsonb);
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8',1,'0.8-1.2','0.8-1.2',1,false,'Thông số thử theo 01-mat-hang.md; khoảng 0.8-1.2');
INSERT INTO core.product_grades(product_id,profile_version,grade_code,label_vi,rank,is_substandard,criteria) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8',1,'ngoai_co','ngoai_co',2,true,'Thông số thử theo 01-mat-hang.md; khoảng ngoai_co');
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8',1,'DAP','Dập',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8',1,'THOI','Thối',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8',1,'SAU_DUC','Sâu đục',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8',1,'TRAY_VO','Trầy vỏ',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8',1,'SAI_GIONG','Sai giống',false);
INSERT INTO core.product_reject_reasons(product_id,profile_version,reason_code,label_vi,is_safety) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8',1,'AN_TOAN','Không đạt an toàn',true);
UPDATE core.products SET current_profile_version=1 WHERE id='a201a368-04e1-5da1-a80e-53280e3106a8';
ALTER TABLE core.policy_versions DISABLE TRIGGER a_policy_approval;
INSERT INTO core.policy_versions(id,effective_from,deadlines,note) VALUES(1,'2026-10-01T00:00:00+07:00','{"tra_loi_loi_chao": 24, "tra_loi_loi_chao_vua": [6, 12], "giu_luong": 24, "nguoi_ban_ky": 24, "coc": 48, "coc_hang_tuoi": 12, "tra_loi_de_nghi": 24, "xac_nhan_tra_thang": 48, "nb_xac_nhan_tai_cho_phut": 60, "nb_xac_nhan_tai_kho": 24, "kiem_den": 2, "gia_han_kiem_den": 2, "nghiem_thu_giao_gan_tuoi": 12, "nghiem_thu_giao_gan_khac": 24, "can_lai": 24, "kiem_dinh": 48, "thoa_thuan_khong_ket_luan_ngay": 14, "cong_no": 72, "hien_thi_lo_ngay": 14, "ban_gap_ngay": 3, "kem_loai_khong_ai_hoi": 24, "doi_tai_khoan": 24, "doi_tai_khoan_sau_khoi_phuc": 72, "khung_chot_lan_goi": 24}'::jsonb,'Tham số thử từ du-lieu-ao.json; hạn dạng số giờ/ngày theo tên khóa.');
ALTER TABLE core.policy_versions ENABLE TRIGGER a_policy_approval;
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('6bf44f2f-b9cd-5e3b-aeb0-bb5d7b1c4db2','d45094f9-fea4-519a-a3c3-c9a50c9808a5','buyer_warehouse','KCN Hiệp Phước, TP.HCM');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('ced136e3-3a01-5fc1-a9d4-af58c4bc9fef','5dafca77-a17a-5f90-b68a-7766e3c64f71','buyer_warehouse','Kho đóng gói Mỹ Tho, Đồng Tháp');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('a33a6a0f-1c08-56d1-b350-659ac581488f','a9179290-5f66-5741-8c32-412e6df6659a','buyer_warehouse','Nhà máy Trà Nóc, Cần Thơ');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('3389b945-a3eb-510a-a1ab-c1b96f7c1e6c','99177a1f-dc84-588e-95bd-199401da0ed3','buyer_warehouse','Cao Lãnh, Đồng Tháp');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('7ab38b1a-c78d-5935-a0b4-21ad9def59ac','0c4280e9-e23b-55f1-898e-ce29dfe45ace','restaurant','TP Cao Lãnh');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('bf060ae7-7c36-55d5-a964-35433d638c11','e8571283-c2ff-578c-8e7a-becaa244774a','restaurant','TP Cao Lãnh');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('b6e7daa4-1d7f-5ee5-8c08-c8d8306f8f65','82ccf63a-b708-55a4-919d-3d94904bc60d','buyer_warehouse','Cao Lãnh');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('9c42fe22-6d90-561b-b32f-aae4bc611233','53d91dba-4084-5f67-a40a-73bf4c3c74e2','buyer_warehouse','Tháp Mười');
INSERT INTO core.facilities(id,org_id,kind,name,collection_fee_vnd_per_kg) VALUES('cf69fed2-4711-59c4-87db-f7d4b1118684','d191fddf-821f-503c-b45c-2461f1c1eba7','collection_point','Điểm gom HTX Mỹ Xương',300);
INSERT INTO core.facilities(id,org_id,kind,name,cold_min_dc,cold_max_dc) VALUES('7f8f0e42-328a-5fc6-9cb5-c39450644648','41d17c73-7e0f-5630-b13a-4e3bf39bbf52','cold_storage','Kho lạnh Tân Phú Lạnh',20,130);
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('f31d2bc3-0673-592d-9f6f-fb3948913de0','L-0412','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313',1,'L1','05c58fa7-622f-58e7-ab2d-c7f8985a93e4','estimated',4000000,'2026-11-02','2026-11-01',24000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('f31d2bc3-0673-592d-9f6f-fb3948913de0',24000,21500,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('3e615324-61bb-55a0-a108-485ee04cc5ac','L-0413','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313',1,'L2','05c58fa7-622f-58e7-ab2d-c7f8985a93e4','weighed',600000,'2026-11-02','2026-11-01',15000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('3e615324-61bb-55a0-a108-485ee04cc5ac',15000,12000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('95e87b53-f0f1-5d85-af7b-de8a30f7a466','L-0414','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313',1,'L1','05c58fa7-622f-58e7-ab2d-c7f8985a93e4','weighed',2000000,'2026-11-05','2026-11-03',24000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('95e87b53-f0f1-5d85-af7b-de8a30f7a466',24000,22000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('88c84696-c515-5605-b78e-db63ba87b5c5','L-0420','7ed1d074-9269-579f-bd58-252d11f24586','c833b2d4-badc-5575-98cd-83c9c6293313',1,'L1','e80011a5-c5d3-5491-bff9-35bf84be51aa','weighed',1500000,'2026-11-02','2026-10-30',24000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('88c84696-c515-5605-b78e-db63ba87b5c5',24000,21000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('459e1de1-ade9-5cb0-a321-2ad3afc1783d','L-0430','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','c833b2d4-badc-5575-98cd-83c9c6293313',1,'L1','a3c59f94-22f0-5904-a369-4879931e9953','weighed',1000000,'2026-11-03','2026-10-30',24000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('459e1de1-ade9-5cb0-a321-2ad3afc1783d',24000,21000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('ef1a4c05-698a-5175-8ad9-541481c5af7b','L-0431','7895283a-cbd1-5055-bafb-af5de4f9a570','c833b2d4-badc-5575-98cd-83c9c6293313',1,'L1','c19e3589-929e-53cb-826f-485ceedffb02','weighed',500000,'2026-11-03','2026-10-30',23500,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('ef1a4c05-698a-5175-8ad9-541481c5af7b',23500,21000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('411c61e0-ecad-58fa-9c00-2b87d2fae46a','L-0440','8a156877-0fdb-530f-9e5e-9edc90407a76','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'A','aa96521e-588a-5358-a144-a00234034579','estimated',4000000,'2026-11-06','2026-10-25',75000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('411c61e0-ecad-58fa-9c00-2b87d2fae46a',75000,70000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('5b6b9d61-2beb-52f6-bd0b-1076d3006ad5','L-0441','eb3a16c1-7742-57c2-82d2-ff9b0ffc44c4','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'A','4fd9ebc3-1d96-574c-bbc8-b25541ed027a','estimated',3800000,'2026-11-06','2026-10-25',74000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('5b6b9d61-2beb-52f6-bd0b-1076d3006ad5',74000,70000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('272bb93a-7da2-5783-ab66-a940e2cec91a','L-0442','49744023-6298-5f6d-9ba5-20373d61c78f','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'A','d2d680ef-de5e-50e7-8b10-c28d35705b22','estimated',3800000,'2026-11-06','2026-10-25',74000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('272bb93a-7da2-5783-ab66-a940e2cec91a',74000,70000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('f345e79f-d7a7-51b9-ad5f-fcbcc441e936','L-0443','ef15a063-699a-5cdb-a830-16411b107217','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'A','19d6f57b-911f-51c6-8bae-92de2686ab32','estimated',3800000,'2026-11-06','2026-10-25',74000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('f345e79f-d7a7-51b9-ad5f-fcbcc441e936',74000,70000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('623a1c22-9738-5fbd-bb85-7c2dc08dd22a','L-0444','c7ac93c5-acb1-54dc-86ca-24aa0aadd0a9','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'A','a701b690-79d7-5e31-83cb-20a9e9bd0582','estimated',3800000,'2026-11-06','2026-10-25',74000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('623a1c22-9738-5fbd-bb85-7c2dc08dd22a',74000,70000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('25af0842-82f1-5852-81ae-1abbbfb2a8b9','L-0445','e4af89b0-068e-5d4a-8c07-9fe4c8fde075','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'A','051d6e9f-ed6b-58a5-8a1a-51e3a23f9f7c','estimated',3800000,'2026-11-06','2026-10-25',74000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('25af0842-82f1-5852-81ae-1abbbfb2a8b9',74000,70000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('5035c00d-4d23-5cb5-9a2d-018bff1f38cf','L-0447','7fd4ec19-e445-577f-83bf-968df80a6db1','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'A','e9791763-7248-583b-a4ed-8c48fee512c5','estimated',3800000,'2026-11-07','2026-10-25',74000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('5035c00d-4d23-5cb5-9a2d-018bff1f38cf',74000,70000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('8ff3adcb-202d-5916-a93e-d9f3ca292d7a','L-0450','b1e78de3-922a-54aa-a02c-e6b7c326a667','c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'L1','574d25bb-b204-56d9-a486-c439458256b0','weighed',2000000,'2026-11-02','2026-10-28',14000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('8ff3adcb-202d-5916-a93e-d9f3ca292d7a',14000,12500,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('d8e4acb6-ef05-5a43-b3d2-62b08de1ab3c','L-0451','b1e78de3-922a-54aa-a02c-e6b7c326a667','c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed',1,'L2','574d25bb-b204-56d9-a486-c439458256b0','weighed',400000,'2026-11-02','2026-10-28',9000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('d8e4acb6-ef05-5a43-b3d2-62b08de1ab3c',9000,7000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('e6e42708-a414-5f53-8880-fa8eeee51e28','L-0460','b57a1a80-943c-5fc3-93f1-3bf25dd35ea5','3197ac78-8690-508d-ab58-eba8e7df742e',1,'L1','c4efb127-1ce9-582b-b8e5-1858c100756c','weighed',3000000,'2026-11-02','2026-10-20',31000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('e6e42708-a414-5f53-8880-fa8eeee51e28',31000,28000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('31baa599-8cfa-5152-9e63-fd04b8b741c5','L-0470','7fcb5c94-36cb-5ecb-a5e3-fb7217cf38c7','9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'48-52','589d52a6-9ed2-5fb6-a6a8-2b7a3020c1b2','estimated',1500000,'2026-11-05','2026-10-22',120000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('31baa599-8cfa-5152-9e63-fd04b8b741c5',120000,112000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('32f60d74-ff0d-52a7-b7e9-6e51733c7d8d','L-0480','d4942162-e8a5-52e0-af80-950d32834e9b','5aded288-3224-5d1e-b474-7b59d2098852',1,'OM18-am25','942abec7-43a7-59cb-8466-80bd0e8e21d4','estimated',30000000,'2026-11-04',NULL,6700,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('32f60d74-ff0d-52a7-b7e9-6e51733c7d8d',6700,6400,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('adf74969-5312-58c4-8b12-82f1463691ff','L-0490','9aa68b07-b920-5863-9bcb-5715b1ebb886','e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'chua_tach','4b2bedaa-6b27-57c9-9c6f-dafecc233c4a','weighed',5000000,'2026-11-02','2026-10-28',NULL,'2026-11-02T08:00:00+07:00','draft','2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('fcbc89fd-4a29-5e63-a8f8-8ddd8a681f98','L-0495','c417ced1-dace-5ca9-8906-bf1d40cc689d','a201a368-04e1-5da1-a80e-53280e3106a8',1,'0.8-1.2','9d7bb148-2ea3-5f6a-b85f-331bd5d9a4f2','estimated',20000000,'2026-11-10','2026-10-25',30000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('fcbc89fd-4a29-5e63-a8f8-8ddd8a681f98',30000,28000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('3aa573f7-1eca-58b2-8837-61eda8cd3c1b','NC-3001','d45094f9-fea4-519a-a3c3-c9a50c9808a5','processor','c833b2d4-badc-5575-98cd-83c9c6293313',1,daterange('2026-11-03','2026-11-05'::date+1,'[)'),'self_pickup','6bf44f2f-b9cd-5e3b-aeb0-bb5d7b1c4db2','single_lot',ARRAY[]::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('3ff70ce5-033e-5184-813a-53416331d298','3aa573f7-1eca-58b2-8837-61eda8cd3c1b','L1',2000000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('3ff70ce5-033e-5184-813a-53416331d298',24000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('8906fbec-a958-51cb-9d82-12d4938936b0','NC-3002','d45094f9-fea4-519a-a3c3-c9a50c9808a5','processor','c833b2d4-badc-5575-98cd-83c9c6293313',1,daterange('2026-11-03','2026-11-15'::date+1,'[)'),'delivered','6bf44f2f-b9cd-5e3b-aeb0-bb5d7b1c4db2','needs_pooling',ARRAY[]::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('4212949b-2faf-571a-aaac-c86bcd23f73a','8906fbec-a958-51cb-9d82-12d4938936b0','L2',3000000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('4212949b-2faf-571a-aaac-c86bcd23f73a',16000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('0e70db0e-1b92-5aed-85c6-56fd75da7798','8906fbec-a958-51cb-9d82-12d4938936b0','L3',2000000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('0e70db0e-1b92-5aed-85c6-56fd75da7798',7000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('7eba224b-7023-5680-82b0-f00cabc80235','NC-3003','5dafca77-a17a-5f90-b68a-7766e3c64f71','export','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,daterange('2026-11-06','2026-11-09'::date+1,'[)'),'self_pickup','ced136e3-3a01-5fc1-a9d4-af58c4bc9fef','needs_pooling',ARRAY['ma_vung_trong:TQ','nhat_ky_cach_ly','kiem_dinh:cadimi_vang_o']::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('b38e9350-6f7c-5f93-8979-6380e646d802','7eba224b-7023-5680-82b0-f00cabc80235','A',18000000,1000000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('b38e9350-6f7c-5f93-8979-6380e646d802',74000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('97017a4b-8e10-59ae-aee2-7405778c4665','NC-3004','a9179290-5f66-5741-8c32-412e6df6659a','export','9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,daterange('2026-11-05','2026-11-06'::date+1,'[)'),'self_pickup','a33a6a0f-1c08-56d1-b350-659ac581488f','single_lot',ARRAY['nhat_ky_ao','kiem_dinh:khang_sinh']::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('707560bd-93fb-5488-b8c2-9bed6f9725bf','97017a4b-8e10-59ae-aee2-7405778c4665','48-52',1500000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('707560bd-93fb-5488-b8c2-9bed6f9725bf',120000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('a61a7821-be4e-5bc6-80ea-d3dc9d9dde83','NC-3005','82ccf63a-b708-55a4-919d-3d94904bc60d','wholesaler','3197ac78-8690-508d-ab58-eba8e7df742e',1,daterange('2026-11-02','2026-11-04'::date+1,'[)'),'self_pickup','b6e7daa4-1d7f-5ee5-8c08-c8d8306f8f65','single_lot',ARRAY[]::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('24f7c798-fa9e-5375-a4a2-8619e2c2343a','a61a7821-be4e-5bc6-80ea-d3dc9d9dde83','L1',3000000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('24f7c798-fa9e-5375-a4a2-8619e2c2343a',31000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('f8aa5094-38c5-5e52-a81b-5f78546acb64','NC-3006','53d91dba-4084-5f67-a40a-73bf4c3c74e2','wholesaler','5aded288-3224-5d1e-b474-7b59d2098852',1,daterange('2026-11-04','2026-11-05'::date+1,'[)'),'self_pickup','9c42fe22-6d90-561b-b32f-aae4bc611233','single_lot',ARRAY[]::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('06068c00-2b7c-57b6-88ce-8cdb5d33ea88','f8aa5094-38c5-5e52-a81b-5f78546acb64','OM18-am25',30000000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('06068c00-2b7c-57b6-88ce-8cdb5d33ea88',6800,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('13727e8a-727d-5909-98c9-a87d3e3f65a4','NC-3007','82ccf63a-b708-55a4-919d-3d94904bc60d','wholesaler','c833b2d4-badc-5575-98cd-83c9c6293313',1,daterange('2026-11-04','2026-11-04'::date+1,'[)'),'self_pickup','b6e7daa4-1d7f-5ee5-8c08-c8d8306f8f65','needs_pooling',ARRAY[]::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('99a51def-83ff-5067-85ad-780a4b132c1e','13727e8a-727d-5909-98c9-a87d3e3f65a4','L1',200000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('99a51def-83ff-5067-85ad-780a4b132c1e',23500,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('e75514f2-40fa-5ec3-9f2d-e3ba3dda398e','NC-3008','d45094f9-fea4-519a-a3c3-c9a50c9808a5','processor','c833b2d4-badc-5575-98cd-83c9c6293313',1,daterange('2026-11-03','2026-11-06'::date+1,'[)'),'self_pickup','6bf44f2f-b9cd-5e3b-aeb0-bb5d7b1c4db2','single_lot',ARRAY[]::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('b4883848-43a6-581e-ada0-12db4fd1583a','e75514f2-40fa-5ec3-9f2d-e3ba3dda398e','L1',2500000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('b4883848-43a6-581e-ada0-12db4fd1583a',24000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('29e274ab-5c6c-5b37-a688-d59c388f2182','HĐ-1901','82ccf63a-b708-55a4-919d-3d94904bc60d','7ed1d074-9269-579f-bd58-252d11f24586','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,23500,'2026-10-05T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('cda7a57f-29ad-5c19-b355-ad918ee73cc1','HĐ-1902','99177a1f-dc84-588e-95bd-199401da0ed3','7895283a-cbd1-5055-bafb-af5de4f9a570','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,24000,'2026-10-06T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('a31c9653-49f1-5e77-a79d-7c3ef0c49544','HĐ-1903','d45094f9-fea4-519a-a3c3-c9a50c9808a5','d191fddf-821f-503c-b45c-2461f1c1eba7','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,24000,'2026-10-07T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('45df9347-624d-5a9d-982e-de853c8c1f93','HĐ-1904','82ccf63a-b708-55a4-919d-3d94904bc60d','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,24500,'2026-10-08T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('4442b3f1-f605-56df-8dc0-489888a4001f','HĐ-1905','82ccf63a-b708-55a4-919d-3d94904bc60d','7ed1d074-9269-579f-bd58-252d11f24586','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,24500,'2026-10-09T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('a8716330-3b7a-5306-9aec-b5591ce86b34','HĐ-1906','99177a1f-dc84-588e-95bd-199401da0ed3','7895283a-cbd1-5055-bafb-af5de4f9a570','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,25000,'2026-10-10T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('f7775153-d5b6-5a3c-b0d7-a51a7da38b9a','HĐ-1907','d45094f9-fea4-519a-a3c3-c9a50c9808a5','d191fddf-821f-503c-b45c-2461f1c1eba7','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,25000,'2026-10-11T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('d47de70a-85ff-50ea-927b-fec3f46a0337','HĐ-1908','82ccf63a-b708-55a4-919d-3d94904bc60d','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,25000,'2026-10-12T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('93bcc276-81e7-5473-a1ae-fe8ab37b9bd1','HĐ-1909','82ccf63a-b708-55a4-919d-3d94904bc60d','7ed1d074-9269-579f-bd58-252d11f24586','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,25000,'2026-10-13T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('f58a42f4-1a05-51d6-94dd-d7307a320a5b','HĐ-1910','99177a1f-dc84-588e-95bd-199401da0ed3','7895283a-cbd1-5055-bafb-af5de4f9a570','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,25500,'2026-10-14T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('515cd717-2b4a-5fef-b884-a223bc3bbd4c','HĐ-1911','d45094f9-fea4-519a-a3c3-c9a50c9808a5','d191fddf-821f-503c-b45c-2461f1c1eba7','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,25500,'2026-10-15T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('80096740-4b95-58e4-8979-9e912b5e9e1d','HĐ-1912','82ccf63a-b708-55a4-919d-3d94904bc60d','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,26000,'2026-10-16T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('af28a4b7-3e41-5c60-9cd6-9dd4df663a94','HĐ-1913','82ccf63a-b708-55a4-919d-3d94904bc60d','7ed1d074-9269-579f-bd58-252d11f24586','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,26000,'2026-10-17T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('a08d7025-bc2d-5d5e-a9a7-91f362f81504','HĐ-1914','99177a1f-dc84-588e-95bd-199401da0ed3','7895283a-cbd1-5055-bafb-af5de4f9a570','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1000000,26500,'2026-10-18T12:00:00+07:00','DT',false,true,'du-lieu-ao.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('8b54ec72-e9c6-5a92-a751-8844f2afe441','HĐ-1015','82ccf63a-b708-55a4-919d-3d94904bc60d','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313','L1',800000,24500,'2026-10-15T12:00:00+07:00','DT',true,true,'du-lieu-ao.json');
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313','L1',25000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313','L2',15000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('c833b2d4-badc-5575-98cd-83c9c6293313','L3',6000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed','L1',14000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('c7dbdc6e-ec3c-540b-bd13-0ecf2c0fe6ed','L2',9000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2','48-52',120000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('5aded288-3224-5d1e-b474-7b59d2098852','OM18-am25',6600,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('8ebec77f-09a6-5ef3-b660-69a681ca86bc','A',75000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('3197ac78-8690-508d-ab58-eba8e7df742e','L1',32000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055','L1',18000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('e6b1cf34-b6af-556f-a9ff-f65abcb58055','L2',9000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO mkt.external_prices(product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data) VALUES('a201a368-04e1-5da1-a80e-53280e3106a8','0.8-1.2',30000,'Giá giả định từ JSON, không dùng tính cọc','2026-11-02',true);
INSERT INTO core.framework_contracts(id,code,buyer_org_id,seller_org_id,segment_code,schedule,price_period,billing_period,framework_deposit_vnd,extra_credit_vnd,fee_bps,active_during,policy_version_id,status) VALUES('14ee53b4-34d2-5bfa-9fd3-e7c41f02a6d9','KH-2003','0c4280e9-e23b-55f1-898e-ce29dfe45ace','d191fddf-821f-503c-b45c-2461f1c1eba7','horeca','{"lich": ["thu_2", "thu_5"], "mon": [{"mat_hang": "XOAI_CAT_CHU", "loai": "L1", "kg": 30, "gia": 26000}, {"mat_hang": "THANH_LONG", "loai": "L1", "kg": 20, "gia": 19000}]}'::jsonb,'week','week',1160000,1500000,0,daterange('2026-10-01','2027-01-01','[)'),1,'running');
INSERT INTO core.deposits(id,framework_id,payer_org_id,expected_deposit_vnd,expected_fee_vnd,payment_ref,virtual_account_no) VALUES('5712e360-f315-5fec-83fb-f114b3fd9248','14ee53b4-34d2-5bfa-9fd3-e7c41f02a6d9','0c4280e9-e23b-55f1-898e-ce29dfe45ace',1160000,0,'AGV KH-2003 COC','THU-COC-KH-2003');
PERFORM ledger.post('imported_framework_deposit',NULL,'imported-deposit:KH-2003','Số dư đầu kỳ nhập khẩu KH-2003 từ du-lieu-ao.json',jsonb_build_array(jsonb_build_object('type','deposit_escrow','framework','14ee53b4-34d2-5bfa-9fd3-e7c41f02a6d9','amount',1160000),jsonb_build_object('type','external','org','0c4280e9-e23b-55f1-898e-ce29dfe45ace','amount',-1160000)),now(),NULL,NULL,jsonb_build_object('framework','14ee53b4-34d2-5bfa-9fd3-e7c41f02a6d9'));
UPDATE core.deposits SET status='held' WHERE id='5712e360-f315-5fec-83fb-f114b3fd9248';
INSERT INTO core.framework_opening_exposures(framework_id,unpaid_delivered_vnd,scheduled_vnd,source_key,as_of) VALUES('14ee53b4-34d2-5bfa-9fd3-e7c41f02a6d9',1160000,1420000,'du-lieu-ao.json','2026-11-02T08:00:00+07:00');
INSERT INTO core.framework_contracts(id,code,buyer_org_id,seller_org_id,segment_code,schedule,price_period,billing_period,framework_deposit_vnd,extra_credit_vnd,fee_bps,active_during,policy_version_id,status) VALUES('9fa672a8-b4c9-5f13-a111-636112aa72e2','KH-2006','e8571283-c2ff-578c-8e7a-becaa244774a','82ccf63a-b708-55a4-919d-3d94904bc60d','horeca','{"lich": ["thu_3", "thu_6"], "mon": [{"mat_hang": "CHANH_KHONG_HAT", "loai": "L1", "kg": 10, "gia": 16000}, {"mat_hang": "XOAI_CAT_CHU", "loai": "L2", "kg": 15, "gia": 18000}]}'::jsonb,'week','week',860000,200000,100,daterange('2026-10-01','2027-01-01','[)'),1,'running');
INSERT INTO core.deposits(id,framework_id,payer_org_id,expected_deposit_vnd,expected_fee_vnd,payment_ref,virtual_account_no) VALUES('73a2f976-1c00-5e17-a7bc-a388e8830dff','9fa672a8-b4c9-5f13-a111-636112aa72e2','e8571283-c2ff-578c-8e7a-becaa244774a',860000,0,'AGV KH-2006 COC','THU-COC-KH-2006');
PERFORM ledger.post('imported_framework_deposit',NULL,'imported-deposit:KH-2006','Số dư đầu kỳ nhập khẩu KH-2006 từ du-lieu-ao.json',jsonb_build_array(jsonb_build_object('type','deposit_escrow','framework','9fa672a8-b4c9-5f13-a111-636112aa72e2','amount',860000),jsonb_build_object('type','external','org','e8571283-c2ff-578c-8e7a-becaa244774a','amount',-860000)),now(),NULL,NULL,jsonb_build_object('framework','9fa672a8-b4c9-5f13-a111-636112aa72e2'));
UPDATE core.deposits SET status='held' WHERE id='73a2f976-1c00-5e17-a7bc-a388e8830dff';
INSERT INTO core.framework_opening_exposures(framework_id,unpaid_delivered_vnd,scheduled_vnd,source_key,as_of) VALUES('9fa672a8-b4c9-5f13-a111-636112aa72e2',0,0,'du-lieu-ao.json','2026-11-02T08:00:00+07:00');
INSERT INTO core.imported_offtake_plans(id,code,buyer_org_id,seller_org_id,product_id,grade_code,deposit_vnd,materials_advance_vnd,formula_text,payment_after_days,source_key) VALUES('53f1ec38-7e18-57c4-9cf7-9249517ac512','BT-2005','99177a1f-dc84-588e-95bd-199401da0ed3','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313','L1',9000000,15000000,'max(18000, 0.9 * P_tk_L1_ngay_giao)',7,'du-lieu-ao.json');
INSERT INTO core.imported_offtake_batches(plan_id,batch_no,committed_qty,materials_offset_vnd,source_status) VALUES('53f1ec38-7e18-57c4-9cf7-9249517ac512',1,3000000,5000000,'da_chot');
INSERT INTO core.imported_offtake_batches(plan_id,batch_no,committed_qty,materials_offset_vnd,source_status) VALUES('53f1ec38-7e18-57c4-9cf7-9249517ac512',2,2800000,5000000,'cho_chuan_bi');
INSERT INTO core.imported_offtake_batches(plan_id,batch_no,committed_qty,materials_offset_vnd,source_status) VALUES('53f1ec38-7e18-57c4-9cf7-9249517ac512',3,3200000,5000000,'cho_chuan_bi');
INSERT INTO core.vehicles(id,org_id,plate_no,kind,capacity_qty) VALUES('30083539-10b0-5b92-80a3-df4c547d38ec','c0a22526-e753-5915-b4d0-d0a3ee4076a4','66C-123.45','reefer',2500000);
INSERT INTO core.vehicles(id,org_id,plate_no,kind,capacity_qty) VALUES('b4863eb3-6121-53f0-8587-fab132912c7c','c0a22526-e753-5915-b4d0-d0a3ee4076a4','66C-678.90','normal',5000000);
INSERT INTO core.substandard_receivers(buyer_org_id,product_id,grade_codes,min_qty,radius_km,standing_price_vnd,is_offtake_partner,floor_price_vnd,valid_during) VALUES('d45094f9-fea4-519a-a3c3-c9a50c9808a5','c833b2d4-badc-5575-98cd-83c9c6293313',ARRAY['L2']::text[],500000,200,NULL,false,NULL,daterange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.substandard_receivers(buyer_org_id,product_id,grade_codes,min_qty,radius_km,standing_price_vnd,is_offtake_partner,floor_price_vnd,valid_during) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','c833b2d4-badc-5575-98cd-83c9c6293313',ARRAY['L2']::text[],300000,100,NULL,true,5000,daterange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.substandard_receivers(buyer_org_id,product_id,grade_codes,min_qty,radius_km,standing_price_vnd,is_offtake_partner,floor_price_vnd,valid_during) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','c833b2d4-badc-5575-98cd-83c9c6293313',ARRAY['L3']::text[],300000,100,NULL,true,5000,daterange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.substandard_receivers(buyer_org_id,product_id,grade_codes,min_qty,radius_km,standing_price_vnd,is_offtake_partner,floor_price_vnd,valid_during) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','e6b1cf34-b6af-556f-a9ff-f65abcb58055',ARRAY['L2']::text[],500000,100,NULL,true,5000,daterange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.substandard_receivers(buyer_org_id,product_id,grade_codes,min_qty,radius_km,standing_price_vnd,is_offtake_partner,floor_price_vnd,valid_during) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','e6b1cf34-b6af-556f-a9ff-f65abcb58055',ARRAY['DAT']::text[],500000,100,NULL,true,5000,daterange('2026-10-01','2027-01-01','[)'));
REFRESH MATERIALIZED VIEW mkt.reference_prices;
PERFORM set_config('app.allow_any_initial','off',true);
END $seed$;
SELECT set_config('app.nap_du_lieu_cu','off',false);
