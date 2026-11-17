// Hôm nay: việc tới lượt bạn + tiền đang ở đâu.
import { manCu } from "../api";
import { DL, canTra, conTra } from "../du-lieu";
import { esc, maHD, ngay, vnd } from "../ui";

interface Viec { gap: boolean; ten: string; phu: string; href: string }

export function dsViec(): Viec[] {
  return [
    ...DL.don.filter((d) => d.hien_thi?.toi_luot?.phia === "buyer").map((d) => ({ gap: /cọc|trả|ký/i.test(d.hien_thi!.toi_luot!.viec), ten: `${maHD(d.code)} · ${d.seller_name || ""}`, phu: d.hien_thi!.toi_luot!.viec, href: `#don/${d.id}` })),
    ...DL.loiChao.filter((c) => c.status === "sent" && c.vong_cuoi?.from_side === "seller").map((c) => ({ gap: true, ten: `Người bán chào giá lại ${vnd(c.vong_cuoi!.price_vnd)} đ/kg`, phu: `${c.code} · lô ${c.lot_code || ""}`, href: manCu("bao-gia", `loi-chao=${c.id}`) })),
    ...DL.loiChao.filter((c) => c.status === "accepted" && !DL.don.some((d) => d.offer_id === c.id)).map((c) => ({ gap: true, ten: "Lập đơn", phu: `${c.code} · hai bên đã chốt giá`, href: manCu("bao-gia", `loi-chao=${c.id}`) })),
    ...DL.khoan.filter(canTra).map((p) => ({ gap: true, ten: `Trả ${vnd(conTra(p))} đ`, phu: `${p.nguon}${p.due_at ? ` · hạn ${ngay(p.due_at)}` : ""}`, href: "#tien" })),
  ];
}

export function veHomNay(o: HTMLElement): number {
  const viec = dsViec();
  const t = DL.tien?.tong;
  const no = DL.thieuKhoan ? "Chưa tính đủ" : `${vnd(DL.khoan.filter(canTra).reduce((a, p) => a + conTra(p), 0))} đ`;
  o.innerHTML = `
    <section class="the"><div class="hang"><h2>Tới lượt bạn</h2><span class="chip ${viec.length ? "do" : "la"}">${viec.length} việc</span></div>
      ${viec.length ? viec.map((v) => `<a class="viec" href="${v.href}"><i class="${v.gap ? "do" : ""}"></i><div><b>${esc(v.ten)}</b><p class="phu">${esc(v.phu)}</p></div><span aria-hidden="true">›</span></a>`).join("") : `<p class="phu">Không có việc nào chờ bạn.</p>`}
    </section>
    <section class="the"><h2>Tiền đang ở đâu</h2>
      <div class="luoi2"><div class="o"><span class="phu">Ngân hàng giữ cọc</span><b class="so">${DL.tien ? `${vnd(t?.coc_dang_giu)} đ` : "Chưa tải được"}</b></div>
      <div class="o"><span class="phu">Bạn còn phải trả</span><b class="so">${no}</b></div></div>
    </section>
    <a class="nut chinh rong" href="#nguon">Tìm nguồn hàng</a>`;
  return viec.length;
}
