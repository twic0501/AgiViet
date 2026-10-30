// Quả cầu nông sản: các ảnh tròn xếp trên mặt cầu (Fibonacci), xoay chậm; lúc mở các ảnh bay từ ngoài vào ghép thành cầu.
// Vẽ bằng canvas 2D, không thư viện ngoài (chạy được khi ngoại tuyến). Tôn trọng prefers-reduced-motion.
export function quaCau(canvas, { anh, so = 110, tocDo = 0.18, nghieng = 0.32 } = {}) {
  const ctx = canvas.getContext("2d");
  const giam = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0, R = 0;
  const doKich = () => {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height; R = Math.min(W, H) * 0.4;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  doKich(); addEventListener("resize", doKich);

  // Ảnh: cắt sẵn thành hình tròn để vẽ nhanh
  const tron = [];
  anh.forEach((src, i) => {
    const img = new Image();
    img.onload = () => {
      const s = 128, c = document.createElement("canvas"); c.width = c.height = s;
      const g = c.getContext("2d"); g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); g.clip();
      const k = Math.max(s / img.width, s / img.height) * 1.35; // phóng vào phần giữa ảnh (nông sản)
      g.drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k);
      g.lineWidth = 6; g.strokeStyle = "rgba(255,255,255,.9)"; g.stroke();
      tron[i] = c;
    };
    img.src = src;
  });

  // Điểm trên mặt cầu (xoắn Fibonacci) + vị trí xuất phát ngẫu nhiên ngoài khung
  const vang = Math.PI * (3 - Math.sqrt(5));
  const diem = Array.from({ length: so }, (_, i) => {
    const y = 1 - (i / (so - 1)) * 2, r = Math.sqrt(1 - y * y), t = vang * i;
    const goc = Math.random() * Math.PI * 2, xa = 1.6 + Math.random() * 1.2;
    return { x: Math.cos(t) * r, y, z: Math.sin(t) * r, anh: i % anh.length, bx: Math.cos(goc) * xa, by: Math.sin(goc) * xa, tre: Math.random() * 0.5 };
  });

  const t0 = performance.now();
  const NHAP = giam ? 0 : 1600; // thời gian ghép cầu (ms)
  const ra = (t) => 1 - Math.pow(1 - t, 3);
  let chay = true, idKhung = 0;
  const ve = (now) => {
    const t = now - t0;
    const quay = giam ? 0.6 : (t / 1000) * tocDo;
    const cq = Math.cos(quay), sq = Math.sin(quay), cn = Math.cos(nghieng), sn = Math.sin(nghieng);
    ctx.clearRect(0, 0, W, H);
    const hien = NHAP ? ra(Math.min(1, t / NHAP)) : 1;
    // bóng bầu dục sát dưới cầu
    ctx.save(); ctx.translate(W / 2, H / 2 + R * 1.02); ctx.scale(1, 0.22);
    const bong = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.95);
    bong.addColorStop(0, `rgba(31,77,58,${0.28 * hien})`); bong.addColorStop(1, "rgba(31,77,58,0)");
    ctx.fillStyle = bong; ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // khối cầu nền: lấp khe giữa các ảnh để đọc ra hình quả cầu
    const nen = ctx.createRadialGradient(W / 2 - R * 0.35, H / 2 - R * 0.4, R * 0.1, W / 2, H / 2, R * 1.02);
    nen.addColorStop(0, `rgba(221,232,223,${hien})`); nen.addColorStop(1, `rgba(31,77,58,${0.85 * hien})`);
    ctx.fillStyle = nen; ctx.beginPath(); ctx.arc(W / 2, H / 2, R * 1.0, 0, Math.PI * 2); ctx.fill();
    const ds = diem.map((p) => {
      let x = p.x * cq + p.z * sq, z = -p.x * sq + p.z * cq, y = p.y;
      const y2 = y * cn - z * sn; z = y * sn + z * cn; y = y2;
      const k = NHAP ? ra(Math.max(0, Math.min(1, (t - p.tre * NHAP * 0.5) / (NHAP * 0.75)))) : 1;
      return { ...p, sx: (p.bx * (1 - k) + x * k), sy: (p.by * (1 - k) + y * k), z: z * k + (1 - k), k };
    }).sort((a, b) => a.z - b.z);
    for (const p of ds) {
      const c = tron[p.anh]; if (!c) continue;
      if (p.k > 0.98 && p.z < -0.15) continue;      // mặt sau đã ghép xong: khối nền che, bỏ qua cho gọn
      const kt = R * 0.3 * (0.72 + 0.4 * (p.z + 1) / 2); // phối cảnh chỉ ở cỡ ảnh: gần to, xa nhỏ
      const x = W / 2 + p.sx * R * 0.94, y = H / 2 + p.sy * R * 0.94; // vị trí theo đúng bán kính cầu
      ctx.globalAlpha = Math.max(0.12, Math.min(1, 0.35 + (p.z + 1) * 0.4)) * Math.min(1, p.k * 1.4 + 0.15);
      ctx.drawImage(c, x - kt / 2, y - kt / 2, kt, kt);
    }
    ctx.globalAlpha = 1;
    if (chay && !giam) idKhung = requestAnimationFrame(ve);
  };
  idKhung = requestAnimationFrame(ve);
  // Ảnh tải xong sau khung đầu: vẽ lại khi giảm chuyển động
  if (giam) setTimeout(() => requestAnimationFrame(ve), 600);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { chay = false; cancelAnimationFrame(idKhung); } else if (!chay) { chay = true; idKhung = requestAnimationFrame(ve); }
  });
}
