# Nhận xét Codex từng khung — tay + 8 hành động chính diện (31/10 tối)

Ảnh gửi soi: `danh-gia-1-tay-mau-vs-hien-tai.png`, `danh-gia-2-hanh-dong-1-4.png`, `danh-gia-3-hanh-dong-5-8.png`.

47,396
**Nhận xét chính:** tay hiện tại mất nét mềm và độ xoè của mẫu; chuyển động có nhún/nghiêng nhưng thiếu chuyển trọng tâm và mục đích rõ ràng. Vì vậy trâu giống đang “lắc để diễn” hơn là chào, đọc hay suy nghĩ.

Tôi đã đọc luật 8 và mã hành động, không sửa repo. Đánh giá dưới đây dựa trên ảnh từng khung; chưa kết luận độ mượt khi phát thực tế. **Trái/phải đều tính theo màn hình.**

**A. Form tay so với mẫu**

| Dáng | Sai cụ thể | Cách sửa |
|---|---|---|
| **Buông** | Mẫu xoè nhẹ khỏi thân, khuỷu có độ cong, bàn tay hướng chếch ra ngoài. Bản Rive kéo ống tay dài, gần thẳng xuống hông; cổ tay thấp, bàn tay nhỏ và bẹt. Vai tròn ụ nhưng cạnh trong thiếu chuyển tiếp vào nách. | Rút chiều dài biểu kiến; đưa cổ tay chếch ra ngoài và lên theo mẫu. Khôi phục đường cong vai–khuỷu–cổ tay, khoảng hở nhỏ cạnh hông. Không dùng một ống áo dài để che chỗ nối thân. |
| **Dang ngang** | Mẫu có độ thuôn, cạnh trên/dưới hơi cong và bàn tay xoè rõ. Bản Rive thành thanh chữ nhật gần đều bề dày; cổ tay vuông gắt, bàn tay như mẩu răng cưa nhỏ gắn ngoài. Gốc tay chìm dưới khăn khiến vai/nách khó đọc. | Giữ bề dày ở vai nhưng thuôn nhẹ về cổ tay; tạo đường cong mềm ở hai cạnh. Tăng bàn tay theo mẫu, có khối lòng bàn tay và cổ tay rõ. Nách nối liền sườn áo, không kẻ đường chia kín cắt ngang gốc tay. |
| **Giơ cao** | Mẫu ôm thành chữ U: bàn tay dựng gần hai má, khuỷu mềm. Rive xoè thành chữ V rộng, bàn tay nằm thấp và xa má; đoạn tay gần thẳng nên giống hai thanh chéo. Bàn tay vẫn nhỏ, góc nách nhọn. | Đưa bàn tay vào trong và lên gần má; vẽ lại độ cong khuỷu ngay trong silhouette. Làm nách chuyển cong vào sườn áo. Cần **vẽ lại dáng cao**, tăng mức điều khiển không tự tạo được khuỷu đúng. |

**Chỗ nối thân ở cả ba dáng:** gốc tay phải được áo/khăn che hợp lý, nhưng đường bao ngoài vẫn liên tục. Kéo tay sâu vào thân chỉ chữa khe hở, không chữa hình vai. Giữ cổ tay cắt phẳng; bàn tay giữ cùng thể tích khi chuyển dáng.

**B. Từng hành động 1–8**

Quy ước đề xuất: **B = buông, N = ngang, C = cao**, tương ứng các mốc đã hiệu chuẩn của rig. `f` là khung mới ở 60 fps; mỗi chuỗi bắt đầu từ f0. Các biên độ là điểm khởi đầu để dựng thử.

**1. Chào**

- **k1/f20:** tay đã ngang như chỉ đường, chưa đọc thành chào. **k2/f47:** tay lên chéo nhưng khuỷu thẳng, giống giơ tay xin phát biểu.
- **k3/f74:** gần lặp k2, thiếu một cực đối lập để thấy vẫy. **k4/f101:** tiếp tục giữ cùng silhouette; mắt cười đang gánh phần diễn.
- **k5/f128:** lại gần tư thế cũ; đoạn giơ tay kéo dài nhưng ít thông tin mới. **k6/f155:** đã hạ về buông, thiếu một tư thế thu tay rõ trong bảng.
- **k7/f182:** đứng nghỉ được. **k8/f209:** gần k7; khoảng nghỉ dùng được, nhưng phần chào trước đó chưa đủ rõ.

