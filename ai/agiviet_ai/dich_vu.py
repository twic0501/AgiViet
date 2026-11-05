"""HTTP nội bộ; không truy cập DB, không có quyền đăng/ký/tiền."""
from __future__ import annotations
import re
import asyncio
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import threading
import time
import uuid
import wave
from datetime import datetime, timezone
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel, Field
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse
from . import PHIEN_BAN
from .mo_hinh import MatchRequest, ReverseMatchRequest, VoiceRequest, GiaRequest, BatThuongRequest, TomTatRequest
from .ghep import ghep, ghep_nguoc, PHIEN_BAN_LUAT
from .trich_xuat import trich
from .gia_va_rui_ro import tham_khao, bat_thuong, tom_tat
from .lien_lac import quet
from .mo_hinh import QuetTinRequest

GOC=Path(__file__).resolve().parents[1]
app=FastAPI(title='AgiViet AI nội bộ',version=PHIEN_BAN)
LLM_SLOT=threading.BoundedSemaphore(1)
CHO_SLOT_S=4.0
STT_SLOT=threading.BoundedSemaphore(1)
AUDIT_LOCK=threading.Lock()
MAX_BODY=2_000_000

@app.middleware('http')
async def bao_ve(request:Request,call_next):
    rid=str(uuid.uuid4());request.state.request_id=rid;t0=time.perf_counter()
    key=os.getenv('AGV_AI_API_KEY')
    # /health không cần khóa: bộ kiểm sức khỏe của nền tảng host không gửi x-ai-key; chỉ trả trạng thái, không dữ liệu
    if key and request.url.path!='/health' and not secrets.compare_digest(request.headers.get('x-ai-key',''),key):
        return JSONResponse({'ma_loi':'KHONG_DU_QUYEN','request_id':rid},status_code=401)
    try:
        chunks=[];total=0
        async for part in request.stream():
            total+=len(part)
            if total>MAX_BODY: raise HTTPException(413,'DU_LIEU_QUA_LON')
            chunks.append(part)
        body=b''.join(chunks);request._body=body
        response=await call_next(request)
    except HTTPException as e:
        response=JSONResponse({'ma_loi':e.detail,'request_id':rid},status_code=e.status_code)
    except Exception:
        # Không trả exception/raw body chứa giá kín hoặc câu nói ra ngoài.
        response=JSONResponse({'ma_loi':'AI_LOI_NOI_BO','request_id':rid,'du_phong':'Dùng bộ luật backend hoặc nhập tay'},status_code=500)
    # Hàm băm giúp đối chiếu, không phải ẩn danh hay bằng chứng bất biến.
    event={'luc_utc':datetime.now(timezone.utc).isoformat(),'request_id':rid,'duong_dan':request.url.path,
           'http_status':response.status_code,'ms':round((time.perf_counter()-t0)*1000,3),
           'input_sha256':hashlib.sha256(locals().get('body',b'')).hexdigest(),
           'phien_ban':PHIEN_BAN,'phien_ban_luat':PHIEN_BAN_LUAT,
           'che_do':getattr(request.state,'che_do',None),'du_phong':getattr(request.state,'du_phong',None),
           'phien_ban_du_lieu':getattr(request.state,'snapshot',None),
           'dau_ra':getattr(request.state,'tom_tat',None)}
    audit=GOC/'ket_qua'/'kiem_toan.jsonl'
    try:
        with AUDIT_LOCK:
            with audit.open('a',encoding='utf-8') as f:f.write(json.dumps(event,ensure_ascii=False)+'\n')
    except OSError:
        return JSONResponse({'ma_loi':'KHONG_GHI_DUOC_KIEM_TOAN','request_id':rid},status_code=503)
    response.headers['X-Request-ID']=rid
    return response

@app.exception_handler(RequestValidationError)
async def loi_nhap(request,exc):
    # Pydantic errors mặc định chứa input: phải loại để tránh lộ giá kín.
    return JSONResponse({'ma_loi':'DU_LIEU_KHONG_HOP_LE','request_id':request.state.request_id,
                         'loi':[{'vi_tri':list(e['loc']),'loai':e['type']} for e in exc.errors()]},status_code=422)

