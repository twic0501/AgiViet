// Hồi quy các lỗi Codex rà 01/11 (docs/frontend/ra-soat-codex-dang-bai-0111.md): gõ thay giọng nói, không đăng
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const loi = []; p.on("pageerror", (e) => loi.push(e.message));
// Không có nhận giọng → luồng gõ
await p.addInitScript(() => { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; });
const go = async (cau) => { await p.locator("#go-cau").fill(cau); await p.locator("#go-form button").click(); };
await p.goto("http://127.0.0.1:18990/thiet-ke/ban-dang-bai.html?thu=0918000421");
await p.locator("#the-hang b").waitFor();
await p.locator('#cach [data-cach="noi"]').click();

// #9 câu phủ định không được lối tắt chọn loại 1
await go("không phải loại một");
await p.waitForTimeout(1500);
assert.ok(!/Loại 1/.test(await p.locator("#hieu").innerText().catch(() => "")) || await p.locator("#hieu").isHidden(), "phủ định không chọn Loại 1");
await go("loại một");
await p.waitForFunction(() => /bao nhiêu/.test(document.querySelector("#cau-hoi").textContent));

// #1 "chưa cân" phải là ước chừng
await go("chừng hai tạ chưa cân, có hàng ngay, muốn hai mươi bốn ngàn một ký");
await p.locator("#hieu dl").waitFor({ timeout: 10000 });
assert.match(await p.locator("#hieu").innerText(), /200 kg · ước chừng/, "chưa cân → ước chừng");
// #8 câu dài có "nhưng" không được coi là đồng ý
await go("đúng loại nhưng lượng sai");
await p.waitForTimeout(1500);
assert.match(await p.locator("#cau-hoi").innerText(), /bao nhiêu/, "câu sửa không chuyển câu");
await go("chừng hai tạ chưa cân, có hàng ngay, muốn hai mươi bốn ngàn một ký");
await p.locator("#hieu dl").waitFor({ timeout: 10000 });
await p.locator("#tiep").click();
// #5 có xịt thêm ngoài nhật ký → dừng, không đi tiếp
assert.match(await p.locator("#cau-hoi").innerText(), /xịt thêm|xịt thuốc/);
await go("có, hôm qua mới xịt");
await p.locator("#noi-loi").waitFor({ state: "visible" });
assert.match(await p.locator("#noi-loi").innerText(), /ghi lần xịt/);
assert.match(await p.locator("#cau-hoi").innerText(), /xịt/, "vẫn ở câu thuốc");
await go("không xịt thêm");
await p.waitForFunction(() => /thấp nhất/.test(document.querySelector("#cau-hoi").textContent));
// #8 "dạ không, giá đó thấp quá" KHÔNG được đồng ý giá kín
await go("dạ không, giá đó thấp quá");
await p.waitForTimeout(2000);
assert.ok(await p.locator('[data-m="noi"]').isVisible(), "phủ định không chốt giá kín");
await go("đồng ý");
await p.locator('[data-m="anh"]').waitFor({ state: "visible", timeout: 8000 });

// Cách Điền: mặc định ước chừng; lượng thập phân giữ đúng (#2)
await p.goto("http://127.0.0.1:18990/thiet-ke/ban-dang-bai.html?thu=0918000421");
await p.locator("#the-hang b").waitFor();
await p.locator('#ds-loai button[data-v="L1"]').click();
await p.locator('#cach [data-cach="go"]').click();
assert.equal(await p.locator('#co-so [data-v="estimated"]').getAttribute("aria-pressed"), "true", "Điền mặc định ước chừng");
await p.locator("#luong").fill("1,5");
await p.locator('#dv [data-v="tan"]').click();
await p.locator('#thuoc [data-v="khong"]').click();
await p.locator("#tiep").click();
await p.locator("#gia-muon").pressSequentially("20000");
await p.locator("#tiep").click();
await p.locator("#chup-anh").setInputFiles(new URL("../assets/products/xoai-cat-chu.jpg", import.meta.url).pathname);
await p.locator("#luoi-anh .o").first().waitFor();
await p.locator("#tiep").click();
assert.match(await p.locator("#xem-lai").innerText(), /1,5 tấn|1\.500 kg/, "1,5 tấn không thành 15 tấn");
assert.deepEqual(loi, []);
console.log("ĐẠT hồi quy Đăng bài (6 ca)");
await b.close();
