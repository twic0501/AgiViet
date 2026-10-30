// Quả cầu nông sản 3D thật: ảnh nông sản ghép thành một tấm bản đồ, bọc quanh khối cầu WebGL (ảnh cong theo mặt cầu),
// xoay chậm, có ánh sáng để thấy độ cong. Không thư viện ngoài (chạy được khi ngoại tuyến). Tôn trọng prefers-reduced-motion.
export async function quaCau(canvas, { anh, tocDo = 0.22, nghieng = 0.38, cot = 8, hang = 4 } = {}) {
  const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: true, alpha: true });
  if (!gl) return false;
  const giam = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1) Tấm bản đồ: lưới cot×hang ô ảnh, xếp lệch để các loại xen nhau, viền mảnh màu giấy giữa các ô
  const anhTai = await Promise.all(anh.map((src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; })));
  const ds = anhTai.filter(Boolean);
  const TW = 2048, TH = 1024, ban = document.createElement("canvas"); ban.width = TW; ban.height = TH;
  const g = ban.getContext("2d");
  g.fillStyle = "#f6f2e7"; g.fillRect(0, 0, TW, TH);
  const ow = TW / cot, oh = TH / hang, ke = 6;
  for (let r = 0; r < hang; r++) for (let c = 0; c < cot; c++) {
    const img = ds[(c + r * 3) % ds.length]; if (!img) continue;
    // Ô gần cực bị kéo ngang khi bọc cầu → cắt ảnh hẹp lại theo tỉ lệ để bù méo
    const vi = ((r + 0.5) / hang - 0.5) * Math.PI, bu = Math.max(0.35, Math.cos(vi));
    const x = c * ow + ke / 2, y = r * oh + ke / 2, w = ow - ke, h = oh - ke;
    const tl = (w * bu) / h, iw = img.width, ih = img.height;
    let sw = iw, sh = iw / tl; if (sh > ih) { sh = ih; sw = ih * tl; }
    const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
    g.save(); g.beginPath(); g.roundRect(x, y, w, h, 18); g.clip();
    g.drawImage(img, sx, sy, sw, sh, x, y, w, h); g.restore();
  }

  // 2) Lưới cầu
  const VD = 48, KD = 96, vt = [], ch = [];
  for (let i = 0; i <= VD; i++) {
    const v = i / VD, th = v * Math.PI;
    for (let j = 0; j <= KD; j++) {
      const u = j / KD, ph = u * Math.PI * 2;
      const x = -Math.cos(ph) * Math.sin(th), y = Math.cos(th), z = Math.sin(ph) * Math.sin(th);
      vt.push(x, y, z, u, v);
    }
  }
  for (let i = 0; i < VD; i++) for (let j = 0; j < KD; j++) {
    const a = i * (KD + 1) + j, b = a + KD + 1;
    ch.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const vs = `attribute vec3 p; attribute vec2 t; uniform mat4 m; uniform float s; varying vec2 vt; varying vec3 n;
    void main(){ vec4 q = m * vec4(p, 1.0); n = q.xyz; vt = t; gl_Position = vec4(q.x * s, q.y * s, -q.z * 0.5, 1.0); }`;
  const fs = `precision mediump float; uniform sampler2D tx; uniform float a; varying vec2 vt; varying vec3 n;
    void main(){ vec3 N = normalize(n); vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
      float d = max(dot(N, L), 0.0); float rim = pow(1.0 - max(N.z, 0.0), 2.2);
      vec3 c = texture2D(tx, vt).rgb * (0.55 + 0.6 * d) - rim * 0.18;
      gl_FragColor = vec4(c * a, a); }`;
  const sh = (k, src) => { const o = gl.createShader(k); gl.shaderSource(o, src); gl.compileShader(o); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
  gl.useProgram(pr);
  const bv = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bv); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vt), gl.STATIC_DRAW);
  const bi = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bi); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ch), gl.STATIC_DRAW);
  const ap = gl.getAttribLocation(pr, "p"), at = gl.getAttribLocation(pr, "t");
  gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 20, 12);
  const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, ban);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  const um = gl.getUniformLocation(pr, "m"), us = gl.getUniformLocation(pr, "s"), ua = gl.getUniformLocation(pr, "a");

  const dpr = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0;
  const doKich = () => {
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); gl.viewport(0, 0, canvas.width, canvas.height);
  };
  doKich(); addEventListener("resize", doKich);

  const t0 = performance.now(), NHAP = giam ? 0 : 1800;
  const ra = (x) => 1 - Math.pow(1 - x, 3);
  let chay = true, id = 0;
  const ve = (now) => {
    const t = now - t0, k = NHAP ? ra(Math.min(1, t / NHAP)) : 1;
    // Lúc mở: quay nhanh rồi chậm dần, phóng từ nhỏ ra
    const y = (giam ? 0.9 : (t / 1000) * tocDo) + (1 - k) * -2.2, x = nghieng;
    const cy = Math.cos(y), sy = Math.sin(y), cx = Math.cos(x), sx = Math.sin(x);
    // m = Rx(x) * Ry(y)
    const m = [cy, sx * sy, -cx * sy, 0, 0, cx, sx, 0, sy, -sx * cy, cx * cy, 0, 0, 0, 0, 1];
    gl.uniformMatrix4fv(um, false, new Float32Array(m));
    const canh = Math.min(W, H), tile = (canh / Math.max(W, H)) * 0.86;
    gl.uniform1f(us, tile * (0.55 + 0.45 * k)); gl.uniform1f(ua, Math.min(1, k * 1.3 + (NHAP ? 0 : 1)));
    // giữ cầu tròn khi khung không vuông
    gl.viewport(Math.round((canvas.width - canh * dpr) / 2), Math.round((canvas.height - canh * dpr) / 2), Math.round(canh * dpr), Math.round(canh * dpr));
    gl.uniform1f(us, 0.9 * (0.55 + 0.45 * k));
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, ch.length, gl.UNSIGNED_SHORT, 0);
    if (chay && !giam) id = requestAnimationFrame(ve);
  };
  id = requestAnimationFrame(ve);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { chay = false; cancelAnimationFrame(id); } else if (!chay) { chay = true; id = requestAnimationFrame(ve); }
  });
  return true;
}