@app.exception_handler(ValueError)
async def loi_gia_tri(request,exc):
    return JSONResponse({'ma_loi':'DU_LIEU_KHONG_HOP_LE','request_id':request.state.request_id},status_code=422)

@app.get('/health')
def health():return {'trang_thai':'san_sang','phien_ban':PHIEN_BAN,'luat':True,'stt_da_cau_hinh':stt_san_sang()}

@app.post('/match')
def match(req:MatchRequest,request:Request):
    request.state.snapshot=req.phien_ban_du_lieu;request.state.che_do='luat'
    r=ghep(req,noi_bo=True)
    # Nhật ký kiểm toán giữ thứ tự gợi ý + số bị loại theo luật (không số giá).
    request.state.tom_tat={'goi_y':{k:[x['lo_id'] for x in r[k]] for k in ('khop_du','khop_mot_phan','gan_khop_gia')},
                           'loai_bo':r['_loai_bo']['theo_ma'],'gom':r['goi_y_gom']}
    r.pop('_loai_bo')
    return r

@app.post('/match/reverse')
def match_reverse(req:ReverseMatchRequest,request:Request):
    request.state.snapshot=req.phien_ban_du_lieu;request.state.che_do='luat'
    r=ghep_nguoc(req)
    request.state.tom_tat={'nhu_cau':[x['nhu_cau_id'] for x in r['nhu_cau_khop']]}
    return r

def _tom_tat_giong(d):
    # Ghi tên trường, nguồn, độ tin cậy; KHÔNG ghi giá trị (giá thấp nhất là giá kín).
    return {'che_do':d['che_do'],'truong':{k:[v['nguon'],v['tin_cay']] for k,v in d['truong'].items()},
            'can_xac_nhan':d['can_xac_nhan'],'thieu':d['thieu'],'so_canh_bao':len(d['canh_bao'])}

@app.post('/voice/extract')
async def extract(req:VoiceRequest,request:Request):
    def luat(ly_do=None):
        r=trich(req.van_ban,req.hom_nay,che_do='luat',xung_ho=req.xung_ho,da_co=req.da_co).to_dict()
        if ly_do:r.update(che_do='luat(du_phong)',loi_mo_hinh=ly_do)
        request.state.che_do=r['che_do'];request.state.du_phong=ly_do;request.state.tom_tat=_tom_tat_giong(r)
        return r
    if req.che_do=='luat':return luat()
    if not LLM_SLOT.acquire(blocking=False):return luat('LLM_DANG_BAN')
    def run():
        try:return trich(req.van_ban,req.hom_nay,che_do='ket_hop',timeout_llm_s=req.timeout_llm_s,
                         xung_ho=req.xung_ho,da_co=req.da_co)
        finally:LLM_SLOT.release()
    task=asyncio.create_task(asyncio.to_thread(run))
    try:
        r=await asyncio.wait_for(asyncio.shield(task),timeout=req.timeout_llm_s+.25)
        request.state.che_do=r.che_do
        request.state.du_phong='LLM_LOI' if r.loi_mo_hinh else None
        d=r.to_dict()
        if r.loi_mo_hinh:d['loi_mo_hinh']='LLM_KHONG_SAN_SANG'
        request.state.tom_tat=_tom_tat_giong(d)
        return d
    except TimeoutError:return luat('LLM_QUA_HAN')

@app.post('/prices/reference')
def prices(req:GiaRequest):return tham_khao(req)

@app.post('/anomalies/check')
def anomalies(req:BatThuongRequest):return bat_thuong(req)

@app.post('/contracts/summarize')
def summary(req:TomTatRequest):return tom_tat(req)

class HoiTroLyRequest(BaseModel):
    cau: str = Field(min_length=1, max_length=600)
    vai: str = Field(default='ban', pattern='^(ban|mua)$')
    du_lieu: str = Field(default='', max_length=4000)


