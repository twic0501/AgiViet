SELECT set_config('app.nap_du_lieu_cu','on',false); -- dữ liệu ảo cũ có thương lái, người giúp (bản 23 không tạo mới)
-- Tự sinh từ du-lieu-cho.json bằng db/tools/tao-seed.py. Không sửa tay.
DO $seed$ BEGIN
IF EXISTS(SELECT 1 FROM ops.seed_sources WHERE source_key='du-lieu-cho.json') THEN
 IF NOT EXISTS(SELECT 1 FROM ops.seed_sources WHERE source_key='du-lieu-cho.json' AND sha256=decode('4404a3b07e3b0e8df71a71a7332ee938a1504d786a79f5a6179bc34421e0f15c','hex')) THEN RAISE EXCEPTION 'Nguồn seed đổi: dùng DB thử mới'; END IF;
 RETURN; END IF;
ALTER TABLE core.membership_role_grants DISABLE TRIGGER a_privilege;
ALTER TABLE core.membership_role_grants DISABLE TRIGGER z_notify_grant;
PERFORM set_config('app.allow_any_initial','on',true);
PERFORM set_config('app.actor_kind','system',true);
PERFORM set_config('app.test_time','2026-11-02T08:00:00+07:00',true);
INSERT INTO ops.seed_sources(source_key,sha256,payload) VALUES('du-lieu-cho.json',decode('4404a3b07e3b0e8df71a71a7332ee938a1504d786a79f5a6179bc34421e0f15c','hex'),'{
  "meta": {
    "ten": "Chợ mẫu AgiViet: 5 nhà bán + 5 bên mua",
    "phien_ban": "2026-11-01",
    "dong_ho_nen": "2026-11-02T08:00:00+07:00",
    "ghi_chu": "Mọi tên, mã số, tài khoản là hư cấu. Mỗi số đăng ký có hàng/nhu cầu riêng trên cùng một chợ; bên kia giao dịch do đối tác ảo (AI đóng vai) đáp lại."
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
        },
        {
          "bien_so": "66C-246.80",
          "loai": "thuong",
          "tai_kg": 8000,
          "tai_xe": "ND-202"
        },
        {
          "bien_so": "66C-135.79",
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
  "to_chuc_ban": [
    {
      "ma": "TC-B01",
      "ten": "Hộ Nguyễn Thị Năm",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Mỹ Xương, Cao Lãnh, Đồng Tháp",
      "tinh": "DT",
      "kieu_vung": "orchard",
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
      "ten": "Hộ Lý Văn Tư",
      "phia": "ban",
      "loai": "trang_trai",
      "dia_ban": "Cai Lậy, Đồng Tháp",
      "tinh": "DT",
      "kieu_vung": "orchard",
      "mat_hang": [
        "SAU_RIENG"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Vietcombank",
        "so": "THU-0071000610610",
        "chu": "Lý Văn Tư"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 88,
      "so_don_hoan_tat": 9,
      "giay_to": [
        {
          "loai": "ma_vung_trong",
          "ma": "MVT-DT-0610",
          "thi_truong": [
            "TQ"
          ],
          "trang_thai": "da_xac_minh",
          "hieu_luc_den": "2027-03-31"
        }
      ]
    },
    {
      "ma": "TC-B03",
      "ten": "HTX Tân Thuận",
      "phia": "ban",
      "loai": "htx",
      "dia_ban": "Chợ Gạo, Đồng Tháp",
      "tinh": "DT",
      "kieu_vung": "orchard",
      "mat_hang": [
        "THANH_LONG",
        "XOAI_CAT_CHU"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000003000",
        "chu": "HTX Tân Thuận"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 90,
      "so_don_hoan_tat": 31,
      "giay_to": [
        {
          "loai": "vietgap",
          "trang_thai": "da_xac_minh"
        }
      ],
      "ten_diem_gom": "Điểm gom HTX Tân Thuận"
    },
    {
      "ma": "TC-B04",
      "ten": "Hộ Phan Thị Hồng",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Mỹ Xuyên, Cần Thơ",
      "tinh": "CT",
      "kieu_vung": "pond",
      "mat_hang": [
        "TOM_THE"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Sacombank",
        "so": "THU-0400000880880",
        "chu": "Phan Thị Hồng"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 86,
      "so_don_hoan_tat": 6,
      "giay_to": [
        {
          "loai": "nhat_ky_ao",
          "trang_thai": "da_xac_minh"
        }
      ]
    },
    {
      "ma": "TC-B05",
      "ten": "Hộ Trần Văn Sáu",
      "phia": "ban",
      "loai": "ho",
      "dia_ban": "Tháp Mười, Đồng Tháp",
      "tinh": "DT",
      "kieu_vung": "field",
      "mat_hang": [
        "LUA_TUOI"
      ],
      "tai_khoan_nhan_tien": {
        "ngan_hang": "Agribank",
        "so": "THU-7300000009500",
        "chu": "Trần Văn Sáu"
      },
      "xac_minh": "da_xac_minh",
      "uy_tin": 84,
      "so_don_hoan_tat": 12,
      "giay_to": []
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
      "tinh": "HCM",
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
      "dia_chi_nhan": "Kho Mỹ Tho, Đồng Tháp",
      "tinh": "DT",
      "xac_minh": "da_xac_minh",
      "han_muc_ky": {
        "ND-105": 300000000
      }
    },
    {
      "ma": "TC-M03",
      "ten": "Nhà hàng Bếp Sen",
      "phia": "mua",
      "phan_khuc": [
        "nha_hang"
      ],
      "goi": "bep",
      "mst": "0319990005",
      "dia_chi_nhan": "Quận 3, TP.HCM",
      "tinh": "HCM",
      "kieu_co_so": "restaurant",
      "xac_minh": "da_xac_minh",
      "han_muc_ky": {
        "ND-112": 20000000
      }
    },
    {
      "ma": "TC-M04",
      "ten": "Vựa nông sản Ba Cường",
      "phia": "mua",
      "phan_khuc": [
        "dau_moi"
      ],
      "goi": "mien_phi",
      "dia_chi_nhan": "Cao Lãnh, Đồng Tháp",
      "tinh": "DT",
      "thuong_lai": true,
      "xac_minh": "da_xac_minh",
      "doi_tac_bao_tieu": true,
      "gia_san_bao_tieu": [
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": "L2",
          "gia": 9000
        },
        {
          "mat_hang": "THANH_LONG",
          "loai": "L2",
          "gia": 6000
        }
      ],
      "nhan_hang_kem_loai": [
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": "L2",
          "kg_toi_thieu": 300,
          "ban_kinh_km": 100,
          "gia_chao_san": 12000
        },
        {
          "mat_hang": "THANH_LONG",
          "loai": "L2",
          "kg_toi_thieu": 500,
          "ban_kinh_km": 100,
          "gia_chao_san": 9000
        }
      ]
    },
    {
      "ma": "TC-M05",
      "ten": "Công ty Thủy sản Biển Xanh",
      "phia": "mua",
      "phan_khuc": [
        "xuat_khau"
      ],
      "goi": "doanh_nghiep",
      "mst": "0319990003",
      "dia_chi_nhan": "KCN Trà Nóc, Cần Thơ",
      "tinh": "CT",
      "xac_minh": "da_xac_minh",
      "han_muc_ky": {
        "ND-108": 400000000
      }
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
      "ma": "ND-011",
      "ho_ten": "Lý Văn Tư",
      "dien_thoai": "0977000610",
      "to_chuc": "TC-B02",
      "vai": "chu"
    },
    {
      "ma": "ND-021",
      "ho_ten": "Võ Văn Thuận",
      "dien_thoai": "0907000300",
      "to_chuc": "TC-B03",
      "vai": "chu_nhiem"
    },
    {
      "ma": "ND-022",
      "ho_ten": "Lê Thị Mai",
      "dien_thoai": "0907000301",
      "to_chuc": "TC-B03",
      "vai": "ke_toan_htx"
    },
    {
      "ma": "ND-023",
      "ho_ten": "Đỗ Văn Gom",
      "dien_thoai": "0907000302",
      "to_chuc": "TC-B03",
      "vai": "nhan_vien_diem_gom"
    },
    {
      "ma": "ND-031",
      "ho_ten": "Phan Thị Hồng",
      "dien_thoai": "0945000880",
      "to_chuc": "TC-B04",
      "vai": "chu"
    },
    {
      "ma": "ND-041",
      "ho_ten": "Trần Văn Sáu",
      "dien_thoai": "0919000950",
      "to_chuc": "TC-B05",
      "vai": "chu"
    },
    {
      "ma": "ND-101",
      "ho_ten": "Phạm Thị Hạnh",
      "dien_thoai": "0909000210",
      "to_chuc": "TC-M01",
      "vai": "mua_hang"
    },
    {
      "ma": "ND-102",
      "ho_ten": "Ngô Văn Kế",
      "dien_thoai": "0909000211",
      "to_chuc": "TC-M01",
      "vai": "ke_toan"
    },
    {
      "ma": "ND-103",
      "ho_ten": "Lưu Văn Kho",
      "dien_thoai": "0909000212",
      "to_chuc": "TC-M01",
      "vai": "kho"
    },
    {
      "ma": "ND-104",
      "ho_ten": "Trịnh Quốc Thịnh",
      "dien_thoai": "0909000213",
      "to_chuc": "TC-M01",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-105",
      "ho_ten": "Đặng Minh Quân",
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
      "ho_ten": "Hồ Thị Lệ",
      "dien_thoai": "0903000412",
      "to_chuc": "TC-M02",
      "vai": "ke_toan"
    },
    {
      "ma": "ND-112",
      "ho_ten": "Võ Thanh Sen",
      "dien_thoai": "0908000510",
      "to_chuc": "TC-M03",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-113",
      "ho_ten": "Trần Bếp Phó",
      "dien_thoai": "0908000511",
      "to_chuc": "TC-M03",
      "vai": "nguoi_nhan"
    },
    {
      "ma": "ND-115",
      "ho_ten": "Lâm Văn Cường",
      "dien_thoai": "0938000610",
      "to_chuc": "TC-M04",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-108",
      "ho_ten": "Huỳnh Thị Biển",
      "dien_thoai": "0902000810",
      "to_chuc": "TC-M05",
      "vai": "quan_ly"
    },
    {
      "ma": "ND-109",
      "ho_ten": "Châu Văn Lạnh",
      "dien_thoai": "0902000811",
      "to_chuc": "TC-M05",
      "vai": "kho"
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
      "luong_kg": 1500,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-02",
      "het_cach_ly": "2026-11-02",
      "gia_mong_muon": 16500,
      "gia_thap_nhat_kin": 14500,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0414",
      "ban": "TC-B01",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "luong_kg": 2500,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-12",
      "het_cach_ly": "2026-11-12",
      "gia_mong_muon": 25000,
      "gia_thap_nhat_kin": 22500,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0440",
      "ban": "TC-B02",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "luong_kg": 3000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-03",
      "het_cach_ly": "2026-11-03",
      "gia_mong_muon": 92000,
      "gia_thap_nhat_kin": 86000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0441",
      "ban": "TC-B02",
      "mat_hang": "SAU_RIENG",
      "loai": "B",
      "luong_kg": 1200,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-03",
      "het_cach_ly": "2026-11-03",
      "gia_mong_muon": 72000,
      "gia_thap_nhat_kin": 66000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0447",
      "ban": "TC-B02",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "luong_kg": 5000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-20",
      "het_cach_ly": "2026-11-20",
      "gia_mong_muon": 90000,
      "gia_thap_nhat_kin": 85000,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0490",
      "ban": "TC-B03",
      "mat_hang": "THANH_LONG",
      "loai": "L1",
      "luong_kg": 6000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-02",
      "het_cach_ly": "2026-11-02",
      "gia_mong_muon": 19000,
      "gia_thap_nhat_kin": 17000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0491",
      "ban": "TC-B03",
      "mat_hang": "THANH_LONG",
      "loai": "L2",
      "luong_kg": 2000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-02",
      "het_cach_ly": "2026-11-02",
      "gia_mong_muon": 12000,
      "gia_thap_nhat_kin": 10500,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0492",
      "ban": "TC-B03",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "luong_kg": 1000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-03",
      "het_cach_ly": "2026-11-03",
      "gia_mong_muon": 25500,
      "gia_thap_nhat_kin": 23000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0470",
      "ban": "TC-B04",
      "mat_hang": "TOM_THE",
      "loai": "48-52",
      "luong_kg": 2500,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-04",
      "het_cach_ly": "2026-11-04",
      "gia_mong_muon": 135000,
      "gia_thap_nhat_kin": 128000,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0471",
      "ban": "TC-B04",
      "mat_hang": "TOM_THE",
      "loai": "53-60",
      "luong_kg": 1500,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-15",
      "het_cach_ly": "2026-11-15",
      "gia_mong_muon": 120000,
      "gia_thap_nhat_kin": 114000,
      "trang_thai": "sap_co_hang"
    },
    {
      "ma": "L-0480",
      "ban": "TC-B05",
      "mat_hang": "LUA_TUOI",
      "loai": "OM18-am25",
      "luong_kg": 20000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-03",
      "het_cach_ly": "2026-11-03",
      "gia_mong_muon": 7200,
      "gia_thap_nhat_kin": 6800,
      "trang_thai": "dang_ban"
    },
    {
      "ma": "L-0481",
      "ban": "TC-B05",
      "mat_hang": "LUA_TUOI",
      "loai": "OM18-am25",
      "luong_kg": 12000,
      "uoc_tinh": true,
      "ngay_co_hang": "2026-11-25",
      "het_cach_ly": "2026-11-25",
      "gia_mong_muon": 7300,
      "gia_thap_nhat_kin": 6900,
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
        "2026-11-06"
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
          "kg": 1500,
          "gia_toi_da_kin": 17000,
          "kg_toi_thieu_moi_nguon": 300
        }
      ],
      "cua_so": [
        "2026-11-03",
        "2026-11-10"
      ],
      "kieu_giao": "tai_vuon",
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
          "kg": 3000,
          "gia_toi_da_kin": 95000
        }
      ],
      "cua_so": [
        "2026-11-04",
        "2026-11-12"
      ],
      "kieu_giao": "tai_vuon",
      "giay_to_bat_buoc": [
        "ma_vung_trong:TQ"
      ],
      "dang": "lo_mot_lan"
    },
    {
      "ma": "NC-3005",
      "mua": "TC-M03",
      "dong": [
        {
          "mat_hang": "THANH_LONG",
          "loai": [
            "L1"
          ],
          "kg": 200,
          "gia_toi_da_kin": 21000
        }
      ],
      "cua_so": [
        "2026-11-03",
        "2026-11-30"
      ],
      "kieu_giao": "tai_kho_ben_mua",
      "giay_to_bat_buoc": [],
      "dang": "lo_mot_lan"
    },
    {
      "ma": "NC-3006",
      "mua": "TC-M04",
      "dong": [
        {
          "mat_hang": "LUA_TUOI",
          "loai": [
            "OM18-am25"
          ],
          "kg": 15000,
          "gia_toi_da_kin": 7400
        }
      ],
      "cua_so": [
        "2026-11-03",
        "2026-11-08"
      ],
      "kieu_giao": "tai_diem_gom",
      "giay_to_bat_buoc": [],
      "dang": "lo_mot_lan"
    },
    {
      "ma": "NC-3004",
      "mua": "TC-M05",
      "dong": [
        {
          "mat_hang": "TOM_THE",
          "loai": [
            "48-52"
          ],
          "kg": 2000,
          "gia_toi_da_kin": 138000
        }
      ],
      "cua_so": [
        "2026-11-05",
        "2026-11-07"
      ],
      "kieu_giao": "tai_vuon",
      "giay_to_bat_buoc": [
        "nhat_ky_ao",
        "kiem_dinh:khang_sinh"
      ],
      "dang": "lo_mot_lan"
    }
  ],
  "don_nen": [
    {
      "ma": "HĐ-1901",
      "ban": "TC-B01",
      "mua": "TC-M01",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L1",
      "gia": 23500,
      "kg_dat": 1500,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-05",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1902",
      "ban": "TC-B01",
      "mua": "TC-M04",
      "mat_hang": "XOAI_CAT_CHU",
      "loai": "L2",
      "gia": 15500,
      "kg_dat": 800,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-12",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1903",
      "ban": "TC-B02",
      "mua": "TC-M02",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "gia": 88000,
      "kg_dat": 2000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-08",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1904",
      "ban": "TC-B02",
      "mua": "TC-M02",
      "mat_hang": "SAU_RIENG",
      "loai": "A",
      "gia": 90000,
      "kg_dat": 1500,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-20",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1905",
      "ban": "TC-B03",
      "mua": "TC-M03",
      "mat_hang": "THANH_LONG",
      "loai": "L1",
      "gia": 19500,
      "kg_dat": 120,
      "noi_giao": "tai_kho_ben_mua",
      "chot_ngay": "2026-10-09",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1906",
      "ban": "TC-B03",
      "mua": "TC-M04",
      "mat_hang": "THANH_LONG",
      "loai": "L2",
      "gia": 11000,
      "kg_dat": 1500,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-15",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1907",
      "ban": "TC-B04",
      "mua": "TC-M05",
      "mat_hang": "TOM_THE",
      "loai": "48-52",
      "gia": 132000,
      "kg_dat": 1200,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-10",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1908",
      "ban": "TC-B04",
      "mua": "TC-M05",
      "mat_hang": "TOM_THE",
      "loai": "48-52",
      "gia": 134000,
      "kg_dat": 1000,
      "noi_giao": "tai_vuon",
      "chot_ngay": "2026-10-24",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1909",
      "ban": "TC-B05",
      "mua": "TC-M04",
      "mat_hang": "LUA_TUOI",
      "loai": "OM18-am25",
      "gia": 7100,
      "kg_dat": 10000,
      "noi_giao": "tai_diem_gom",
      "chot_ngay": "2026-10-11",
      "trang_thai": "hoan_tat"
    },
    {
      "ma": "HĐ-1910",
      "ban": "TC-B05",
      "mua": "TC-M04",
      "mat_hang": "LUA_TUOI",
      "loai": "OM18-am25",
      "gia": 7000,
      "kg_dat": 8000,
      "noi_giao": "tai_diem_gom",
      "chot_ngay": "2026-10-25",
      "trang_thai": "hoan_tat"
    }
  ],
  "hop_dong_khung": [
    {
      "ma": "KH-2003",
      "ban": "TC-B03",
      "mua": "TC-M03",
      "lich": [
        "thu_2",
        "thu_5"
      ],
      "mon": [
        {
          "mat_hang": "THANH_LONG",
          "loai": "L1",
          "kg": 30,
          "gia": 20000
        },
        {
          "mat_hang": "XOAI_CAT_CHU",
          "loai": "L1",
          "kg": 20,
          "gia": 26000
        }
      ],
      "coc_khung": 1120000,
      "cho_no_them": 1500000,
      "da_giao_chua_tra": 1120000,
      "da_chot_sap_giao": 1120000,
      "ky_thanh_toan": "tuan"
    }
  ],
  "bao_tieu": [
    {
      "ma": "BT-2005",
      "mua": "TC-M01",
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
}
'::jsonb);
INSERT INTO ref.provinces(code,name_vi) VALUES('DT','Đồng Tháp (mã thử)');
INSERT INTO ref.provinces(code,name_vi) VALUES('CT','Cần Thơ (mã thử)');
INSERT INTO ref.provinces(code,name_vi) VALUES('TN','Tây Ninh (mã thử)');
INSERT INTO ref.provinces(code,name_vi) VALUES('VL','Vĩnh Long (mã thử)');
INSERT INTO ref.provinces(code,name_vi) VALUES('AG','An Giang (mã thử)');
INSERT INTO ref.provinces(code,name_vi) VALUES('HCM','TP.HCM (mã thử)');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('91020315-f111-5802-ae6e-81df0b59def1','TC-B01','household','Hộ Nguyễn Thị Năm',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('7ed1d074-9269-579f-bd58-252d11f24586','TC-B02','household','Hộ Lý Văn Tư',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('d191fddf-821f-503c-b45c-2461f1c1eba7','TC-B03','cooperative','HTX Tân Thuận',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','TC-B04','household','Hộ Phan Thị Hồng',NULL,true,false,false,'CT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('7895283a-cbd1-5055-bafb-af5de4f9a570','TC-B05','household','Hộ Trần Văn Sáu',NULL,true,false,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('d45094f9-fea4-519a-a3c3-c9a50c9808a5','TC-M01','enterprise','Nhà máy sấy Đồng Xanh','0319990001',false,true,false,'HCM',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('d45094f9-fea4-519a-a3c3-c9a50c9808a5','processor','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('d45094f9-fea4-519a-a3c3-c9a50c9808a5','procurement',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('5dafca77-a17a-5f90-b68a-7766e3c64f71','TC-M02','enterprise','Công ty XNK Sông Tiền','0319990002',false,true,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('5dafca77-a17a-5f90-b68a-7766e3c64f71','export','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('5dafca77-a17a-5f90-b68a-7766e3c64f71','enterprise',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('a9179290-5f66-5741-8c32-412e6df6659a','TC-M03','enterprise','Nhà hàng Bếp Sen','0319990005',false,true,false,'HCM',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('a9179290-5f66-5741-8c32-412e6df6659a','horeca','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('a9179290-5f66-5741-8c32-412e6df6659a','kitchen',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','TC-M04','trader','Vựa nông sản Ba Cường',NULL,true,true,false,'DT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','wholesaler','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','free',tstzrange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.organizations(id,code,kind,display_name,tax_code,can_sell,can_buy,is_platform,province_code,verification_level,status,created_at) VALUES('0c4280e9-e23b-55f1-898e-ce29dfe45ace','TC-M05','enterprise','Công ty Thủy sản Biển Xanh','0319990003',false,true,false,'CT',2,'active','2026-11-02T08:00:00+07:00');
INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES('0c4280e9-e23b-55f1-898e-ce29dfe45ace','export','declared');
INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('0c4280e9-e23b-55f1-898e-ce29dfe45ace','enterprise',tstzrange('2026-10-01','2027-01-01','[)'));
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
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('cdf5a785-4fcf-5d19-9a25-de85e0d54b34','Lý Văn Tư',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('cdf5a785-4fcf-5d19-9a25-de85e0d54b34',convert_to('TEST-PLAINTEXT:0977000610','UTF8'),digest('0977000610','sha256'),'0977***610','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('09654dd0-b8b7-554a-bcce-201de7feec60','7ed1d074-9269-579f-bd58-252d11f24586','cdf5a785-4fcf-5d19-9a25-de85e0d54b34',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('09654dd0-b8b7-554a-bcce-201de7feec60','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('d8c56a72-15a5-5036-aaf2-6a4885559e5b','Võ Văn Thuận',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('d8c56a72-15a5-5036-aaf2-6a4885559e5b',convert_to('TEST-PLAINTEXT:0907000300','UTF8'),digest('0907000300','sha256'),'0907***300','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('84481789-99a7-57f5-badd-e36e96f5e4d0','d191fddf-821f-503c-b45c-2461f1c1eba7','d8c56a72-15a5-5036-aaf2-6a4885559e5b',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('84481789-99a7-57f5-badd-e36e96f5e4d0','coop_board');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('84481789-99a7-57f5-badd-e36e96f5e4d0','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('4fd32a95-d3fc-52f9-93fe-97991fd8c7fb','Lê Thị Mai',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('4fd32a95-d3fc-52f9-93fe-97991fd8c7fb',convert_to('TEST-PLAINTEXT:0907000301','UTF8'),digest('0907000301','sha256'),'0907***301','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('d21f2cf6-a774-5f94-ac88-fe2e66a90b62','d191fddf-821f-503c-b45c-2461f1c1eba7','4fd32a95-d3fc-52f9-93fe-97991fd8c7fb',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('d21f2cf6-a774-5f94-ac88-fe2e66a90b62','accountant');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('8dc446ee-368f-5e9d-ad6c-17a79e993407','Đỗ Văn Gom',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('8dc446ee-368f-5e9d-ad6c-17a79e993407',convert_to('TEST-PLAINTEXT:0907000302','UTF8'),digest('0907000302','sha256'),'0907***302','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('cde80332-a3b3-5cf1-a10b-539de757929b','d191fddf-821f-503c-b45c-2461f1c1eba7','8dc446ee-368f-5e9d-ad6c-17a79e993407',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('cde80332-a3b3-5cf1-a10b-539de757929b','collection_staff');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('f76cedac-15dc-56dc-b980-b39812fe0703','Phan Thị Hồng',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('f76cedac-15dc-56dc-b980-b39812fe0703',convert_to('TEST-PLAINTEXT:0945000880','UTF8'),digest('0945000880','sha256'),'0945***880','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('0746de7d-fa57-51cd-86c8-7e27c0a89cd7','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','f76cedac-15dc-56dc-b980-b39812fe0703',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('0746de7d-fa57-51cd-86c8-7e27c0a89cd7','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('adba1794-1552-53b3-b11c-28160bcd4770','Trần Văn Sáu',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('adba1794-1552-53b3-b11c-28160bcd4770',convert_to('TEST-PLAINTEXT:0919000950','UTF8'),digest('0919000950','sha256'),'0919***950','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('db0dd01c-d3f8-5b42-8dd7-09ac4b1b68ed','7895283a-cbd1-5055-bafb-af5de4f9a570','adba1794-1552-53b3-b11c-28160bcd4770',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('db0dd01c-d3f8-5b42-8dd7-09ac4b1b68ed','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('ab32ad11-4893-58b2-b41d-703710175c8e','Phạm Thị Hạnh',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('ab32ad11-4893-58b2-b41d-703710175c8e',convert_to('TEST-PLAINTEXT:0909000210','UTF8'),digest('0909000210','sha256'),'0909***210','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('22b3b509-523b-5fdc-96c3-dbdf752e94f4','d45094f9-fea4-519a-a3c3-c9a50c9808a5','ab32ad11-4893-58b2-b41d-703710175c8e',50000000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('22b3b509-523b-5fdc-96c3-dbdf752e94f4','purchaser');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('92ac5f3d-3658-5767-8b8d-c933a4b6cf66','Ngô Văn Kế',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('92ac5f3d-3658-5767-8b8d-c933a4b6cf66',convert_to('TEST-PLAINTEXT:0909000211','UTF8'),digest('0909000211','sha256'),'0909***211','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('bb63e7e6-0b49-5296-be23-6ba4faa0ddd8','d45094f9-fea4-519a-a3c3-c9a50c9808a5','92ac5f3d-3658-5767-8b8d-c933a4b6cf66',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('bb63e7e6-0b49-5296-be23-6ba4faa0ddd8','accountant');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('50f841d1-2e92-5405-94e2-495e98a46908','Lưu Văn Kho',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('50f841d1-2e92-5405-94e2-495e98a46908',convert_to('TEST-PLAINTEXT:0909000212','UTF8'),digest('0909000212','sha256'),'0909***212','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('5418183c-3847-536a-84e9-c03e2602c02c','d45094f9-fea4-519a-a3c3-c9a50c9808a5','50f841d1-2e92-5405-94e2-495e98a46908',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('5418183c-3847-536a-84e9-c03e2602c02c','warehouse');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('473a2319-83db-5dbb-b06c-7512bd71cd8b','Trịnh Quốc Thịnh',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('473a2319-83db-5dbb-b06c-7512bd71cd8b',convert_to('TEST-PLAINTEXT:0909000213','UTF8'),digest('0909000213','sha256'),'0909***213','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('6c8df91d-6994-58cb-bd3a-8b895b179686','d45094f9-fea4-519a-a3c3-c9a50c9808a5','473a2319-83db-5dbb-b06c-7512bd71cd8b',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('6c8df91d-6994-58cb-bd3a-8b895b179686','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('56637769-2257-5058-b120-4522b1f42d46','Đặng Minh Quân',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('56637769-2257-5058-b120-4522b1f42d46',convert_to('TEST-PLAINTEXT:0903000410','UTF8'),digest('0903000410','sha256'),'0903***410','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('28a3c43c-503c-59ce-891e-9699d5d4706e','5dafca77-a17a-5f90-b68a-7766e3c64f71','56637769-2257-5058-b120-4522b1f42d46',300000000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('28a3c43c-503c-59ce-891e-9699d5d4706e','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('0ba91433-a6b3-5d0a-850c-79f7ee5c6e62','Nguyễn Thị Ngọc',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('0ba91433-a6b3-5d0a-850c-79f7ee5c6e62',convert_to('TEST-PLAINTEXT:0903000411','UTF8'),digest('0903000411','sha256'),'0903***411','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('5b89bd50-6eec-5910-a967-86a21794e340','5dafca77-a17a-5f90-b68a-7766e3c64f71','0ba91433-a6b3-5d0a-850c-79f7ee5c6e62',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('5b89bd50-6eec-5910-a967-86a21794e340','warehouse');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('4dbb2d9c-7dcd-521d-a944-0eba0089a323','Hồ Thị Lệ',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('4dbb2d9c-7dcd-521d-a944-0eba0089a323',convert_to('TEST-PLAINTEXT:0903000412','UTF8'),digest('0903000412','sha256'),'0903***412','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('bf6f97cf-5b80-5aa7-8686-bb31fb856f24','5dafca77-a17a-5f90-b68a-7766e3c64f71','4dbb2d9c-7dcd-521d-a944-0eba0089a323',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('bf6f97cf-5b80-5aa7-8686-bb31fb856f24','accountant');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('2de50563-e01a-5202-839a-effccb79aaad','Võ Thanh Sen',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('2de50563-e01a-5202-839a-effccb79aaad',convert_to('TEST-PLAINTEXT:0908000510','UTF8'),digest('0908000510','sha256'),'0908***510','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('cb30b1b4-1827-53a5-b284-08b38c7bce78','a9179290-5f66-5741-8c32-412e6df6659a','2de50563-e01a-5202-839a-effccb79aaad',20000000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('cb30b1b4-1827-53a5-b284-08b38c7bce78','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('b88b7e79-14da-5c66-9d67-20423e90856d','Trần Bếp Phó',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('b88b7e79-14da-5c66-9d67-20423e90856d',convert_to('TEST-PLAINTEXT:0908000511','UTF8'),digest('0908000511','sha256'),'0908***511','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('181f5fcb-8bf3-5f40-b0d3-0d2efc8943f5','a9179290-5f66-5741-8c32-412e6df6659a','b88b7e79-14da-5c66-9d67-20423e90856d',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('181f5fcb-8bf3-5f40-b0d3-0d2efc8943f5','site_receiver');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('2632886b-7f9f-56a2-9d5e-3ae5b7bc8ca8','Lâm Văn Cường',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('2632886b-7f9f-56a2-9d5e-3ae5b7bc8ca8',convert_to('TEST-PLAINTEXT:0938000610','UTF8'),digest('0938000610','sha256'),'0938***610','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('f571cdd1-41ef-58eb-b594-a6facb58d20f','99177a1f-dc84-588e-95bd-199401da0ed3','2632886b-7f9f-56a2-9d5e-3ae5b7bc8ca8',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('f571cdd1-41ef-58eb-b594-a6facb58d20f','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('2743fa1d-68b2-5bce-8456-9f13fa0c2bab','Huỳnh Thị Biển',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('2743fa1d-68b2-5bce-8456-9f13fa0c2bab',convert_to('TEST-PLAINTEXT:0902000810','UTF8'),digest('0902000810','sha256'),'0902***810','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('364f172a-b8b5-5dcf-90a1-75af4a01b86e','0c4280e9-e23b-55f1-898e-ce29dfe45ace','2743fa1d-68b2-5bce-8456-9f13fa0c2bab',400000000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('364f172a-b8b5-5dcf-90a1-75af4a01b86e','owner');
INSERT INTO core.users(id,display_name,is_staff,created_at) VALUES('06b48028-1d5a-5742-9371-2f6cb5a30e8c','Châu Văn Lạnh',false,'2026-11-02T08:00:00+07:00');
INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('06b48028-1d5a-5742-9371-2f6cb5a30e8c',convert_to('TEST-PLAINTEXT:0902000811','UTF8'),digest('0902000811','sha256'),'0902***811','TEST-NOT-ENCRYPTED','2026-11-02T08:00:00+07:00');
INSERT INTO core.memberships(id,org_id,user_id,approval_limit_vnd,created_at) VALUES('6b89edb5-aae6-5dc7-9d1c-1430ba50254e','0c4280e9-e23b-55f1-898e-ce29dfe45ace','06b48028-1d5a-5742-9371-2f6cb5a30e8c',NULL,'2026-11-02T08:00:00+07:00');
INSERT INTO core.membership_roles(membership_id,role_code) VALUES('6b89edb5-aae6-5dc7-9d1c-1430ba50254e','warehouse');
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
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('b2ab1419-1ba7-5c1e-865c-5a7f73a89e82','7ed1d074-9269-579f-bd58-252d11f24586','Vietcombank',convert_to('TEST:THU-0071000610610','UTF8'),digest('THU-0071000610610','sha256'),'****0610','Lý Văn Tư',true,'cdf5a785-4fcf-5d19-9a25-de85e0d54b34',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('e80011a5-c5d3-5491-bff9-35bf84be51aa','7ed1d074-9269-579f-bd58-252d11f24586','orchard','Cai Lậy, Đồng Tháp');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('7ed1d074-9269-579f-bd58-252d11f24586','e80011a5-c5d3-5491-bff9-35bf84be51aa','growing_area_code','MVT-DT-0610','TQ',daterange('2026-01-01','2027-03-31'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('0a8e1621-67e6-5d28-8ede-0fd9a7a80fe5','d191fddf-821f-503c-b45c-2461f1c1eba7','Agribank',convert_to('TEST:THU-7300000003000','UTF8'),digest('THU-7300000003000','sha256'),'****3000','HTX Tân Thuận',true,'d8c56a72-15a5-5036-aaf2-6a4885559e5b',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('a2ffd0c1-a973-5d7c-a943-540e7a25256b','d191fddf-821f-503c-b45c-2461f1c1eba7','orchard','Chợ Gạo, Đồng Tháp');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('d191fddf-821f-503c-b45c-2461f1c1eba7','a2ffd0c1-a973-5d7c-a943-540e7a25256b','vietgap',NULL,NULL,daterange('2026-01-01','2027-01-01'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('8b5e5782-3300-51ab-941a-3af10d10e0ec','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','Sacombank',convert_to('TEST:THU-0400000880880','UTF8'),digest('THU-0400000880880','sha256'),'****0880','Phan Thị Hồng',true,'f76cedac-15dc-56dc-b980-b39812fe0703',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('a3c59f94-22f0-5904-a369-4879931e9953','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','pond','Mỹ Xuyên, Cần Thơ');
INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','a3c59f94-22f0-5904-a369-4879931e9953','pond_diary',NULL,NULL,daterange('2026-01-01','2027-01-01'::date+1,'[)'),'33e12bc3-91de-58db-8dbf-bc3d058cdbbe','2026-11-02T08:00:00+07:00');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('e40f38d6-8e22-5cc4-9ca2-4d0ac59bf3a6','7895283a-cbd1-5055-bafb-af5de4f9a570','Agribank',convert_to('TEST:THU-7300000009500','UTF8'),digest('THU-7300000009500','sha256'),'****9500','Trần Văn Sáu',true,'adba1794-1552-53b3-b11c-28160bcd4770',ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','active','2026-10-01','2026-10-02');
INSERT INTO core.production_sites(id,org_id,kind,name) VALUES('c19e3589-929e-53cb-826f-485ceedffb02','7895283a-cbd1-5055-bafb-af5de4f9a570','field','Tháp Mười, Đồng Tháp');
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
INSERT INTO core.policy_versions(id,effective_from,deadlines,note) VALUES(1,'2026-10-01T00:00:00+07:00','{"tra_loi_loi_chao": 24, "tra_loi_loi_chao_vua": [6, 12], "giu_luong": 24, "nguoi_ban_ky": 24, "coc": 48, "coc_hang_tuoi": 12, "tra_loi_de_nghi": 24, "xac_nhan_tra_thang": 48, "nb_xac_nhan_tai_cho_phut": 60, "nb_xac_nhan_tai_kho": 24, "kiem_den": 2, "gia_han_kiem_den": 2, "nghiem_thu_giao_gan_tuoi": 12, "nghiem_thu_giao_gan_khac": 24, "can_lai": 24, "kiem_dinh": 48, "thoa_thuan_khong_ket_luan_ngay": 14, "cong_no": 72, "hien_thi_lo_ngay": 14, "ban_gap_ngay": 3, "kem_loai_khong_ai_hoi": 24, "doi_tai_khoan": 24, "doi_tai_khoan_sau_khoi_phuc": 72, "khung_chot_lan_goi": 24}'::jsonb,'Tham số thử từ du-lieu-cho.json; hạn dạng số giờ/ngày theo tên khóa.');
ALTER TABLE core.policy_versions ENABLE TRIGGER a_policy_approval;
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('6bf44f2f-b9cd-5e3b-aeb0-bb5d7b1c4db2','d45094f9-fea4-519a-a3c3-c9a50c9808a5','buyer_warehouse','KCN Hiệp Phước, TP.HCM');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('ced136e3-3a01-5fc1-a9d4-af58c4bc9fef','5dafca77-a17a-5f90-b68a-7766e3c64f71','buyer_warehouse','Kho Mỹ Tho, Đồng Tháp');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('a33a6a0f-1c08-56d1-b350-659ac581488f','a9179290-5f66-5741-8c32-412e6df6659a','restaurant','Quận 3, TP.HCM');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('3389b945-a3eb-510a-a1ab-c1b96f7c1e6c','99177a1f-dc84-588e-95bd-199401da0ed3','buyer_warehouse','Cao Lãnh, Đồng Tháp');
INSERT INTO core.facilities(id,org_id,kind,name) VALUES('7ab38b1a-c78d-5935-a0b4-21ad9def59ac','0c4280e9-e23b-55f1-898e-ce29dfe45ace','buyer_warehouse','KCN Trà Nóc, Cần Thơ');
INSERT INTO core.facilities(id,org_id,kind,name,collection_fee_vnd_per_kg) VALUES('cf69fed2-4711-59c4-87db-f7d4b1118684','d191fddf-821f-503c-b45c-2461f1c1eba7','collection_point','Điểm gom HTX Tân Thuận',300);
INSERT INTO core.facilities(id,org_id,kind,name,cold_min_dc,cold_max_dc) VALUES('7f8f0e42-328a-5fc6-9cb5-c39450644648','41d17c73-7e0f-5630-b13a-4e3bf39bbf52','cold_storage','Kho lạnh Tân Phú Lạnh',20,130);
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('f31d2bc3-0673-592d-9f6f-fb3948913de0','L-0412','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313',1,'L1','05c58fa7-622f-58e7-ab2d-c7f8985a93e4','estimated',4000000,'2026-11-02','2026-11-01',24000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('f31d2bc3-0673-592d-9f6f-fb3948913de0',24000,21500,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('3e615324-61bb-55a0-a108-485ee04cc5ac','L-0413','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313',1,'L2','05c58fa7-622f-58e7-ab2d-c7f8985a93e4','estimated',1500000,'2026-11-02','2026-11-02',16500,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('3e615324-61bb-55a0-a108-485ee04cc5ac',16500,14500,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('95e87b53-f0f1-5d85-af7b-de8a30f7a466','L-0414','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313',1,'L1','05c58fa7-622f-58e7-ab2d-c7f8985a93e4','estimated',2500000,'2026-11-12','2026-11-12',25000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('95e87b53-f0f1-5d85-af7b-de8a30f7a466',25000,22500,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('411c61e0-ecad-58fa-9c00-2b87d2fae46a','L-0440','7ed1d074-9269-579f-bd58-252d11f24586','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'A','e80011a5-c5d3-5491-bff9-35bf84be51aa','estimated',3000000,'2026-11-03','2026-11-03',92000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('411c61e0-ecad-58fa-9c00-2b87d2fae46a',92000,86000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('5b6b9d61-2beb-52f6-bd0b-1076d3006ad5','L-0441','7ed1d074-9269-579f-bd58-252d11f24586','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'B','e80011a5-c5d3-5491-bff9-35bf84be51aa','estimated',1200000,'2026-11-03','2026-11-03',72000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('5b6b9d61-2beb-52f6-bd0b-1076d3006ad5',72000,66000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('5035c00d-4d23-5cb5-9a2d-018bff1f38cf','L-0447','7ed1d074-9269-579f-bd58-252d11f24586','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,'A','e80011a5-c5d3-5491-bff9-35bf84be51aa','estimated',5000000,'2026-11-20','2026-11-20',90000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('5035c00d-4d23-5cb5-9a2d-018bff1f38cf',90000,85000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('adf74969-5312-58c4-8b12-82f1463691ff','L-0490','d191fddf-821f-503c-b45c-2461f1c1eba7','e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'L1','a2ffd0c1-a973-5d7c-a943-540e7a25256b','estimated',6000000,'2026-11-02','2026-11-02',19000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('adf74969-5312-58c4-8b12-82f1463691ff',19000,17000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('18e048ec-88c5-59e8-a013-55987b19b2d0','L-0491','d191fddf-821f-503c-b45c-2461f1c1eba7','e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,'L2','a2ffd0c1-a973-5d7c-a943-540e7a25256b','estimated',2000000,'2026-11-02','2026-11-02',12000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('18e048ec-88c5-59e8-a013-55987b19b2d0',12000,10500,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('9fcd6cd2-faf5-5b3f-8fde-ddd41255db2c','L-0492','d191fddf-821f-503c-b45c-2461f1c1eba7','c833b2d4-badc-5575-98cd-83c9c6293313',1,'L1','a2ffd0c1-a973-5d7c-a943-540e7a25256b','estimated',1000000,'2026-11-03','2026-11-03',25500,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('9fcd6cd2-faf5-5b3f-8fde-ddd41255db2c',25500,23000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('31baa599-8cfa-5152-9e63-fd04b8b741c5','L-0470','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'48-52','a3c59f94-22f0-5904-a369-4879931e9953','estimated',2500000,'2026-11-04','2026-11-04',135000,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('31baa599-8cfa-5152-9e63-fd04b8b741c5',135000,128000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('f3f6fde0-47db-5101-9c7a-5e9e8834bb17','L-0471','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,'53-60','a3c59f94-22f0-5904-a369-4879931e9953','estimated',1500000,'2026-11-15','2026-11-15',120000,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('f3f6fde0-47db-5101-9c7a-5e9e8834bb17',120000,114000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('32f60d74-ff0d-52a7-b7e9-6e51733c7d8d','L-0480','7895283a-cbd1-5055-bafb-af5de4f9a570','5aded288-3224-5d1e-b474-7b59d2098852',1,'OM18-am25','c19e3589-929e-53cb-826f-485ceedffb02','estimated',20000000,'2026-11-03','2026-11-03',7200,'2026-11-02T08:00:00+07:00','on_sale','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('32f60d74-ff0d-52a7-b7e9-6e51733c7d8d',7200,6800,'2026-11-02T08:00:00+07:00');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty,available_from,spray_clear_on,ask_price_vnd,last_confirmed_at,status,created_at) VALUES('1526715b-7b63-5364-aeca-89a669ca1352','L-0481','7895283a-cbd1-5055-bafb-af5de4f9a570','5aded288-3224-5d1e-b474-7b59d2098852',1,'OM18-am25','c19e3589-929e-53cb-826f-485ceedffb02','estimated',12000000,'2026-11-25','2026-11-25',7300,'2026-11-02T08:00:00+07:00','upcoming','2026-11-02T08:00:00+07:00');
INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) VALUES('1526715b-7b63-5364-aeca-89a669ca1352',7300,6900,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('3aa573f7-1eca-58b2-8837-61eda8cd3c1b','NC-3001','d45094f9-fea4-519a-a3c3-c9a50c9808a5','processor','c833b2d4-badc-5575-98cd-83c9c6293313',1,daterange('2026-11-03','2026-11-06'::date+1,'[)'),'self_pickup','6bf44f2f-b9cd-5e3b-aeb0-bb5d7b1c4db2','single_lot',ARRAY[]::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('3ff70ce5-033e-5184-813a-53416331d298','3aa573f7-1eca-58b2-8837-61eda8cd3c1b','L1',2000000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('3ff70ce5-033e-5184-813a-53416331d298',24000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('8906fbec-a958-51cb-9d82-12d4938936b0','NC-3002','d45094f9-fea4-519a-a3c3-c9a50c9808a5','processor','c833b2d4-badc-5575-98cd-83c9c6293313',1,daterange('2026-11-03','2026-11-10'::date+1,'[)'),'self_pickup','6bf44f2f-b9cd-5e3b-aeb0-bb5d7b1c4db2','needs_pooling',ARRAY[]::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('4212949b-2faf-571a-aaac-c86bcd23f73a','8906fbec-a958-51cb-9d82-12d4938936b0','L2',1500000,300000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('4212949b-2faf-571a-aaac-c86bcd23f73a',17000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('7eba224b-7023-5680-82b0-f00cabc80235','NC-3003','5dafca77-a17a-5f90-b68a-7766e3c64f71','export','8ebec77f-09a6-5ef3-b660-69a681ca86bc',1,daterange('2026-11-04','2026-11-12'::date+1,'[)'),'self_pickup','ced136e3-3a01-5fc1-a9d4-af58c4bc9fef','single_lot',ARRAY['ma_vung_trong:TQ']::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('b38e9350-6f7c-5f93-8979-6380e646d802','7eba224b-7023-5680-82b0-f00cabc80235','A',3000000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('b38e9350-6f7c-5f93-8979-6380e646d802',95000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('a61a7821-be4e-5bc6-80ea-d3dc9d9dde83','NC-3005','a9179290-5f66-5741-8c32-412e6df6659a','horeca','e6b1cf34-b6af-556f-a9ff-f65abcb58055',1,daterange('2026-11-03','2026-11-30'::date+1,'[)'),'delivered','a33a6a0f-1c08-56d1-b350-659ac581488f','single_lot',ARRAY[]::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('24f7c798-fa9e-5375-a4a2-8619e2c2343a','a61a7821-be4e-5bc6-80ea-d3dc9d9dde83','L1',200000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('24f7c798-fa9e-5375-a4a2-8619e2c2343a',21000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('f8aa5094-38c5-5e52-a81b-5f78546acb64','NC-3006','99177a1f-dc84-588e-95bd-199401da0ed3','wholesaler','5aded288-3224-5d1e-b474-7b59d2098852',1,daterange('2026-11-03','2026-11-08'::date+1,'[)'),'self_pickup','3389b945-a3eb-510a-a1ab-c1b96f7c1e6c','single_lot',ARRAY[]::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('06068c00-2b7c-57b6-88ce-8cdb5d33ea88','f8aa5094-38c5-5e52-a81b-5f78546acb64','OM18-am25',15000000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('06068c00-2b7c-57b6-88ce-8cdb5d33ea88',7400,'2026-11-02T08:00:00+07:00');
INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('97017a4b-8e10-59ae-aee2-7405778c4665','NC-3004','0c4280e9-e23b-55f1-898e-ce29dfe45ace','export','9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2',1,daterange('2026-11-05','2026-11-07'::date+1,'[)'),'self_pickup','7ab38b1a-c78d-5935-a0b4-21ad9def59ac','single_lot',ARRAY['nhat_ky_ao','kiem_dinh:khang_sinh']::text[],'open','2026-11-02T08:00:00+07:00');
INSERT INTO core.demand_lines(id,demand_id,grade_code,qty,min_source_qty) VALUES('707560bd-93fb-5488-b8c2-9bed6f9725bf','97017a4b-8e10-59ae-aee2-7405778c4665','48-52',2000000,20000);
INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_at) VALUES('707560bd-93fb-5488-b8c2-9bed6f9725bf',138000,'2026-11-02T08:00:00+07:00');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('29e274ab-5c6c-5b37-a688-d59c388f2182','HĐ-1901','d45094f9-fea4-519a-a3c3-c9a50c9808a5','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313','L1',1500000,23500,'2026-10-05T12:00:00+07:00','DT',false,true,'du-lieu-cho.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('cda7a57f-29ad-5c19-b355-ad918ee73cc1','HĐ-1902','99177a1f-dc84-588e-95bd-199401da0ed3','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313','L2',800000,15500,'2026-10-12T12:00:00+07:00','DT',false,true,'du-lieu-cho.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('a31c9653-49f1-5e77-a79d-7c3ef0c49544','HĐ-1903','5dafca77-a17a-5f90-b68a-7766e3c64f71','7ed1d074-9269-579f-bd58-252d11f24586','8ebec77f-09a6-5ef3-b660-69a681ca86bc','A',2000000,88000,'2026-10-08T12:00:00+07:00','DT',false,true,'du-lieu-cho.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('45df9347-624d-5a9d-982e-de853c8c1f93','HĐ-1904','5dafca77-a17a-5f90-b68a-7766e3c64f71','7ed1d074-9269-579f-bd58-252d11f24586','8ebec77f-09a6-5ef3-b660-69a681ca86bc','A',1500000,90000,'2026-10-20T12:00:00+07:00','DT',false,true,'du-lieu-cho.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('4442b3f1-f605-56df-8dc0-489888a4001f','HĐ-1905','a9179290-5f66-5741-8c32-412e6df6659a','d191fddf-821f-503c-b45c-2461f1c1eba7','e6b1cf34-b6af-556f-a9ff-f65abcb58055','L1',120000,19500,'2026-10-09T12:00:00+07:00','DT',false,true,'du-lieu-cho.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('a8716330-3b7a-5306-9aec-b5591ce86b34','HĐ-1906','99177a1f-dc84-588e-95bd-199401da0ed3','d191fddf-821f-503c-b45c-2461f1c1eba7','e6b1cf34-b6af-556f-a9ff-f65abcb58055','L2',1500000,11000,'2026-10-15T12:00:00+07:00','DT',false,true,'du-lieu-cho.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('f7775153-d5b6-5a3c-b0d7-a51a7da38b9a','HĐ-1907','0c4280e9-e23b-55f1-898e-ce29dfe45ace','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2','48-52',1200000,132000,'2026-10-10T12:00:00+07:00','DT',false,true,'du-lieu-cho.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('d47de70a-85ff-50ea-927b-fec3f46a0337','HĐ-1908','0c4280e9-e23b-55f1-898e-ce29dfe45ace','4d87ab74-52fd-5ba7-b01a-fce130b1d4b6','9dcf7b9d-fc31-5909-b243-0bd0b4a0d3f2','48-52',1000000,134000,'2026-10-24T12:00:00+07:00','DT',false,true,'du-lieu-cho.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('93bcc276-81e7-5473-a1ae-fe8ab37b9bd1','HĐ-1909','99177a1f-dc84-588e-95bd-199401da0ed3','7895283a-cbd1-5055-bafb-af5de4f9a570','5aded288-3224-5d1e-b474-7b59d2098852','OM18-am25',10000000,7100,'2026-10-11T12:00:00+07:00','DT',false,true,'du-lieu-cho.json');
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,qty,unit_price_vnd,accepted_at,province_code,excluded_from_ref_price,is_test_data,source_key) VALUES('f58a42f4-1a05-51d6-94dd-d7307a320a5b','HĐ-1910','99177a1f-dc84-588e-95bd-199401da0ed3','7895283a-cbd1-5055-bafb-af5de4f9a570','5aded288-3224-5d1e-b474-7b59d2098852','OM18-am25',8000000,7000,'2026-10-25T12:00:00+07:00','DT',false,true,'du-lieu-cho.json');
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
INSERT INTO core.framework_contracts(id,code,buyer_org_id,seller_org_id,segment_code,schedule,price_period,billing_period,framework_deposit_vnd,extra_credit_vnd,fee_bps,active_during,policy_version_id,status) VALUES('14ee53b4-34d2-5bfa-9fd3-e7c41f02a6d9','KH-2003','a9179290-5f66-5741-8c32-412e6df6659a','d191fddf-821f-503c-b45c-2461f1c1eba7','horeca','{"lich": ["thu_2", "thu_5"], "mon": [{"mat_hang": "THANH_LONG", "loai": "L1", "kg": 30, "gia": 20000}, {"mat_hang": "XOAI_CAT_CHU", "loai": "L1", "kg": 20, "gia": 26000}]}'::jsonb,'week','week',1120000,1500000,0,daterange('2026-10-01','2027-01-01','[)'),1,'running');
INSERT INTO core.deposits(id,framework_id,payer_org_id,expected_deposit_vnd,expected_fee_vnd,payment_ref,virtual_account_no) VALUES('5712e360-f315-5fec-83fb-f114b3fd9248','14ee53b4-34d2-5bfa-9fd3-e7c41f02a6d9','a9179290-5f66-5741-8c32-412e6df6659a',1120000,0,'AGV KH-2003 COC','THU-COC-KH-2003');
PERFORM ledger.post('imported_framework_deposit',NULL,'imported-deposit:KH-2003','Số dư đầu kỳ nhập khẩu KH-2003 từ du-lieu-cho.json',jsonb_build_array(jsonb_build_object('type','deposit_escrow','framework','14ee53b4-34d2-5bfa-9fd3-e7c41f02a6d9','amount',1120000),jsonb_build_object('type','external','org','a9179290-5f66-5741-8c32-412e6df6659a','amount',-1120000)),now(),NULL,NULL,jsonb_build_object('framework','14ee53b4-34d2-5bfa-9fd3-e7c41f02a6d9'));
UPDATE core.deposits SET status='held' WHERE id='5712e360-f315-5fec-83fb-f114b3fd9248';
INSERT INTO core.framework_opening_exposures(framework_id,unpaid_delivered_vnd,scheduled_vnd,source_key,as_of) VALUES('14ee53b4-34d2-5bfa-9fd3-e7c41f02a6d9',1120000,1120000,'du-lieu-cho.json','2026-11-02T08:00:00+07:00');
INSERT INTO core.imported_offtake_plans(id,code,buyer_org_id,seller_org_id,product_id,grade_code,deposit_vnd,materials_advance_vnd,formula_text,payment_after_days,source_key) VALUES('53f1ec38-7e18-57c4-9cf7-9249517ac512','BT-2005','d45094f9-fea4-519a-a3c3-c9a50c9808a5','91020315-f111-5802-ae6e-81df0b59def1','c833b2d4-badc-5575-98cd-83c9c6293313','L1',9000000,15000000,'max(18000, 0.9 * P_tk_L1_ngay_giao)',7,'du-lieu-cho.json');
INSERT INTO core.imported_offtake_batches(plan_id,batch_no,committed_qty,materials_offset_vnd,source_status) VALUES('53f1ec38-7e18-57c4-9cf7-9249517ac512',1,3000000,5000000,'da_chot');
INSERT INTO core.imported_offtake_batches(plan_id,batch_no,committed_qty,materials_offset_vnd,source_status) VALUES('53f1ec38-7e18-57c4-9cf7-9249517ac512',2,2800000,5000000,'cho_chuan_bi');
INSERT INTO core.imported_offtake_batches(plan_id,batch_no,committed_qty,materials_offset_vnd,source_status) VALUES('53f1ec38-7e18-57c4-9cf7-9249517ac512',3,3200000,5000000,'cho_chuan_bi');
INSERT INTO core.vehicles(id,org_id,plate_no,kind,capacity_qty) VALUES('30083539-10b0-5b92-80a3-df4c547d38ec','c0a22526-e753-5915-b4d0-d0a3ee4076a4','66C-123.45','reefer',2500000);
INSERT INTO core.vehicles(id,org_id,plate_no,kind,capacity_qty) VALUES('b4863eb3-6121-53f0-8587-fab132912c7c','c0a22526-e753-5915-b4d0-d0a3ee4076a4','66C-678.90','normal',5000000);
INSERT INTO core.vehicles(id,org_id,plate_no,kind,capacity_qty) VALUES('a15bcbaa-8894-5020-a554-887951d5195c','c0a22526-e753-5915-b4d0-d0a3ee4076a4','66C-246.80','normal',8000000);
INSERT INTO core.vehicles(id,org_id,plate_no,kind,capacity_qty) VALUES('f14cb5d0-a6bb-5b66-a908-36cff546cfef','c0a22526-e753-5915-b4d0-d0a3ee4076a4','66C-135.79','normal',5000000);
INSERT INTO core.substandard_receivers(buyer_org_id,product_id,grade_codes,min_qty,radius_km,standing_price_vnd,is_offtake_partner,floor_price_vnd,valid_during) VALUES('d45094f9-fea4-519a-a3c3-c9a50c9808a5','c833b2d4-badc-5575-98cd-83c9c6293313',ARRAY['L2']::text[],500000,200,NULL,false,NULL,daterange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.substandard_receivers(buyer_org_id,product_id,grade_codes,min_qty,radius_km,standing_price_vnd,is_offtake_partner,floor_price_vnd,valid_during) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','c833b2d4-badc-5575-98cd-83c9c6293313',ARRAY['L2']::text[],300000,100,12000,true,5000,daterange('2026-10-01','2027-01-01','[)'));
INSERT INTO core.substandard_receivers(buyer_org_id,product_id,grade_codes,min_qty,radius_km,standing_price_vnd,is_offtake_partner,floor_price_vnd,valid_during) VALUES('99177a1f-dc84-588e-95bd-199401da0ed3','e6b1cf34-b6af-556f-a9ff-f65abcb58055',ARRAY['L2']::text[],500000,100,9000,true,5000,daterange('2026-10-01','2027-01-01','[)'));
REFRESH MATERIALIZED VIEW mkt.reference_prices;
PERFORM set_config('app.allow_any_initial','off',true);
END $seed$;
SELECT set_config('app.nap_du_lieu_cu','off',false);