**Làm lại:** f0 nghỉ → f8 hạ thân 3–4 px, đầu gật nhẹ → f18 đầu hướng người nhận, thân theo sau 3–4f, dồn chân đối diện tay chào → f30 tay lên gần C → f44 giữ chào → f56 hạ một chút → f68 lên lại **một lần** → f88 hạ tay → f104 ổn định → f144 hết nghỉ.

Với ba dáng hiện tại, nên gọi là **giơ tay chào kèm gật đầu**. Muốn **vẫy** đúng nghĩa: thêm dáng **khuỷu gập, cẳng tay dựng, bàn tay mở gần má**, với hai biến thể bàn tay nghiêng qua lại. Không bắt cả cánh tay bơm lên xuống để giả vẫy.

**2. Chỉ đường**

- **k1/f20:** hướng tay rõ, nhưng bàn tay chưa có ý chỉ. **k2/f42:** giữ được, thân chưa cho thấy đang dẫn sự chú ý sang hướng đó.
- **k3/f65:** tay chếch lên khiến hướng chỉ đổi. **k4/f87:** hạ lại, đọc như nhún cánh tay hơn là nhấn mạnh điểm đến.
- **k5/f110:** giữ ngang hợp lý. **k6/f132:** gần k5, có thể giữ nhưng cần đầu hướng theo.
- **k7/f155:** tiếp tục treo tay. **k8/f177:** chưa có kết thúc; nếu lặp sẽ thành chỉ mãi một hướng.

**Làm lại:** f0 B → f6 đầu dời/nghiêng về hướng chỉ → f10 thân theo → f14 chuyển trụ → f24 tay tới N → f30 vượt N rất nhẹ rồi f36 ổn định → f36–96 giữ hướng → f108 đầu trở lại người xem → f126 thu tay → f144 nghỉ.

**Thêm dáng bàn tay chỉ hướng hoặc bàn tay mở giới thiệu.** Không cần gập khuỷu. Trong lúc giữ, cổ tay phải giữ cùng hướng; bỏ hai nhịp nâng cả tay làm đổi hướng chỉ.

**3. Cầm giấy**

- **k1/f20:** giấy ở ngoài đầu tay dang ngang, giống đưa giấy cho người khác xem. **k2/f50:** đầu chưa hướng đủ về giấy.
- **k3/f80:** mắt cười làm lệch nghĩa “đang đọc”. **k4/f110:** tiếp tục cười và dang tay, giống giới thiệu tờ giấy.
- **k5/f140:** trở lại nhìn gần chính diện, chưa thấy theo dõi nội dung. **k6/f170:** tư thế giữ giấy gần như không đổi.
- **k7/f200:** tay tiếp tục treo xa người. **k8/f230:** chưa có nhịp đọc xong hoặc hạ giấy.

**Làm lại — cần dáng mới:** **khuỷu gập, cẳng tay đưa vào trước thân, bàn tay kẹp cạnh giấy**, giấy nằm lệch một bên ngực, dưới mõm và tránh che mặt.

f0 cầm thấp → f12 chuyển trụ → f28 đưa giấy lên vị trí đọc → f34 đầu dời về giấy → f34–100 đọc, chỉ một chuyển đầu nhỏ → f108 gật xác nhận → f126 ngẩng nhìn người xem → f148 hạ giấy → f180 ổn định.

Giấy phải bám điểm kẹp bàn tay suốt chuyển động. **Nếu chưa thêm dáng này, chỉ nên dùng động tác “trưng giấy”; ba dáng hiện tại không diễn đọc giấy thuyết phục.**

**4. Mừng**

- **k1/f20:** tư thế ở trên cao đọc được vui, nhưng tay vẫn là chữ V cứng. **k2/f31:** thân xuống thấp; cần đọc thành chuẩn bị tiếp đất, không phải thu nhỏ nhân vật.
- **k3/f42:** đã trở lại cao hơn ngay sau nhịp thấp, cảm giác hồi lên khá nhanh. **k4/f53:** lại xuống, bắt đầu thành nhún đều.
- **k5/f65:** đỉnh bật lần hai nhận ra được. **k6/f76:** trở lại thấp; hai tay vẫn gần tư thế cũ nên thiếu theo đà.
- **k7/f87:** bật hồi tiếp, chưa thấy kết thúc. **k8/f98:** lại thấp; chuỗi nhìn như lò xo lặp hơn là một lần mừng có cao trào.

**Làm lại:** f0 nghỉ → f8 hạ thân 5–7 px, tay rời B → f16 bật, tay lên → f24 đỉnh nhảy 10–14 px, hai tay C → f34 chân chạm đất → f40 nén thân nhẹ → f52 hồi → f68 tay hạ → f100 nghỉ.