@app.post('/assistant/ask')
def assistant_ask(req: HoiTroLyRequest, request: Request):
    # Trợ lý hỏi đáp: rào chặn lừa/ngoài lề/số bịa nằm trong tro_ly; chỉ một lượt gọi mô hình tại một thời điểm
    from .tro_ly import tra_loi, TraLoi, la_lua, trong_pham_vi, CAU_LUA, CAU_NGOAI_LE
    from .nha_cung_cap import CAU_SOAN_SAN
    # Lừa / ngoài lề trả ngay, không chờ chỗ; còn lại chờ chỗ gọi mô hình tối đa CHO_SLOT_S rồi trả câu soạn sẵn
    # (4 s chờ + 2 bậc × 3,5 s < 15 s backend chờ)
    if la_lua(req.cau): k = TraLoi(CAU_LUA[req.vai], 'lua')
    elif not trong_pham_vi(req.cau): k = TraLoi(CAU_NGOAI_LE[req.vai], 'ngoai_le')
    elif LLM_SLOT.acquire(timeout=CHO_SLOT_S):
        try: k = tra_loi(req.cau, req.vai, req.du_lieu)
        finally: LLM_SLOT.release()
    else: k = TraLoi(CAU_SOAN_SAN, 'soan_san', 'ban')
    request.state.tom_tat = {'loai': k.loai, 'nguon': k.nguon}
    return {'tra_loi': k.van_ban, 'loai': k.loai, 'nguon': k.nguon}


class DoiTacRequest(BaseModel):
    vai: str = Field(pattern='^(buyer|seller)$')   # vai của AI: buyer = khách mua AI nhắn với người bán thật
    ten: str = Field(min_length=1, max_length=120)
    tinh: str = Field(default='', max_length=200)   # tính khách: sòng phẳng, khó tính…
    tinh_trang: str = Field(min_length=1, max_length=1500)
    tin: str = Field(min_length=1, max_length=600)
    dang_mac_ca: bool = True   # False = giá đã chốt (đã đồng ý / có hợp đồng): không gợi ý đổi giá
    lich_su: str = Field(default='', max_length=1500)   # vài tin gần nhất của cuộc trò chuyện (cũ → mới)


