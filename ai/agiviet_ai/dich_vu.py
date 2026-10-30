"""HTTP nội bộ; không truy cập DB, không có quyền đăng/ký/tiền."""
from __future__ import annotations
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
STT_SLOT=threading.BoundedSemaphore(1)
AUDIT_LOCK=threading.Lock()
MAX_BODY=2_000_000

@app.middleware('http')
async def bao_ve(request:Request,call_next):
    rid=str(uuid.uuid4());request.state.request_id=rid;t0=time.perf_counter()
    key=os.getenv('AGV_AI_API_KEY')
    if key and not secrets.compare_digest(request.headers.get('x-ai-key',''),key):
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
    from .tro_ly import tra_loi
    with LLM_SLOT:
        k = tra_loi(req.cau, req.vai, req.du_lieu)
    request.state.tom_tat = {'loai': k.loai, 'nguon': k.nguon}
    return {'tra_loi': k.van_ban, 'loai': k.loai, 'nguon': k.nguon}


@app.post('/messages/scan')
def messages_scan(req:QuetTinRequest,request:Request):
    r=quet(req.noi_dung)
    request.state.tom_tat={'so_can_che':len(r['can_che']),'loai':sorted({p['loai'] for p in r['phat_hien']})}
    return r

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
