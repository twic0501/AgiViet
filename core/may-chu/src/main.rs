//! Máy chủ gRPC của lõi nghiệp vụ. Chỉ bọc các hàm thuần trong crate `nghiep-vu`; không giữ trạng thái.
//! Cấu hình: `CORE_ADDR` (mặc định 127.0.0.1:50051). Lõi chỉ nghe trong mạng nội bộ, cổng Go mới ra ngoài.
use nghiep_vu::{cccd, tien};
use tonic::{transport::Server, Request, Response, Status};

pub mod pb {
    tonic::include_proto!("agiviet.core.v1");
}
use pb::core_server::{Core, CoreServer};

struct Loi;

/// yyyy-mm-dd → (năm, tháng, ngày)
fn tach_ngay(s: &str) -> Option<(u32, u32, u32)> {
    let mut p = s.split('-').map(|x| x.parse::<u32>().ok());
    Some((p.next()??, p.next()??, p.next()??))
}

#[tonic::async_trait]
impl Core for Loi {
    async fn doc_qr_cccd(&self, yc: Request<pb::DocQrCccdRequest>) -> Result<Response<pb::TheCccd>, Status> {
        let yc = yc.into_inner();
        let hom_nay = tach_ngay(&yc.hom_nay).ok_or_else(|| Status::invalid_argument("hom_nay phải là yyyy-mm-dd"))?;
        let t = cccd::doc_qr_cccd(&yc.qr, hom_nay).map_err(|l| Status::invalid_argument(l.cau()))?;
        Ok(Response::new(pb::TheCccd { so: t.so, ho_ten: t.ho_ten, ngay_sinh: t.ngay_sinh, nu: t.nu, ngay_cap: t.ngay_cap }))
    }

    async fn quyet_toan(&self, yc: Request<pb::QuyetToanRequest>) -> Result<Response<pb::QuyetToanReply>, Status> {
        let y = yc.into_inner();
        let q = tien::quyet_toan(y.gia_tri_hang.into(), y.da_tra_thang.into(), y.coc.into(), y.nguoi_ban_chiu_them.into(), y.ben_mua_chiu_them.into())
            .ok_or_else(|| Status::invalid_argument("Số tiền không được âm."))?;
        // Đầu vào là i64 nên kết quả luôn vừa i64 trừ khi cộng tràn; tràn thì từ chối thay vì cắt số
        let v = |x: i128| i64::try_from(x).map_err(|_| Status::out_of_range("Số tiền vượt giới hạn."));
        Ok(Response::new(pb::QuyetToanReply { n: v(q.n)?, coc_ve_nguoi_ban: v(q.coc_ve_nguoi_ban)?, coc_hoan_ben_mua: v(q.coc_hoan_ben_mua)?, ben_mua_tra_them: v(q.ben_mua_tra_them)?, nguoi_ban_hoan: v(q.nguoi_ban_hoan)? }))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let dia_chi = std::env::var("CORE_ADDR").unwrap_or_else(|_| "127.0.0.1:50051".into()).parse()?;
    eprintln!("lõi nghiệp vụ nghe gRPC tại {dia_chi}");
    Server::builder().add_service(CoreServer::new(Loi)).serve_with_shutdown(dia_chi, async { let _ = tokio::signal::ctrl_c().await; }).await?;
    Ok(())
}