@app.post('/doi-tac/tra-loi')
def doi_tac_tra_loi(req: DoiTacRequest, request: Request):
    """Chatbot đối tác AI (bản thử): trả lời 1–2 câu đúng bước giao dịch. Lỗi/bịa số → 503, backend dùng câu soạn sẵn theo bước."""
    from .nha_cung_cap import NhaCungCap, LoiNhaCungCap
    from .tro_ly import so_la, la_lua
    if la_lua(req.tin):
        return {'tra_loi': 'Mình trao đổi và thanh toán trong app thôi nha, có gì AgiViet hỗ trợ hai bên.', 'nguon': 'lua'}
    if req.vai == 'buyer':
        xung = f"Bạn là người phụ trách mua của '{req.ten}' nhắn với người bán nông sản lớn tuổi. Gọi họ là 'bác', xưng 'em'. Việc đổi giá của BẠN (bên mua) luôn gọi là 'trả giá' (không bao giờ nói bạn 'chào giá'); việc đổi giá của người bán gọi là 'chào giá'."
    else:
        xung = f"Bạn là người bán '{req.ten}' nhắn với người phụ trách mua hàng của một doanh nghiệp. Gọi họ là 'anh/chị', xưng 'tôi' hoặc 'bên tôi'. Việc đổi giá của BẠN (bên bán) luôn gọi là 'chào giá'; việc đổi giá của bên mua gọi là 'trả giá'."
    # Đúng chữ theo vai: người bán đổi giá = "Chào giá mới", bên mua đổi giá = "Trả giá" (người sáng lập chốt 04/11)
    nut = ("Không mặc cả trong lời chào này nữa: nếu TÌNH TRẠNG nói lời chào đã đóng thì mời người kia gửi lời chào mới; "
           "nếu giá đã chốt / đã có hợp đồng thì nhắc làm tiếp bước kế (xem, ký hợp đồng) hoặc nhắn AgiViet khi muốn đổi điều khoản.") if not req.dang_mac_ca else ("nếu bác ấy muốn đổi giá thì nhắc bác bấm nút 'Chào giá mới' trong lời chào (với người bán luôn nói 'chào giá', không nói 'trả giá')."
           if req.vai == 'buyer' else "nếu họ muốn đổi giá thì nhắc họ bấm nút 'Trả giá' trong lời chào.")
    he = (xung + (f" Tính cách: {req.tinh}." if req.tinh else '') +
          " Nhắn như người thật đang chat trên điện thoại, tiếng Việt tự nhiên, ngắn 1–2 câu. TRƯỚC HẾT đáp thẳng vào đúng ý người kia vừa nhắn "
          "(họ chào thì chào lại, hỏi gì đáp nấy, xin thêm giá thì trả lời chuyện giá), rồi mới nhắc bước kế nếu cần. Không đọc lại mã hợp đồng hay trạng thái như máy, "
          "không lặp lại câu bạn đã nói trong LỊCH SỬ. Giá đã chốt mà người kia xin đổi: nói thật là giá hai bên đã chốt, từ chối rõ ràng, lịch sự; không tự đồng ý giá mới. "
          "KHÔNG hứa bù, thưởng, tính lại, nâng giá đợt sau; không hứa giữ hàng, đổi ngày hay bất cứ gì khác ngoài TÌNH TRẠNG. "
          "Người kia hỏi giấy chứng nhận, VietGAP, mã vùng trồng, xe, số tấn, giờ cụ thể mà TÌNH TRẠNG không có: nói thật là chưa có thông tin đó, sẽ kiểm rồi báo, tuyệt đối không tự khẳng định. "
          "Lý do giá phải đúng mặt hàng trong TÌNH TRẠNG (hàng tươi không nói chi phí sấy), và không nói chi phí xe nếu không phải phần của bạn. "
          "Trong app nút đổi giá tên là 'Đổi giá'. Chỉ nhắc bước kế khi đúng là bước đó; không lặp 'ký hợp đồng' ở mọi câu. "
          "Chỉ nói đúng theo TÌNH TRẠNG bên dưới; "
          "không tự đưa giá, số lượng, ngày giờ, số tiền nào ngoài TÌNH TRẠNG; không hứa điều chưa có. Việc chào giá, trả giá, đồng ý, ký, giao, trả tiền "
          "đều làm bằng nút trong app — " + nut + " "
          "Không xin số điện thoại, Zalo, tài khoản riêng. Nếu TÌNH TRẠNG có 'Mức cao nhất bạn chịu' hoặc 'Mức thấp nhất bạn chịu' và người kia xin đổi giá "
          "thì nêu con số đó MỘT lần khi LỊCH SỬ chưa có nó; nếu bạn đã nói con số đó rồi thì KHÔNG nhắc lại nguyên câu, hãy nói khác đi: đưa lý do thật (giá chợ hôm nay, chi phí sấy/vận chuyển, hàng loại mấy) hoặc hỏi họ chốt được không. "
          "Không bao giờ nói đây là 'mức cuối' hay 'tốt nhất'. Người kia nói thôi / khỏi / không bán nữa thì nhận lời nhẹ nhàng, để ngỏ lần sau, KHÔNG nài nỉ, không lặp giá. "
          "Văn nói miền Nam/Tây, dùng từ đời thường (dạ, thiệt, nha, hen, nè), mỗi lượt một kiểu câu khác nhau, không mở đầu giống câu trước. \nTÌNH TRẠNG: " + req.tinh_trang
          + (f"\nLỊCH SỬ (cũ → mới, chỉ để hiểu ngữ cảnh):\n{req.lich_su}" if req.lich_su else ''))
    if not LLM_SLOT.acquire(timeout=CHO_SLOT_S):
        raise HTTPException(503, 'bận')
    try:
        k = NhaCungCap().goi(he, req.tin, loai='doi_tac', timeout_s=6.0, toi_da=160)
    except LoiNhaCungCap:
        raise HTTPException(503, 'không gọi được mô hình')
    finally:
        LLM_SLOT.release()
    la = so_la(k.van_ban, req.tinh_trang + ' ' + req.tin + ' ' + req.lich_su)
    # Lời hứa miệng ngoài hợp đồng (tin nhắn lưu làm bằng chứng): bỏ, backend dùng câu soạn sẵn
    if re.search(r"đợt sau.{0,30}(bù|tính lại|nâng|thêm)|em bù|bên tôi bù|sẽ giữ hàng", k.van_ban, re.I):
        raise HTTPException(503, 'câu trả lời có lời hứa ngoài hợp đồng')
    # Rà soát #9: số chỉ có trong tin người kia (không có trong TÌNH TRẠNG) mà câu trả lời lại 'đồng ý/chốt' → là hứa theo số của người kia: bỏ
    if not la:
        so_nguoi_kia = so_la(k.van_ban, req.tinh_trang)
        if so_nguoi_kia and re.search(r"đồng ý|chốt|lấy luôn|ok|được luôn", k.van_ban, re.I):
            la = so_nguoi_kia
    request.state.tom_tat = {'nguon': k.nguon, 'so_la': len(la)}
    if la:
        raise HTTPException(503, 'câu trả lời có số không có trong tình trạng')
    return {'tra_loi': k.van_ban, 'nguon': k.nguon}