Một cú bật rõ trước; chỉ thêm cú thứ hai nhỏ hơn nếu cần. Hai tay cùng ý định, có thể lệch 2–3f; bỏ vung đối pha liên tục. **Dùng ba dáng sau khi sửa form C.**

**5. Xin lỗi**

- **k1/f20:** giống đứng buồn hơn xin lỗi. **k2/f50:** vẫn cùng một dáng, không thấy bắt đầu cúi.
- **k3/f80:** lệch đầu nhẹ đọc thành nghiêng đầu. **k4/f110:** chưa có điểm thấp rõ để xác nhận cúi.
- **k5/f140:** gần k4, hành động bị giữ quá lâu. **k6/f170:** vẫn buồn tại chỗ.
- **k7/f200:** thiếu nhịp ngẩng lên nhìn người nhận. **k8/f230:** trở lại gần dáng đầu, nhưng không thành một lời xin lỗi hoàn chỉnh.

**Làm lại:** f0 đứng → f8 thu thái độ, hai tay B → f18 đầu hạ 6–8 px → f24 thân nhún thêm 3–4 px, trọng lượng chia chắc trên hai chân → f36 điểm cúi thấp → f36–64 giữ → f88 thân hồi → f100 đầu ngẩng chậm → f132 nghỉ.

Giữ tay buông yên, tai cụp đến sau đầu 4–6f, đuôi giảm chuyển động. **Không cần tay mới.** Với chính diện hiện tại, diễn **cúi nhẹ**; xoay đầu sang bên không thay thế được cúi về trước.

**6. Chờ**

- **k1/f20:** dáng chờ nền dùng được. **k2/f57:** nghiêng nhẹ nhưng chưa đọc rõ chân nào chịu lực.
- **k3/f95:** đầu nghiêng rõ hơn thân, dễ thành vẻ làm duyên. **k4/f132:** giữ nghiêng lâu, chưa thấy lý do chú ý.
- **k5/f170:** chuyển về giữa nhưng thiếu một điểm nhìn đích rõ. **k6/f207:** nhắm mắt dùng được như chớp mắt; không đủ tạo hành động mới.
- **k7/f245:** trở về gần dáng đầu. **k8/f282:** gần lặp k7; cả chuỗi khá nhiều thay đổi nhỏ mà chưa rõ đang chờ điều gì.

**Làm lại:** chu kỳ 300f: f0–70 đứng thở → f82 đầu hướng sang bên → f88 thân theo → f104 dồn chân trụ → f104–150 giữ → f162 nhấc chân nghỉ 3–4 px → f168 đặt xuống **một lần** → f210 đầu về trước → f230 thân về → f300 nối vòng.

Giảm gõ chân: gõ liên tiếp diễn **sốt ruột**, không phải chờ bình thường. **Không cần tay mới**, giữ tay gần B và cho theo thân ít hơn đầu.

**7. Đi**

- **k1/f20:** một tay xoè ra bên, giống dang giữ thăng bằng. **k2/f27:** tay thu về nhưng chân chưa tạo bước đối lập rõ.
- **k3/f35:** gần dáng đứng trung tính, khiến bước bị đứt. **k4/f42:** tay bên kia xoè ngang; tiếp tục đọc như lắc hai cánh tay.
- **k5/f50:** giữ tay xoè trong khi chân ít khác biệt. **k6/f57:** lại trung tính.
- **k7/f65:** thêm một khung gần đứng yên. **k8/f72:** tay phía đầu tiên vung lại, vòng lặp nhận ra được nhưng dáng đi chưa rõ.

Mã hiện tại còn **nâng cả thân lúc nhấc một chân**; nếu không bù chân trụ, chân đang chống cũng bị kéo khỏi mặt đất.

**Làm lại:** vòng bước tại chỗ 48f: f0 hai chân tiếp đất → f6 dồn phải → f12 nhấc trái 10–12 px → f20 đặt trái → f24 chuyển tải → f30 dồn trái → f36 nhấc phải → f44 đặt phải → f48 khớp f0. Thân nhấp nhô chỉ 2–3 px; đầu bù trễ 2f.

Tay hiện tại nên gần B, chỉ đung đưa rất nhỏ. Muốn đánh tay đúng: thêm **tay đưa trước và tay đưa sau, khuỷu hơi gập**, thay vì dùng mức dang ngang. Rig hiện tại phù hợp **bước tại chỗ**; chưa đủ để diễn bước tiến có chiều sâu.

