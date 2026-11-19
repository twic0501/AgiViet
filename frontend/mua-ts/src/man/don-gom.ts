// Đơn gom: bảng theo dõi từng hộ (mỗi hộ một lời chào riêng), Nhắn cả nhóm (gửi vào từng khung 1-1), mở chat từng hộ.
import { api, thu } from "../api";
import { esc, kg, tinh, trong, vnd } from "../ui";

interface Ho { offer_id: string; code: string; lot_code: string; seller_name: string; province_code?: string; qty_g: string; trang_thai: string; order_id?: string }
interface DonGom { id: string; can_g: string; da_chot_g: string; ho: Ho[] }
export interface TomTatDonGom { id: string; can_g: string; da_chot_g: string; so_ho: number; so_lo?: number }
/** Đếm hộ theo người bán duy nhất (một hộ có thể góp nhiều lô) — lỗi QA F05. */
export const nhanNhom = (soHo: number, soLo: number) => (soLo > soHo ? `${soHo} hộ · ${soLo} lô` : `${soHo} hộ`);

const TT: Record<string, [string, string]> = {
  cho_nguoi_ban: ["Chờ người bán trả lời", ""], toi_luot_ban: ["Người bán trả giá lại · tới lượt bạn", "do"],
  da_chot_gia: ["Đã chốt giá", "la"], co_hop_dong: ["Đã có hợp đồng", "la"], da_dong: ["Đã đóng · cần hộ thay", "do"],
};

/** Danh sách đơn gom (đặt ở đầu tab Đơn). */
export async function dsDonGomHtml(): Promise<string> {
  const ds = (await thu(api<TomTatDonGom[]>("/v1/sourcing-groups"))) ?? [];
  return ds.length ? `<div class="hang"><h2>Đơn gom</h2><span class="phu">${ds.length}</span></div>${ds.map((d) => `<a class="the bam" href="#don-gom/${d.id}">
    <div class="hang"><b>Gom ${nhanNhom(d.so_ho, d.so_lo ?? d.so_ho)}</b><span class="chip ${Number(d.da_chot_g) >= Number(d.can_g) ? "la" : ""}">Đã chốt ${vnd(kg(d.da_chot_g))}/${vnd(kg(d.can_g))} kg</span></div></a>`).join("")}` : "";
}

export async function veDonGom(o: HTMLElement, id: string): Promise<void> {
  if (!o.querySelector(".dg")) o.innerHTML = `<div class="khung-tai"></div>`;
  let d: DonGom;
  try { d = await api<DonGom>(`/v1/sourcing-groups/${id}`); } catch (e) { if (!location.hash.startsWith(`#don-gom/${id}`)) return; o.innerHTML = trong((e as Error).message, `<a class="nut vien" href="#don">Về đơn</a>`); return; }
  // Người dùng đã sang màn khác trong lúc tải → không vẽ đè (lỗi QA F01)
  if (!location.hash.startsWith(`#don-gom/${id}`)) return;
  const pt = Math.min(100, Math.round(100 * Number(d.da_chot_g) / Number(d.can_g)));
  o.innerHTML = `<div class="dg">
    <section class="the"><div class="hang"><h2>Gom ${nhanNhom(new Set(d.ho.map((h) => h.seller_name)).size, d.ho.length)}</h2><b class="so">${vnd(kg(d.da_chot_g))}/${vnd(kg(d.can_g))} kg</b></div>
      <div class="thanh-pt ${pt >= 100 ? "cao" : "vua"}" aria-label="Đã chốt ${pt} phần trăm"><i style="width:${pt}%"></i></div>
      <p class="phu">Mỗi hộ là một lời chào và hợp đồng riêng; các hộ không thấy nhau. ${pt >= 100 ? "Đã đủ lượng." : "Hộ nào đóng lời chào thì tìm hộ thay ở tab Nguồn."}</p></section>
    ${d.ho.map((h) => { const [ten, mau] = TT[h.trang_thai] ?? [h.trang_thai, ""]; return `<article class="the">
      <div class="hang"><div><b>${esc(h.lot_code)}</b><p class="phu">${esc(h.seller_name)} · ${esc(tinh(h.province_code))} · ${vnd(kg(h.qty_g))} kg</p></div><span class="chip ${mau}">${ten}</span></div>
      <a class="nut vien nho" href="${h.order_id ? `#tin/order/${h.order_id}` : `#tin/offer/${h.offer_id}`}">Mở chat với hộ này</a></article>`; }).join("")}
    <section class="the"><h2>Nhắn cả nhóm</h2><p class="phu">Gửi cùng một tin vào từng khung chat riêng (vd giờ xe, điểm gom). Hộ trả lời trong khung của mình.</p>
      <label class="o-nhap"><span class="an-chu">Nội dung</span><textarea id="dg-tin" rows="3" maxlength="1000" placeholder="vd Xe tới điểm gom 6 giờ sáng thứ 7"></textarea></label>
      <button type="button" class="nut chinh rong" id="dg-gui">Gửi cho ${d.ho.filter((h) => h.trang_thai !== "da_dong").length} hộ</button><p class="phu" id="dg-bao" role="status"></p></section>
    <button type="button" class="nut vien rong" id="dg-thay">Tìm hộ thay hoặc thêm hộ</button></div>`;
  o.querySelector<HTMLButtonElement>("#dg-thay")!.onclick = () => { try { sessionStorage.setItem("agv-dg-thay", id); } catch { /* bỏ qua */ } location.hash = "#nguon/ket-qua"; };
  o.querySelector<HTMLButtonElement>("#dg-gui")!.onclick = async (e) => {
    const n = e.currentTarget as HTMLButtonElement, chu = o.querySelector<HTMLTextAreaElement>("#dg-tin")!.value.trim(), bao = o.querySelector("#dg-bao")!;
    if (!chu) { bao.textContent = "Nhập nội dung trước."; return; }
    n.disabled = true;
    try { const r = await api<{ da_gui: number }>(`/v1/sourcing-groups/${id}/message`, { body: chu }); bao.textContent = `Đã gửi vào ${r.da_gui} khung chat.`; o.querySelector<HTMLTextAreaElement>("#dg-tin")!.value = ""; }
    catch (err) { bao.textContent = (err as Error).message; }
    n.disabled = false;
  };
}

/** Gửi lời chào cho cả nhóm gom (từ kết quả tìm nguồn). */
export async function taoDonGom(nguon: { lot_id: string; luong_g: string }[], canG: number, gia: number): Promise<string> {
  const r = await api<{ id: string }>("/v1/sourcing-groups", { can_g: String(canG), price_vnd: gia, nguon: nguon.map((x) => ({ lot_id: x.lot_id, qty_g: x.luong_g })) });
  window.dispatchEvent(new Event("agv-lam-moi")); window.dispatchEvent(new Event("agv-vong-ngay"));
  return r.id;
}
