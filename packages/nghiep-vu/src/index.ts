// Tầng nghiệp vụ AgiViet. Mọi thay đổi dữ liệu đi qua apDung(); câu hỏi "ai làm gì, đơn đang ở đâu" đi qua don/hien-thi;
// số liệu tổng hợp (uy tín, công nợ, bảng kê…) đi qua tong-hop.
export * from './kieu.ts';
export * from './chinh-sach.ts';
export * from './lo.ts';
export * from './lien-lac.ts';
export * from './don/trang-thai.ts';
export { LUAT, TEN_BUOC, aiLam, type Luat, type TenBuoc, type ThamSoBuoc } from './don/luat.ts';
export * from './don/hien-thi.ts';
export * from './so-giao-dich.ts';
export * from './tong-hop.ts';
export { hetCachLy, type DuLieuLo } from './lenh/lo.ts';
export { luotDaDung } from './lenh/ket-noi.ts';
