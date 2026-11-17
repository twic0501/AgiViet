// Kiểu toàn cục cho app bán (JS thuần, kiểm bằng checkJs). Nới riêng phần DOM mà JS thuần dùng tự do
// (gắn cờ lên window/phần tử, đọc .value từ querySelector, View Transitions…) để kiểm kiểu bắt lỗi thật:
// tên không tồn tại, gọi sai số tham số, import sai tên giữa các module.
export {};
declare global {
  interface Window { [k: string]: any }
  interface Element { [k: string]: any }
  interface EventTarget { [k: string]: any }
  interface Event { [k: string]: any }
  const navigation: any;
}