**8. Suy nghĩ**

- **k1/f20:** đầu nghiêng và mày lệch đọc được “thắc mắc”. **k2/f50:** vẫn cùng ý, chưa có diễn tiến suy nghĩ.
- **k3/f80:** gần k2; tay nhấc ra bên không có mục đích. **k4/f110:** tiếp tục giữ dáng hỏi.
- **k5/f140:** chưa có tư thế tập trung hoặc cân nhắc mới. **k6/f170:** thay đổi nhỏ ở đầu chưa đủ đọc thành nhận ra điều gì.
- **k7/f200:** lại gần dáng ban đầu. **k8/f230:** kết thúc bằng chính sự thắc mắc lúc đầu, thiếu kết quả.

**Làm lại:** f0 trung tính → f10 đầu nghiêng 4–6°, một mày nhướng vừa → f18 thân theo, chuyển trụ → f32 vào dáng suy nghĩ → f32–104 giữ, chớp mắt một lần → f116 đầu trở thẳng, mày nâng nhẹ như nhận ra → f128 gật một lần → f156 trở về nghỉ → f180 kết thúc.

**Tay mới nên có:** khuỷu gập, một bàn tay chạm **má dưới cạnh mõm**, tránh lỗ mũi và khăn. Không thêm miệng/cằm mới. Nếu chưa vẽ, để hai tay B; bỏ nhấc tay ra bên vì không giúp biểu đạt suy nghĩ.

**Nguyên tắc chung khi dựng lại:** đầu dẫn thân khoảng 3–5f; hông/chuyển trụ và chân theo sau. Tai, đuôi theo đà 3–6f, không chạy dao động đều suốt hành động. Chân trụ giữ y≈490; chỉ rời đất khi thực sự nhảy hoặc đổi bước. Nếu rig chưa giữ được chân trụ khi thân nhún/nghiêng, cần bổ sung bù chân — chỉnh easing không giải quyết được.

**C. 5 việc ưu tiên nhất để hết cảm giác “ngờ nghệch”**

1. **Chốt lại ba form tay tĩnh:** sửa buông dài sát hông, ngang hình thanh, cao chữ V; bàn tay phải đủ lớn và giữ thể tích.
2. **Vẽ dáng tay theo mục đích:** trước hết là cầm giấy trước ngực và chào gập khuỷu; tiếp theo chạm má, chỉ hướng, đánh tay đi.
3. **Dựng chuyển trọng tâm và khóa chân trụ trước khi diễn mặt.** Che tay/mặt vẫn phải thấy hành động có lực và có điểm tựa.
4. **Mỗi động tác có chuẩn bị → tư thế chính → giữ → thu về.** Bỏ dao động đều; chào một lần, xin lỗi một lần, mừng một cao trào rõ.
5. **Duyệt từng hành động ở kích thước dùng thật:** xem silhouette, phát 60 fps, soi thêm khung ngay trước/sau mỗi key pose. Ưu tiên làm đạt **chào → chỉ đường → cầm giấy**, rồi mới nhân sang các động tác còn lại.

---

# Vòng 2 (sau khi thêm bản tay mục đích + dựng lại 8 hành động)

51,028
Đã đọc nhận xét vòng 1 và đối chiếu mẫu gốc. **Vòng 2 tiến bộ rõ về ý nghĩa dáng tay, nhưng CHƯA ĐẠT để gửi duyệt trọn bộ.** Đánh giá dựa trên ảnh tĩnh; chưa xác nhận độ mượt, đổi bản tay và khóa chân khi phát. Không sửa repo.

**A. Form tay còn lệch gì**

- **Buông:** đã hết kiểu tay dài sát hông. Bàn tay vẫn hơi nhỏ, các ngón thành răng cưa đều; tăng khối lòng bàn tay khoảng **10–15%**, bo ngón mềm hơn.
- **Ngang/chỉ:** đã đọc được ngón trỏ. Ống tay còn giống thanh thẳng, cổ tay hơi vuông; làm cạnh dưới cong nhẹ và thuôn về cổ tay theo mẫu.
- **Giơ cao:** gần mẫu hơn nhiều. Tôi chỉnh lại nhận xét vòng 1: **mẫu gốc cho phép xoè chéo, không bắt buộc chữ U**. Chỉ cần mềm đường khuỷu, tránh hai cạnh thẳng song song.
- **Cầm giấy:** đúng bố cục hai tay trước ngực. Trong ảnh phóng to, hai bàn tay còn như hai miếng chữ nhật ép cạnh giấy; bo khối bàn tay, làm điểm kẹp rõ hơn.
- **Chống má:** nhận ra ngay, vị trí cạnh mõm phù hợp. Cổ tay–ống tay hơi gãy; làm mềm chỗ nối, giữ tiếp xúc khi đầu nghiêng/gật.

