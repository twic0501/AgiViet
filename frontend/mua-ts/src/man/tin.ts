// Tin nhắn: danh sách cuộc (theo đơn / lời chào) + khung chat.
// Sửa các lỗi của bản cũ: ô gõ dính đáy, tự cuộn tin mới, gửi xong hiện ngay (chờ máy chủ thì mờ), lỗi gửi giữ nguyên chữ để gửi lại,
// hỏi tin mới 3 giây/lần nhưng KHÔNG vẽ lại ô gõ (không mất chữ đang gõ), dừng hỏi khi rời khung.
import { api } from "../api";
import { DL } from "../du-lieu";
import type { Tin } from "../kieu";
import { esc, gio, maHD, trong } from "../ui";

type Cuoc = { order_id: string } | { offer_id: string };
const KHOA_XEM = "agv-tin-da-xem";
const daXem = (): string[] => { try { return JSON.parse(localStorage.getItem(KHOA_XEM) || "[]"); } catch { return []; } };
const ghiXem = (id?: string) => { if (!id) return; try { localStorage.setItem(KHOA_XEM, JSON.stringify([...daXem(), id].slice(-300))); } catch { /* bỏ qua */ } };

const tenCuoc = (c: { order_id?: string; offer_id?: string }): string => {
  const d = DL.don.find((x) => x.id === c.order_id); if (d) return `${d.seller_name || "Người bán"} · ${maHD(d.code)}`;
  const o = DL.loiChao.find((x) => x.id === c.offer_id); return o ? `${o.seller_name || "Người bán"} · ${o.product_name || o.lot_code || ""}` : "Lời chào giá";
};

export function soTinMoi(): number { const xem = daXem(); return DL.tin.filter((c) => !c.la_cua_toi && !xem.includes(c.id)).length; }

export function veDsTin(o: HTMLElement): void {
  const xem = daXem();
  o.innerHTML = DL.tin.length ? DL.tin.map((c) => {
    const moi = !c.la_cua_toi && !xem.includes(c.id);
    return `<a class="viec" href="#tin/${c.order_id ? "order" : "offer"}/${c.order_id || c.offer_id}"><i class="${moi ? "do" : ""}"></i>
      <div><b>${esc(tenCuoc(c))}</b><p class="phu mot-dong">${c.la_cua_toi ? "Bạn: " : ""}${esc(c.body)}</p></div>${moi ? `<span class="chip do">Mới</span>` : `<span class="phu">${gio(c.created_at)}</span>`}</a>`; }).join("")
    : trong("Chưa có tin nhắn. Tin nhắn mở theo từng lời chào giá hoặc đơn.");
}

let hen = 0;
/** Dừng hỏi tin mới (gọi khi rời khung chat). */
export const dungChat = () => { clearTimeout(hen); hen = 0; };

const bong = (m: Tin & { cho?: boolean; loi?: boolean }) => `<div class="bong${m.la_cua_toi ? " toi" : ""}${m.cho ? " cho" : ""}${m.loi ? " loi" : ""}" data-id="${esc(m.id)}">
  ${m.la_cua_toi ? "" : `<small>${esc(m.nguoi_gui)}</small>`}<p>${esc(m.body)}</p>
  <small>${m.loi ? "Chưa gửi được · bấm để gửi lại" : m.cho ? "Đang gửi…" : gio(m.created_at)}${m.da_che ? " · đã che số liên lạc" : ""}</small></div>`;

export async function veChat(o: HTMLElement, loai: string, id: string): Promise<void> {
  dungChat();
  const cuoc: Cuoc = loai === "order" ? { order_id: id } : { offer_id: id };
  o.innerHTML = `<div class="chat">
      <div class="chat-dau"><a class="nut-tron" href="#tin" aria-label="Quay lại tin nhắn">‹</a><b>${esc(tenCuoc(cuoc))}</b>${loai === "order" ? `<a class="nut vien nho" href="#don/${id}">Xem đơn</a>` : ""}</div>
      <div class="luong" id="luong" aria-live="polite"><div class="khung-tai"></div></div>
      <form class="o-go" id="o-go"><textarea id="tn-o" rows="1" maxlength="1000" placeholder="Nhắn người bán…" aria-label="Nội dung tin nhắn"></textarea><button class="nut chinh" id="tn-gui">Gửi</button></form>
      <p class="phu chat-ghi">Số điện thoại, Zalo, tài khoản riêng được che tự động. Giao dịch qua AgiViet để cọc được ngân hàng giữ.</p>
    </div>`;
  const luong = o.querySelector<HTMLElement>("#luong")!, oGo = o.querySelector<HTMLTextAreaElement>("#tn-o")!, form = o.querySelector<HTMLFormElement>("#o-go")!;
  let tin: Tin[] = [], dangCho: (Tin & { cho?: boolean; loi?: boolean })[] = [], dau = "";
  const sat = () => luong.scrollHeight - luong.scrollTop - luong.clientHeight < 80;
  const ve = (cuon: boolean) => {
    const tat = [...tin, ...dangCho];
    const moi = tat.map((m) => m.id + (m as any).cho + (m as any).loi).join();
    if (moi === dau) return; dau = moi; // không đổi thì không vẽ lại (giữ vị trí cuộn)
    luong.innerHTML = tat.length ? tat.map(bong).join("") : `<p class="phu giua">Chưa có tin nào. Gửi tin đầu tiên cho người bán.</p>`;
    if (cuon) luong.scrollTop = luong.scrollHeight;
  };
  const tai = async (cuon = false) => {
    try { const x = await api<{ tin: Tin[] }>(`/v1/messages?${new URLSearchParams(cuoc as Record<string, string>)}`); const cuoi = sat();
      tin = x.tin; ghiXem(tin.at(-1)?.id); DL.tin.filter((c) => (c as any)[Object.keys(cuoc)[0]] === id).forEach((c) => ghiXem(c.id));
      ve(cuon || cuoi);
    } catch (e) { if (!tin.length) luong.innerHTML = trong((e as Error).message); }
    if (document.body.contains(luong)) hen = window.setTimeout(() => tai(), document.hidden ? 15000 : 3000);
  };
  const gui = async (chu: string, tam?: Tin & { cho?: boolean; loi?: boolean }) => {
    const m = tam ?? { id: "tam-" + crypto.randomUUID(), body: chu, la_cua_toi: true, da_che: false, nguoi_gui: "Bạn", created_at: new Date().toISOString() };
    m.cho = true; m.loi = false; if (!tam) dangCho.push(m); dau = ""; ve(true);
    try { await api("/v1/messages", { ...cuoc, body: chu }); dangCho = dangCho.filter((x) => x !== m); dungChat(); await tai(true); }
    catch { m.cho = false; m.loi = true; dau = ""; ve(true); }
  };
  form.onsubmit = (e) => { e.preventDefault(); const chu = oGo.value.trim(); if (!chu) return; oGo.value = ""; oGo.style.height = ""; gui(chu); oGo.focus(); };
  oGo.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } };
  oGo.oninput = () => { oGo.style.height = "auto"; oGo.style.height = Math.min(oGo.scrollHeight, 120) + "px"; };
  luong.onclick = (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>(".bong.loi"); const m = b && dangCho.find((x) => x.id === b.dataset.id); if (m) gui(m.body, m); };
  await tai(true);
}
