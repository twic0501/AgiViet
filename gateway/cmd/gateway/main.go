// Cổng AgiViet: điểm vào duy nhất của hai app.
// Đường đã chuyển sang lõi Rust thì cổng tự phục vụ qua gRPC; mọi đường còn lại chuyển tiếp nguyên vẹn về backend cũ.
// Cấu hình: PORT (8080), BACKEND_URL (bắt buộc), CORE_ADDR (127.0.0.1:50051).
package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"

	pb "agiviet/gateway/internal/pb/agiviet/core/v1"
)

func env(k, macDinh string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return macDinh
}

// Cùng khuôn lỗi với backend cũ để app không phải phân biệt ai trả lời.
func loi(w http.ResponseWriter, ma int, code, cau string) {
	w.Header().Set("content-type", "application/json; charset=utf-8")
	w.WriteHeader(ma)
	json.NewEncoder(w).Encode(map[string]any{"errors": []map[string]any{{"code": code, "message": cau, "fix": nil, "details": nil}}})
}

var gioVN = time.FixedZone("ICT", 7*3600)

type cong struct {
	loi     pb.CoreClient
	backend *url.URL
	http    *http.Client
}

// Phiên do backend cũ quản: hỏi nó xem thẻ phiên còn hợp lệ không.
func (c *cong) daDangNhap(r *http.Request) bool {
	h := r.Header.Get("Authorization")
	if h == "" {
		return false
	}
	yc, _ := http.NewRequestWithContext(r.Context(), http.MethodGet, c.backend.JoinPath("/v1/me").String(), nil)
	yc.Header.Set("Authorization", h)
	kq, err := c.http.Do(yc)
	if err != nil {
		return false
	}
	kq.Body.Close()
	return kq.StatusCode == http.StatusOK
}

// POST /v2/cccd/doc {"qr": "..."} → họ tên, ngày sinh, 3 số cuối. Không trả số thẻ đầy đủ.
func (c *cong) docCccd(w http.ResponseWriter, r *http.Request) {
	if !c.daDangNhap(r) {
		loi(w, http.StatusUnauthorized, "CHUA_DANG_NHAP", "Bạn đăng nhập trước nhé.")
		return
	}
	var than struct {
		Qr string `json:"qr"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&than); err != nil || than.Qr == "" {
		loi(w, http.StatusBadRequest, "DU_LIEU_KHONG_HOP_LE", "Thiếu nội dung mã QR.")
		return
	}
	ctx, huy := context.WithTimeout(r.Context(), 3*time.Second)
	defer huy()
	the, err := c.loi.DocQrCccd(ctx, &pb.DocQrCccdRequest{Qr: than.Qr, HomNay: time.Now().In(gioVN).Format("2006-01-02")})
	if err != nil {
		if s, ok := status.FromError(err); ok && s.Code() == codes.InvalidArgument {
			loi(w, http.StatusUnprocessableEntity, "DU_LIEU_KHONG_HOP_LE", s.Message())
			return
		}
		log.Printf("lõi lỗi: %v", err)
		loi(w, http.StatusBadGateway, "LOI_HE_THONG", "Có lỗi hệ thống. Bạn thử lại sau ít phút.")
		return
	}
	w.Header().Set("content-type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(map[string]any{"ho_ten": the.HoTen, "ngay_sinh": the.NgaySinh, "nu": the.Nu, "so_cuoi": the.So[len(the.So)-3:]})
}

func main() {
	backend, err := url.Parse(os.Getenv("BACKEND_URL"))
	if err != nil || backend.Host == "" {
		log.Fatal("thiếu BACKEND_URL (địa chỉ backend cũ, vd http://127.0.0.1:8080)")
	}
	// Lõi chỉ nghe trong mạng nội bộ nên chưa dùng TLS. shortcut: không TLS giữa cổng và lõi, bật mTLS khi hai dịch vụ nằm khác máy.
	kn, err := grpc.NewClient(env("CORE_ADDR", "127.0.0.1:50051"), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("không tạo được kết nối tới lõi: %v", err)
	}
	defer kn.Close()
	c := &cong{loi: pb.NewCoreClient(kn), backend: backend, http: &http.Client{Timeout: 5 * time.Second}}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) })
	mux.HandleFunc("POST /v2/cccd/doc", c.docCccd)
	// SetURL đổi cả Host: Render và mọi máy chủ đặt sau tên miền chọn dịch vụ theo Host, giữ Host của cổng sẽ bị trả 404
	mux.Handle("/", &httputil.ReverseProxy{Rewrite: func(r *httputil.ProxyRequest) { r.SetURL(backend); r.SetXForwarded() }})

	may := &http.Server{Addr: ":" + env("PORT", "8080"), Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	go func() {
		log.Printf("cổng nghe tại %s, chuyển tiếp về %s", may.Addr, backend)
		if err := may.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()
	dung := make(chan os.Signal, 1)
	signal.Notify(dung, syscall.SIGINT, syscall.SIGTERM)
	<-dung
	ctx, huy := context.WithTimeout(context.Background(), 10*time.Second)
	defer huy()
	may.Shutdown(ctx)
}