class DocToRequest(BaseModel):
    van_ban: str = Field(min_length=1, max_length=400)

_TTS_NHO: 'OrderedDict[str, bytes]' = None
_TTS_KHOA: dict = {}
_TTS_KHOA_CHUNG = threading.Lock()

@app.post('/tts')
def tts(req: DocToRequest, request: Request):
    """Đọc thành tiếng (WAV). Nhớ 300 câu gần nhất: câu hướng dẫn lặp lại không gọi lại mô hình."""
    global _TTS_NHO
    from collections import OrderedDict
    from fastapi import Response
    from agiviet_ai.nha_cung_cap import NhaCungCap, LoiNhaCungCap
    if _TTS_NHO is None: _TTS_NHO = OrderedDict()
    cau = ' '.join(req.van_ban.split())
    # Gom yêu cầu trùng đang chạy: mỗi câu một khóa → người đến sau chờ rồi lấy từ bộ nhớ (không tốn thêm lượt Gemini)
    with _TTS_KHOA_CHUNG: khoa = _TTS_KHOA.setdefault(cau, threading.Lock())
    with khoa:
        wav = _TTS_NHO.get(cau)
        if wav is None:
            try: wav = NhaCungCap().doc_thanh_tieng(cau)
            except LoiNhaCungCap as e: raise HTTPException(503, f'CHUA_DOC_DUOC: {e}')
            _TTS_NHO[cau] = wav
            while len(_TTS_NHO) > 300: _TTS_NHO.popitem(last=False)
        else: _TTS_NHO.move_to_end(cau)
    with _TTS_KHOA_CHUNG:
        if len(_TTS_KHOA) > 500: _TTS_KHOA.clear()
    request.state.tom_tat = {'so_chu': len(cau), 'byte': len(wav)}
    return Response(content=wav, media_type='audio/wav', headers={'cache-control': 'private, max-age=86400'})


@app.post('/messages/scan')
def messages_scan(req:QuetTinRequest,request:Request):
    r=quet(req.noi_dung)
    request.state.tom_tat={'so_can_che':len(r['can_che']),'loai':sorted({p['loai'] for p in r['phat_hien']})}
    return r

class DocAnhRequest(BaseModel):
    mime:str
    du_lieu_b64:str

@app.post('/messages/scan-image')
def messages_scan_image(req:DocAnhRequest,request:Request):
    """Đọc chữ/số trong ảnh tin nhắn (Gemini vision) để backend quét liên lạc. Lỗi nhà cung cấp → 503 (backend không gửi ảnh)."""
    from agiviet_ai.nha_cung_cap import NhaCungCap, LoiNhaCungCap
    if req.mime not in ('image/jpeg','image/png','image/webp') or len(req.du_lieu_b64)>8_000_000:raise HTTPException(422,'ANH_KHONG_HOP_LE')
    try:kq=NhaCungCap().doc_anh(req.mime,req.du_lieu_b64)
    except LoiNhaCungCap as e:raise HTTPException(503,f'CHUA_DOC_DUOC_ANH: {e}')
    request.state.tom_tat={'do_dai_chu':len(kq['chu']),'qr':kq['qr'],'app':kq['app_nhan_tin']}
    return kq

