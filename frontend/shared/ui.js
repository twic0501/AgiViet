import { money, moneyWords, escapeHtml as e } from "./format.js";
export const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${{ home: '<path d="M3 10 12 3l9 7v11h-6v-7H9v7H3Z"/>', lots: '<path d="M4 7h16l-1 14H5ZM8 7V5a4 4 0 0 1 8 0v2"/>', offers: '<path d="M3 4h18v13H8l-5 4Z"/>', orders: '<path d="M6 3h12v18H6ZM9 8h6M9 12h6M9 16h4"/>', money: '<path d="M3 6h18v14H3ZM3 10h18M16 15h2"/>', plus: '<path d="M12 4v16M4 12h16"/>', users: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 8m1 3c3 0 4 3 4 6"/>', leaf: '<path d="M4 20C2 8 9 3 21 3c0 12-5 19-17 17Zm0 0L16 8"/>' }[name] || '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'}</svg>`;
export const link = (label, href, secondary = false) =>
  `<a class="button ${secondary ? "secondary" : ""}" href="#/${href}">${e(label)}</a>`;
export const button = (label, action = "", secondary = false, attrs = "") =>
  `<button type="button" class="${secondary ? "secondary" : ""}" data-action="${e(action)}" ${attrs}>${e(label)}</button>`;
export const amount = (value, label = "") =>
  `<div>${label ? `<p class="caption">${e(label)}</p>` : ""}<div class="amount">${e(money(value))}</div><p class="money-words">${e(moneyWords(value))}</p></div>`;
export const line = (label, value) =>
  `<div class="line"><span>${e(label)}</span><strong>${e(value ?? "Chưa có")}</strong></div>`;
export const rule = (text) =>
  `<p class="caption rule-text">${e(text)}</p>`;
export const empty = (title, text, cta = "") =>
  `<div class="empty"><h3>${e(title)}</h3><p>${e(text)}</p>${cta}</div>`;
export const heading = (title, subtitle = "", cta = "") =>
  `<div class="page-heading"><div><h1 tabindex="-1">${e(title)}</h1>${subtitle ? `<p class="muted">${e(subtitle)}</p>` : ""}</div><div class="heading-actions">${cta}<button class="secondary read-screen" type="button" data-action="listen">Nghe</button></div></div>`;
// Ô mã 6 số: 6 ô hiện số, một input thật phủ lên trên để giữ tự điền mã từ tin nhắn và bàn phím số.
export const otpBox = (label, name = "code") =>
  `<label class="otp-nhan">${e(label)}</label><div class="otp-6" data-otp><input name="${e(name)}" class="otp-that" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required aria-label="${e(label)}">${'<span class="otp-o"></span>'.repeat(6)}</div>`;
export const field = (label, name, type = "text", value = "", extra = "") =>
  `<label>${e(label)}<input name="${e(name)}" type="${type}" value="${e(value)}" ${extra}>${type === "file" ? '<span class="file-button">Chọn tệp</span><small data-file-name>Chưa chọn tệp</small>' : ""}</label>`;
// 2–5 lựa chọn: hiện thành chip bấm được; nhiều hơn: ô danh sách đã vẽ lại (select.css).
// Mục giữ chỗ dạng ["", "Chọn …"] được bỏ khi đổi sang chip.
export const select = (label, name, options, value = "", extra = "") => {
  const real = options.filter(([v]) => v !== "");
  if (real.length >= 2 && real.length <= 5 && !/\bmultiple\b/.test(extra)) {
    const required = /\brequired\b/.test(extra) ? "required" : "";
    return `<fieldset class="chon-chip"><legend>${e(label)}</legend>${real.map(([v, t]) => `<label><input type="radio" name="${e(name)}" value="${e(v)}" ${v === value ? "checked" : ""} ${required}><span>${e(t)}</span></label>`).join("")}</fieldset>`;
  }
  return `<label>${e(label)}<select name="${e(name)}" ${extra}>${options.map(([v, t]) => `<option value="${e(v)}" ${v === value ? "selected" : ""}>${e(t)}</option>`).join("")}</select></label>`;
};
export const statusLabels = {
  draft: "Đang soạn",
  on_sale: "Đang bán",
  upcoming: "Sắp có hàng",
  hidden: "Tạm ẩn",
  closed: "Đã đóng",
  sold_out: "Hết hàng",
  open: "Đang mở",
  sent: "Chờ trả lời",
  accepted: "Đã đồng ý giá",
  auto_rejected: "Chưa tới mức chấp nhận",
  rejected: "Đã từ chối",
  withdrawn: "Đã rút",
  expired: "Hết hạn",
  cancelled: "Đã hủy",
  due: "Đến hạn trả",
  not_due: "Chưa tới hạn",
  reported_paid: "Đã báo trả · chờ xác nhận",
  partially_received: "Đã nhận một phần",
  fully_received: "Đã nhận đủ",
  disputed: "Đang đối soát",
  preparing: "Đang chuẩn bị",
  ready: "Sẵn sàng giao",
  checking: "Đang nghiệm thu",
  awaiting_seller: "Chờ người bán",
  in_transit: "Đang vận chuyển",
  arrival_check: "Kiểm hàng nơi đến",
  arrived: "Đã đến",
  completed: "Hoàn tất",
  awaiting_transfer: "Chờ chuyển cọc",
  confirmed: "Ngân hàng xác nhận cọc",
  received: "Đã nhận",
  held: "Ngân hàng đang giữ",
  created: "Đã tạo lệnh",
  sent_to_bank: "Đã gửi ngân hàng",
  succeeded: "Tiền đã về",
  reconciled: "Đã đối soát",
  processing: "Ngân hàng đang xử lý",
  processing_money: "Đang xử lý chi / hoàn tiền",
  done: "Đã xử lý xong",
  resolved: "Đã giải quyết",
  failed: "Lệnh chưa thành công",
  awaiting_reply: "Chờ bên kia trả lời",
  awaiting_callback: "Chờ xác minh chủ tài khoản",
};
export const label = (code) => statusLabels[code] || "Đang theo dõi";
export const badge = (text, due = false) =>
  `<span class="badge ${due ? "due" : ""}">${e(text)}</span>`;
export const steps = (current) => {
  const all = ["Ký", "Cọc", "Giao nhận", "Thanh toán", "Xong"];
  const at = all.indexOf(current);
  return `<div class="steps" aria-label="Các bước của đơn">${all.map((s, i) => `<div class="step ${i < at ? "done" : ""} ${i === at ? "current" : ""}" ${i === at ? 'aria-current="step"' : ""}>${e(s)}</div>`).join("")}</div>`;
};
export const notice = (text) => `<div class="notice">${e(text)}</div>`;
export const protection =
  "Giao dịch ngoài app không được bảo vệ. Cọc 30% qua tài khoản đảm bảo ngân hàng; phần còn lại trả thẳng người bán theo hợp đồng, người bán xác nhận bằng OTP.";
export const fraud =
  "AgiViet không bao giờ hỏi lại mã OTP. Không đọc mã cho người gọi điện, không chuyển tiền vào tài khoản gửi qua tin nhắn. Chỉ xác nhận tiền khi chính bạn thấy tiền trong tài khoản.";

export const copyReference = (value, title) => `<div class="transfer-reference"><label>${e(title)}<input type="text" readonly value="${e(value)}" data-copy-value aria-label="${e(title)}"></label>${button('Sao chép mã chuyển tiền','copyReference',true)}<p class="caption" data-copy-status aria-live="polite">Dùng nguyên mã trên khi chuyển tiền.</p></div>`;