Đổi bản lúc tay buông là hợp lý, nhưng ảnh tĩnh chưa chứng minh được hết hiện tượng bật hình.

**B. Từng hành động**

`k` tính từ trái sang phải mỗi hàng. Các biên độ dưới đây là mức đề nghị thử.

| Hành động | Khung còn yếu và sửa cụ thể |
|---|---|
| **1. Chào** | **k3/f56:** tay hạ gần ngang, chen vào giữa hai dáng cao khiến dễ đọc thành chỉ rồi giơ lại. Nâng cực thấp này thêm **10–15°**, giữ bàn tay cao hơn vai. **k2, k4:** dùng được cho giơ tay chào. |
| **2. Chỉ đường** | **k2–k5/f42–110:** hướng tay rõ, nhưng đầu vẫn chủ yếu nhìn người xem; giống tạo dáng chỉ. Cho mắt dịch sang hướng chỉ khoảng **¼ bề rộng mắt**, đầu theo nhẹ. Giữ nguyên hướng ngón trỏ, không thêm nhún tay. |
| **3. Cầm giấy** | **k2–k5/f45–120:** cầm đúng nhưng chưa đọc rõ là đang đọc; mắt vẫn hướng trước. Hướng mắt xuống giấy, tăng độ hạ đầu hiện tại khoảng **30%**, tránh ép mõm vào giấy. **k6/f145:** ngẩng lại hợp lý. |
| **4. Mừng** | **k1/f20 → k2/f33:** có tương phản bật–nén. **k4/f61:** một tay gần ngang, tay kia còn chéo cao, nhìn hơi vung vụng. Khi thu tay, giới hạn lệch hai bên khoảng **10°**, trễ nhau tối đa **2–3f**. |
| **5. Xin lỗi** | **k2–k4/f38–76:** vẫn giống đứng hiền, cúi chưa đủ rõ. Tăng độ hạ đầu **30–40%**, thêm mắt nhìn xuống và tai cụp nhẹ; giữ điểm thấp **20–28f**. Không tăng nghiêng đầu sang bên để thay cúi. |
| **6. Chờ** | **k3–k4/f95–132:** nghiêng nhẹ dùng được nhưng chưa rõ chuyển trụ. Tăng dịch hông khoảng **30%**, giữ chân chịu lực cố định. **k6/f207:** chớp mắt ổn. Nhịp nhấc chân nằm giữa các ảnh, chưa đánh giá được. |
| **7. Đi** | **k2–k4 và k6–k8:** chân chưa tách dáng đủ rõ, vẫn giống đứng lắc. Tăng độ nhấc chân khoảng **50%**, giữ chân trụ bám đất; giữ nhấp nhô thân nhỏ như hiện tại. Tay đã bớt dang vô cớ, nên giữ. |
| **8. Suy nghĩ** | **k2–k5/f45–120:** chống má đọc tốt. **k3/f70:** nhắm mắt hợp lý. **k5/f120 → k6/f145:** đoạn nhận ra hơi chìm; giữ mắt mở, hai mày nâng **8–12f** trước cú gật. Kiểm tra tay không trượt khỏi má trong đoạn này. |

**C. Kết luận: CHƯA ĐẠT**

Ba việc sửa trước nhất:

1. **Làm rõ xin lỗi và đọc giấy bằng hướng mắt–đầu:** hiện ý nghĩa còn phụ thuộc tên hành động.
2. **Làm rõ bước đi:** tăng tương phản chân nhấc/chân trụ và kiểm tra bám đất khi phát.
3. **Sửa cực thấp của chào và đoạn thu tay mừng**, rồi xem clip ở kích thước dùng thật, đặc biệt các khung đổi bản tay.

**Đã sửa theo vòng 2:** chào giữ tay trên vai lúc nhấn; chỉ đường mắt liếc theo tay; cầm giấy đầu cúi thêm 30 %, mắt nhìn xuống giấy; mừng hai tay hạ gần đồng thời; xin lỗi đầu cúi sâu hơn 40 %, mắt nhìn xuống; chờ dịch hông thêm; đi nhấc chân 16 px; suy nghĩ mày nâng + mắt mở 12 khung trước cú gật; bàn tay to thêm 10 %. Đổi hành động luôn qua 'về nghỉ' (không chồng bản tay).