STT_PY=Path(os.getenv('AGV_STT_PYTHON',str(GOC/'.venv-stt'/'bin'/'python')))
_stt_proc=None

def stt_san_sang():
    return os.getenv('AGV_STT_TAT','')!='1' and STT_PY.exists()

def _stt_worker():
    """Tiến trình STT dùng lâu (nạp mô hình một lần). Gọi trong STT_SLOT."""
    global _stt_proc
    if _stt_proc is None or _stt_proc.poll() is not None:
        # thư viện CUDA cài bằng pip (nvidia-cublas-cu12, nvidia-cudnn-cu12) nằm trong venv STT
        nv=sorted((STT_PY.parent.parent/'lib').glob('python3*/site-packages/nvidia'))
        env=dict(os.environ)
        if nv:env['LD_LIBRARY_PATH']=':'.join([str(nv[0]/'cublas'/'lib'),str(nv[0]/'cudnn'/'lib'),env.get('LD_LIBRARY_PATH','')])
        _stt_proc=subprocess.Popen([str(STT_PY),'-m','agiviet_ai.stt','--worker'],cwd=GOC,text=True,env=env,
                                   stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
        if not json.loads(_stt_proc.stdout.readline() or '{}').get('san_sang'):raise RuntimeError('STT_LOI')
    return _stt_proc

@app.post('/voice/stt')
async def stt(request:Request):
    if not stt_san_sang():raise HTTPException(503,'STT_CHUA_CAU_HINH_DUNG_WEB_SPEECH_HOAC_NHAP_TAY')
    if request.headers.get('content-type','').split(';')[0] not in ('audio/wav','audio/x-wav'):
        raise HTTPException(415,'CAN_WAV_PCM16_MONO_16000HZ')
    body=await request.body()
    try:
        with wave.open(io.BytesIO(body),'rb') as w:
            if w.getnchannels()!=1 or w.getsampwidth()!=2 or w.getframerate()!=16000 or w.getcomptype()!='NONE':raise ValueError()
            if not 0<w.getnframes()<=30*16000:raise ValueError()
            if len(w.readframes(w.getnframes()))!=w.getnframes()*2:raise ValueError()
    except (wave.Error,EOFError,ValueError):raise HTTPException(422,'WAV_KHONG_HOP_LE_HOAC_QUA_30_GIAY')
    if not STT_SLOT.acquire(blocking=False):raise HTTPException(429,'STT_DANG_BAN')
    def run():
        tmp=GOC/'ket_qua'/'tam_stt';tmp.mkdir(exist_ok=True)
        try:
            with tempfile.NamedTemporaryFile(suffix='.wav',dir=tmp) as f:
                f.write(body);f.flush()
                # Hạn chờ 25 giây gồm cả lần nạp mô hình đầu tiên; quá hạn thì dừng tiến trình,
                # app rơi về Web Speech / gõ tay.
                p=_stt_worker()
                p.stdin.write(f.name+'\n');p.stdin.flush()
                kq={}
                def doc():kq['d']=p.stdout.readline()
                t=threading.Thread(target=doc,daemon=True);t.start();t.join(25)
                if t.is_alive():p.kill();raise RuntimeError('STT_QUA_HAN')
                d=json.loads(kq['d'] or '{}')
                if 'van_ban' not in d:raise RuntimeError('STT_LOI')
                return d
        finally:STT_SLOT.release()
    try:return await asyncio.to_thread(run)
    except (RuntimeError,ValueError):raise HTTPException(503,'STT_LOI_DUNG_NHAP_TAY')

# Tên cũ trong stub hạ tầng (infra/stub/ai.mjs) để không gãy bộ đo tải; trả cùng định dạng /voice/stt.
app.add_api_route('/voice/transcribe',stt,methods=['POST'])

@app.get('/thu-giong-noi')
def thu_giong_noi():return FileResponse(GOC/'thu_nghiem'/'giong_noi.html')
