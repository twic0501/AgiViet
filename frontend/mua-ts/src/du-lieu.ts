// Nạp dữ liệu một lần cho cả app; từng màn đọc từ DL. Gọi lại napHet() sau mỗi thao tác đổi trạng thái.
import { api, thu } from "./api";
import type { Don, Khoan, Lo, LoiChao, Me, TienTong, TomTatTin } from "./kieu";
import { maHD } from "./ui";

export const DL = {
  me: null as Me | null,
  don: [] as Don[],
  loiChao: [] as LoiChao[],
  lo: [] as Lo[],
  tien: null as TienTong | null,
  tin: [] as TomTatTin[],
  khoan: [] as Khoan[],
  thieuKhoan: 0, // số đơn không tải được khoản trả: không được hiện "còn phải trả 0 đ"
};

const ds = <T>(x: any): T[] => (Array.isArray(x) ? x : x?.items ?? []);

export async function napHet(): Promise<void> {
  const [me, don, loiChao, lots, tien, tin] = await Promise.all([
    thu(api<Me>("/v1/me")), api("/v1/orders"), thu(api("/v1/offers")), thu(api("/v1/lots")), thu(api<TienTong>("/v1/money/summary")), thu(api("/v1/messages/summary")),
  ]);
  DL.me = me; DL.don = ds<Don>(don); DL.loiChao = ds<LoiChao>(loiChao).filter((o) => o.la_ben_mua); DL.tien = tien; DL.tin = ds<TomTatTin>(tin);
  DL.lo = (await Promise.all(ds<Lo>(lots).slice(0, 30).map((l) => thu(api<Lo>(`/v1/lots/${l.id}`)).then((c) => ({ ...l, ...(c || {}) })))));
  DL.thieuKhoan = 0;
  const theoDon = await Promise.all(DL.don.map((d) => thu(api<Khoan[]>(`/v1/orders/${d.id}/payments`)).then((ps) => {
    if (ps === null) { DL.thieuKhoan++; return []; }
    return ps.filter((p) => p.direction === "buyer_to_seller").map((p) => ({ ...p, nguon: `${maHD(d.code)} · ${d.seller_name || ""}`, don_id: d.id }));
  })));
  DL.khoan = theoDon.flat();
}

export const conTra = (p: Khoan): number => Number(p.amount_due_vnd || 0) - Number(p.da_nhan_vnd || p.confirmed_vnd || p.received_vnd || 0);
export const canTra = (p: Khoan): boolean => ["due", "partially_received", "overdue", "partially_confirmed"].includes(p.status);
