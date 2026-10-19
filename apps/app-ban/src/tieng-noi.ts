// Đọc to (speechSynthesis) và nghe nói (SpeechRecognition) bằng tiếng Việt. Máy không có thì app vẫn dùng được bằng gõ.

let giongViet: SpeechSynthesisVoice | undefined;
function timGiong() {
  if (typeof speechSynthesis === 'undefined') return;
  giongViet = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('vi'));
}
if (typeof speechSynthesis !== 'undefined') { timGiong(); speechSynthesis.addEventListener?.('voiceschanged', timGiong); }

export const coTheDoc = () => typeof speechSynthesis !== 'undefined';

/** Đọc to một đoạn; trả hàm dừng. */
export function docTo(noiDung: string, tocDo = 0.95): () => void {
  if (!coTheDoc()) return () => {};
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(noiDung);
  u.lang = 'vi-VN'; u.rate = tocDo;
  if (giongViet) u.voice = giongViet;
  speechSynthesis.speak(u);
  return () => speechSynthesis.cancel();
}

type NhanDang = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
const LopNhanDang = (): (new () => NhanDang) | undefined => (globalThis as unknown as { SpeechRecognition?: new () => NhanDang; webkitSpeechRecognition?: new () => NhanDang }).SpeechRecognition ?? (globalThis as unknown as { webkitSpeechRecognition?: new () => NhanDang }).webkitSpeechRecognition;
export const coTheNghe = () => !!LopNhanDang();

/** Nghe nói tiếng Việt: gọi khiCo(chữ, xong?) mỗi lần có chữ mới. Trả hàm dừng. */
export function ngheNoi(khiCo: (chu: string, xong: boolean) => void, khiLoi: (loi: string) => void, khiHet: () => void): () => void {
  const Lop = LopNhanDang();
  if (!Lop) { khiLoi('Máy này chưa nghe được giọng nói. Gõ chữ vào ô bên dưới.'); return () => {}; }
  const r = new Lop();
  r.lang = 'vi-VN'; r.interimResults = true; r.continuous = true;
  r.onresult = e => { let chu = '', xong = true; for (let i = 0; i < e.results.length; i++) { chu += e.results[i]![0]!.transcript; xong &&= e.results[i]!.isFinal; } khiCo(chu.trim(), xong); };
  r.onerror = e => khiLoi(e.error === 'not-allowed' ? 'Chưa cho phép dùng micro. Bật quyền micro hoặc gõ chữ.' : 'Không nghe rõ. Nói lại hoặc gõ chữ.');
  r.onend = khiHet;
  r.start();
  return () => r.stop();
}
