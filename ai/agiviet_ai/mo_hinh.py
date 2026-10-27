"""Hợp đồng vào có kiểm tra; tiền là số nguyên đồng, lượng là kg thập phân."""
from __future__ import annotations
from datetime import date, datetime
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

Ma = Annotated[str, Field(min_length=1, max_length=100)]
Tien = Annotated[int, Field(strict=True, gt=0, le=10**10)]
Kg = Annotated[float, Field(gt=0, le=10**9, allow_inf_nan=False)]

class Model(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)

class ViTri(Model):
    vi_do: float = Field(ge=-90, le=90)
    kinh_do: float = Field(ge=-180, le=180)

class GiayTo(Model):
    ma: Ma
    trang_thai: Literal['da_xac_minh', 'tu_khai', 'het_han']
    tu_ngay: date
    den_ngay: date
    @model_validator(mode='after')
    def thu_tu(self):
        if self.tu_ngay > self.den_ngay: raise ValueError('Hiệu lực giấy tờ đảo chiều')
        return self

class NhuCau(Model):
    id: Ma
    ben_mua_id: Ma
    phan_khuc: Literal['xuat_khau','che_bien','nha_hang','dau_moi']
    mat_hang: Ma
    dang: Ma
    loai: list[Ma] = Field(min_length=1, max_length=20)
    luong_kg: Kg
    toi_thieu_nguon_kg: Kg | None = None
    ngay_tu: date
    ngay_den: date
    vi_tri: ViTri
    ban_kinh_km: float | None = Field(default=None, gt=0, le=1000)
    giay_to_bat_buoc: list[Ma] = Field(default_factory=list, max_length=30)
    giay_to_uu_tien: list[Ma] = Field(default_factory=list, max_length=30)
    gia_toi_da_kin: Tien
    truoc_mua: bool = False
    can_gom: bool = False
    kenh: Literal['thuong','kem_loai'] = 'thuong'
    ben_ban_chan: list[Ma] = Field(default_factory=list, max_length=1000)
    kieu_giao: Literal['tu_lay','giao_toi'] = 'tu_lay'
    trang_thai: Literal['dang_mo','da_dong','het_han','du_luong'] = 'dang_mo'
    @model_validator(mode='after')
    def thu_tu(self):
        if self.ngay_tu > self.ngay_den: raise ValueError('Cửa sổ ngày đảo chiều')
        return self

class Lo(Model):
    id: Ma
    ben_ban_id: Ma
    mat_hang: Ma
    dang: Ma
    loai: Ma
    luong_khai_kg: Kg
    da_can: bool
    da_cam_ket_kg: float = Field(default=0, ge=0, le=10**9)
    dang_giu_kg: float = Field(default=0, ge=0, le=10**9)
    ngay_co_hang: date
    han_su_dung: date  # backend tính theo thu hoạch/bảo quản; không tự suy từ ngày đăng
    het_cach_ly: date | None = None
    vi_tri: ViTri
    giay_to: list[GiayTo] = Field(default_factory=list, max_length=50)
    gia_thap_nhat_kin: Tien
    uy_tin: float | None = Field(default=None, ge=0, le=100)
    so_don_hoan_tat: int = Field(default=0, ge=0)
    so_don_voi_ben_mua: int = Field(default=0, ge=0)
    xac_nhan_luc: datetime
    trang_thai: Literal['dang_ban','sap_co_hang','nhap','het_hang','da_dong'] = 'dang_ban'
    khoa_an_toan: bool = False
    nguoi_ban_bi_khoa: bool = False
    cap_mo_cho_phep: bool = True
    co_kiem_dinh_phu_vung: bool = False
    vi_pham_90_ngay: bool = False
    ban_gap: bool = False
    giao_duoc: bool | None = None
    loai_nguoi_ban: Literal['ho','trang_trai','htx','vua','to_hop_tac'] = 'ho'
    nguoi_ban_da_xac_minh: bool = False
    diem_gom_id: Ma | None = None
    @model_validator(mode='after')
    def kiem_tra(self):
        if self.xac_nhan_luc.tzinfo is None: raise ValueError('Cần múi giờ xác nhận còn hàng')
        if self.han_su_dung < self.ngay_co_hang: raise ValueError('Hạn hàng trước ngày có hàng')
        if len({g.ma for g in self.giay_to}) != len(self.giay_to): raise ValueError('Trùng mã giấy tờ')
        return self

