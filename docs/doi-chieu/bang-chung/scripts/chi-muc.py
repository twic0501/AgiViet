from pathlib import Path
import json,re,csv,html,collections
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'docs/doi-chieu';EV=OUT/'bang-chung';shots=json.loads((EV/'du-lieu/man-v2.json').read_text())
def template(route):return re.sub(r'[a-f0-9]{8}-[a-f0-9-]{27,}',':id',route)
def good(x):return bool(x.get('title')) and not x.get('failure') and not any(e.startswith(('429 ','500 ','502 ','503 ')) for e in x.get('errors',[]))
by=collections.defaultdict(list)
for x in shots:by[(x['role'],template(x['route']))].append(x)
coverage=[]
for (role,route),rr in sorted(by.items()):
 ok=[x for x in rr if good(x)];chosen=ok[-1] if ok else rr[-1]
 status='có ảnh render' if ok else 'chưa có ảnh màn hợp lệ'
 if route in ['khong-co-man-nay','them','register'] and role=='ban' or route in ['khong-co-man-nay','them','post'] and role=='mua':status='ảnh redirect/route thử sai/quyền; không là màn nghiệp vụ'
 if route.startswith('invitation/'):status='có ảnh form đầu; token thử không hợp lệ; chưa xác nhận gia nhập'
 coverage.append([role,route,status,chosen.get('url',''),chosen.get('title',''),chosen['index'],'bang-chung/anh/'+chosen['filename'],chosen.get('tag',''),'; '.join(chosen.get('errors',[])) or chosen.get('failure','')])
# Declared router surfaces not reachable normally for that role; audit does not forge authorization.
for role,path,note in [('ban','demand-new','buyer-only permission gate; không là luồng seller bình thường'),('ban','bid/:id','buyer-only; chưa thử sai vai bằng form'),('ban','create-order/:id','buyer-only; chưa thử sai vai bằng form'),('mua','quote/:id/:id','seller_quote; không là luồng buyer bình thường')]:
 if (role,path) not in by:coverage.append([role,path,'không áp dụng theo vai / chưa thử gate', '',note,'','','',''])
with (OUT/'do-phu-route.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['app','route_template','trạng thái độ phủ','URL lúc chụp','tiêu đề','mã ảnh','file ảnh','fixture/lượt','lỗi']);w.writerows(coverage)
# Source config and route evidence do not prove all conditional states. Index makes failures visible.
cards=[]
for x in shots:
 s=x.get('scroll',{});h=next((h for h in x.get('headers',[]) if abs(h.get('y',-999)-s.get('headerYBefore',999))<1 and h.get('height',0)>0),{})
 scrolled=bool(s.get('appScrollTop') or s.get('windowScrollY'))
 label='header trôi' if scrolled and h.get('position') not in ['sticky','fixed'] else 'header bám top' if scrolled else 'chưa đủ cuộn'
 nghe='chữ Nghe' if any(i.get('text','').strip() for i in x.get('listen',[])) else 'icon Nghe' if x.get('listen') else 'không Nghe'
 state='đã render' if good(x) else 'lỗi/chưa kiểm'
 text=f"{x['index']} {x['role']} {x['route']} {x.get('title','')} {state} {label} {nghe} {x.get('tag','')}"
 errors='; '.join(x.get('errors',[])) or x.get('failure','')
 link='bang-chung/anh/'+x['filename'];scrolllink='bang-chung/anh/'+x['scrollFilename'] if x.get('scrollFilename') else ''
 cards.append(f'<article data-search="{html.escape(text.lower(),quote=True)}" data-role="{x["role"]}"><a href="{html.escape(link)}"><img loading="lazy" src="{html.escape(link)}" alt="{html.escape(text,quote=True)}"></a><div><b>{html.escape(x["index"]+" · "+x["role"])}</b><h2>{html.escape(x.get("title") or state)}</h2><code>{html.escape(x["route"])}</code><p>{html.escape(state+" · "+label+" · "+nghe)}</p><small>{html.escape(errors or x.get("tag") or "pilot")}</small><p><a href="{html.escape(link)}">Mở ảnh</a> {f" · <a href={html.escape(scrolllink)}>Ảnh cuộn</a>" if scrolllink else ""}</p></div></article>')
page='''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>AgiViet · Chỉ mục bằng chứng</title><style>
*{box-sizing:border-box}body{font:16px/1.55 system-ui,sans-serif;margin:0;background:#f4f5f1;color:#16241d}header{position:sticky;top:0;background:#fff;z-index:2;border-bottom:1px solid #ccd5cb;padding:16px 24px}h1{font-size:22px;margin:0}h2{font-size:17px;margin:6px 0}p{margin:6px 0}input,select{font:inherit;padding:10px;border:1px solid #b5c5b6;border-radius:6px;margin:10px 8px 0 0}input{width:min(600px,100%)}main{padding:24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}article{background:#fff;border:1px solid #d5ded3;border-radius:10px;overflow:hidden}article img{width:100%;height:320px;object-fit:contain;object-position:top;background:#e5e9e0}article>div{padding:16px}code,small{overflow-wrap:anywhere}a{color:#185039}article[hidden]{display:none}.note{padding:16px 24px;background:#f8edcd}</style>
<header><h1>AgiViet · Chỉ mục bằng chứng ảnh</h1><p><a href="bang-doi-chieu.md">Báo cáo</a> · <a href="bang-doi-chieu.csv">CSV</a> · <a href="do-phu-route.csv">Độ phủ route</a></p><input id="q" placeholder="Tìm route, header trôi, chữ Nghe, lỗi…"><select id="role"><option value="">Tất cả app</option><option value="ban">Bán</option><option value="mua">Mua</option><option value="quan-tri">Quản trị</option></select><span id="count"></span></header>
<div class="note">Ảnh màn hình là bằng chứng quan sát, không phải chứng nhận luồng E2E. Có ảnh lỗi, quyền bị từ chối, màn giữ chỗ và lượt thử lại; fixture cô lập được ghi nhãn. Xem manifest JSON và báo cáo để biết thời điểm, môi trường và giới hạn. Album E2E chẩn đoán có bước gọi API thay UI bị chặn.</div><main>'''+''.join(cards)+'''</main><script>const q=document.getElementById('q'),role=document.getElementById('role'),cards=[...document.querySelectorAll('article')];function filter(){let n=0;for(const c of cards){c.hidden=!(c.dataset.search.includes(q.value.toLowerCase())&&(!role.value||role.value===c.dataset.role));if(!c.hidden)n++}document.getElementById('count').textContent=n+' / '+cards.length+' lượt ảnh'}q.oninput=role.onchange=filter;filter();</script></html>'''
(OUT/'chi-muc-anh.html').write_text(page)
# List all images from browser workflow, with labels and their test outcome source.
parts=['# Album bổ sung: thao tác UI và mẫu 2\n','Các album UI cô lập không thay ảnh pilot. Lượt chẩn đoán có bypass phải đọc cùng bo-qua-ui.json.\n']
for dirname in ['anh-e2e','anh-e2e-chan-doan']:
 for f in sorted((EV/dirname).glob('*.png')):parts.append(f'- [{dirname}/{f.name}]({dirname}/{f.name})')
for x in json.loads((EV/'du-lieu/mau2-render.json').read_text()):parts.append(f'- [Mẫu 2 {x["file"]}](anh/{x["filename"]})')
(EV/'album-bo-sung.md').write_text('\n'.join(parts)+'\n')
print('route rows',len(coverage),'v2 captures',len(shots),'image refs',sum(1+bool(x.get('scrollFilename')) for x in shots))
