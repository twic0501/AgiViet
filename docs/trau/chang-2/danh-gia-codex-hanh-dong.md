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