class MatchRequest(Model):
    nhu_cau: NhuCau
    lo: list[Lo] = Field(max_length=1000)
    thoi_diem: datetime
    phien_ban_du_lieu: Ma
    @model_validator(mode='after')
    def kiem_tra(self):
        if self.thoi_diem.tzinfo is None: raise ValueError('Cần múi giờ thời điểm chụp dữ liệu')
        if len({x.id for x in self.lo}) != len(self.lo): raise ValueError('Trùng mã lô')
        return self

class QuetTinRequest(Model):
    noi_dung: str = Field(min_length=1, max_length=4000)

class ReverseMatchRequest(Model):
    lo: Lo
    nhu_cau: list[NhuCau] = Field(max_length=1000)
    thoi_diem: datetime
    phien_ban_du_lieu: Ma
    @model_validator(mode='after')
    def kiem_tra(self):
        if self.thoi_diem.tzinfo is None: raise ValueError('Cần múi giờ thời điểm chụp dữ liệu')
        return self

class VoiceRequest(Model):
    van_ban: str = Field(min_length=1, max_length=2000)
    hom_nay: date | None = None
    che_do: Literal['luat','ket_hop'] = 'luat'
    # Đo trên RTX 4080 Laptop: LLM qwen3.5:9b trung vị ~3,3 s, p95 ~3,8 s (ket_qua/trich_xuat.json)
    timeout_llm_s: float = Field(default=4.5, ge=0.05, le=8)
    # trường đã có từ lượt nói trước (hội thoại nhiều lượt); backend giữ, AI không lưu phiên
    da_co: dict[str, str | int | float | bool | None] | None = None
    xung_ho: str = Field(default='anh chị', max_length=20)

class DonGia(Model):
    id: Ma
    ben_ban_id: Ma
    ben_mua_id: Ma
    mat_hang: Ma
    loai: Ma  # gồm giống/ẩm/cỡ: OM18-am25 hoặc 48-52
    vung: Ma
    mien: Ma = 'DBSCL'
    ngay_chot: date
    gia_vnd_kg: Tien
    co_so_gia: Literal['tai_nguon','giao_kho'] = 'tai_nguon'
    cuoc_vnd_kg: Annotated[int, Field(strict=True, ge=0)] | None = None
    nghiem_thu_chot: bool = True
    gia_bat_thuong: bool = False
    cap_bi_danh_dau: bool = False
    ngoai_app: bool = False
    khung_nha_hang: bool = False

class GiaRequest(Model):
    mat_hang: Ma
    loai: Ma
    vung: Ma
    mien: Ma = 'DBSCL'
    ngay: date
    don: list[DonGia] = Field(max_length=10000)

class GiaoDich(Model):
    id: Ma
    ben_ban_id: Ma
    ben_mua_id: Ma
    lo_id: Ma
    ngay: date
    gia_vnd_kg: Tien
    tham_khao_vnd_kg: Tien | None = None
    gia_tri_vnd: Annotated[int, Field(strict=True, gt=0)]

class BatThuongRequest(Model):
    ngay: date
    giao_dich: list[GiaoDich] = Field(max_length=10000)

class TomTatRequest(Model):
    hop_dong_id: Ma
    phien_ban: int = Field(ge=1)
    ma_bam: str = Field(pattern=r'^[0-9a-f]{64}$')
    mat_hang: Ma
    loai: Ma
    luong_kg: Kg
    gia_vnd_kg: Tien
    coc_vnd: Annotated[int, Field(strict=True, ge=0)]
    han_coc: datetime
    ngay_giao: date
    diem_nghiem_thu: str = Field(min_length=1, max_length=200)
    cach_tra_con_lai: str = Field(min_length=1, max_length=500)
    dieu_khoan_ha_cap: str | None = Field(default=None, max_length=500)
    dieu_khoan_thieu_luong: str | None = Field(default=None, max_length=500)
    dieu_khoan_im_lang: str | None = Field(default=None, max_length=500)
    @model_validator(mode='after')
    def kiem_tra(self):
        if self.han_coc.tzinfo is None: raise ValueError('Hạn cọc cần múi giờ')
        return self
