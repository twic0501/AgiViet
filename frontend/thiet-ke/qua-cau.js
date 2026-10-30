// Quả cầu kết nối nông sản: ảnh tròn nhỏ là các điểm nằm trên mặt cầu 3D, nối nhau bằng đường thẳng (mạng lưới mua bán),
// chấm sáng chạy dọc đường như hàng đang đi. Cầu xoay; điểm phía trước to/rõ, phía sau nhỏ/mờ.
// Canvas 2D, không thư viện ngoài (chạy được khi ngoại tuyến). Tôn trọng prefers-reduced-motion.
export function quaCau(canvas, { anh, so = 70, noi = 3, tocDo = 0.2, nghieng = 0.35 } = {}) {
  const ctx = canvas.getContext("2d");
  const giam = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0, R = 0;
  const doKich = () => {
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height; R = Math.min(W, H) * 0.38;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  doKich(); addEventListener("resize", doKich);

  // Ảnh tròn có viền trắng, cắt sẵn
  const tron = [];
  anh.forEach((src, i) => {
    const img = new Image();
    img.onload = () => {
      const s = 128, c = document.createElement("canvas"); c.width = c.height = s;
      const g = c.getContext("2d"); g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2); g.save(); g.clip();
      const k = Math.max(s / img.width, s / img.height) * 1.4;
      g.drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k); g.restore();
      g.lineWidth = 7; g.strokeStyle = "#fff"; g.stroke();
      tron[i] = c;
    };
    img.src = src;
  });

  // Điểm trên mặt cầu (xoắn Fibonacci) + cạnh nối tới các điểm gần nhất
  const vang = Math.PI * (3 - Math.sqrt(5));
  const diem = Array.from({ length: so }, (_, i) => {
    const y = 1 - (i / (so - 1)) * 2, r = Math.sqrt(1 - y * y), t = vang * i;
    return { x: Math.cos(t) * r, y, z: Math.sin(t) * r, anh: i % anh.length };
  });
  const canh = new Set();
  diem.forEach((a, i) => {
    diem.map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2]).filter(([j]) => j !== i)
      .sort((p, q) => p[1] - q[1]).slice(0, noi).forEach(([j]) => canh.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });
  const dsCanh = [...canh].map((k) => k.split("-").map(Number));
  // Chấm chạy: mỗi chấm đi trên một cạnh, vị trí 0→1
  const cham = Array.from({ length: 20 }, () => ({ c: Math.floor(Math.random() * dsCanh.length), p: Math.random(), v: 0.18 + Math.random() * 0.22 }));

  const t0 = performance.now(), NHAP = giam ? 0 : 1600;
  const ra = (x) => 1 - Math.pow(1 - x, 3);
  let truoc = t0, chay = true, id = 0;
  const ve = (now) => {
    const t = now - t0, dt = Math.min(0.05, (now - truoc) / 1000); truoc = now;
    const k = NHAP ? ra(Math.min(1, t / NHAP)) : 1;
    const quay = (giam ? 0.9 : (t / 1000) * tocDo) - (1 - k) * 2.4;
    const cq = Math.cos(quay), sq = Math.sin(quay), cn = Math.cos(nghieng), sn = Math.sin(nghieng);
    const RR = R * (0.6 + 0.4 * k);
    // Chiếu 3D → 2D (phối cảnh nhẹ)
    const ch = diem.map((p) => {
      let x = p.x * cq + p.z * sq, z = -p.x * sq + p.z * cq, y = p.y;
      const y2 = y * cn - z * sn; z = y * sn + z * cn; y = y2;
      const pc = 1 / (1 - z * 0.18);
      return { X: W / 2 + x * RR * pc, Y: H / 2 + y * RR * pc, z, pc, anh: p.anh };
    });
    ctx.clearRect(0, 0, W, H);
    // Vành cầu rất mảnh để mắt đọc ra hình cầu (không tô nền)
    ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = "rgba(31,77,58,.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, RR, 0, Math.PI * 2); ctx.stroke();
    // Đường nối: mặt sau mờ, mặt trước đậm
    for (const [i, j] of dsCanh) {
      const a = ch[i], b = ch[j], zz = (a.z + b.z) / 2;
      ctx.globalAlpha = k * (zz > 0 ? 0.55 + zz * 0.35 : 0.12 + (zz + 1) * 0.1);
      ctx.strokeStyle = "#1f4d3a"; ctx.lineWidth = zz > 0 ? 1.4 : 0.8;
      ctx.beginPath(); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y); ctx.stroke();
    }
    // Chấm sáng chạy dọc đường (vàng xoài)
    for (const c of cham) {
      if (!giam) c.p += c.v * dt;
      if (c.p > 1) { c.p = 0; c.c = Math.floor(Math.random() * dsCanh.length); }
      const [i, j] = dsCanh[c.c], a = ch[i], b = ch[j], zz = a.z + (b.z - a.z) * c.p;
      if (zz < -0.1) continue;
      const x = a.X + (b.X - a.X) * c.p, y = a.Y + (b.Y - a.Y) * c.p;
      ctx.globalAlpha = k * (0.6 + zz * 0.4); ctx.fillStyle = "#e8b53a";
      ctx.beginPath(); ctx.arc(x, y, 2.6 + zz * 1.2, 0, Math.PI * 2); ctx.fill();
    }
    // Điểm ảnh: vẽ từ sau ra trước
    for (const p of [...ch].sort((a, b) => a.z - b.z)) {
      const img = tron[p.anh]; if (!img) continue;
      const kt = RR * (p.z > 0 ? 0.165 + p.z * 0.06 : 0.1 + (p.z + 1) * 0.06) * p.pc;
      ctx.globalAlpha = k * (p.z > 0 ? 1 : 0.25 + (p.z + 1) * 0.35);
      ctx.drawImage(img, p.X - kt / 2, p.Y - kt / 2, kt, kt);
    }
    ctx.globalAlpha = 1;
    if (chay && !giam) id = requestAnimationFrame(ve);
  };
  id = requestAnimationFrame(ve);
  if (giam) setTimeout(() => requestAnimationFrame(ve), 600);   // vẽ lại khi ảnh đã tải
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { chay = false; cancelAnimationFrame(id); } else if (!chay && !giam) { chay = true; truoc = performance.now(); id = requestAnimationFrame(ve); }
  });
  return true;
}
