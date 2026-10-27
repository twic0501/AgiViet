"""Lập mục lục và bảng ảnh để tự rà bố cục sau kiểm thử."""
from pathlib import Path
import json, html, sys
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2]
for folder in (sys.argv[1:] or ['anh-kiem-thu','anh-bo-sung','anh-luot-2']):
 base=root/'docs/frontend'/folder
 data=json.loads((base/'ket-qua.json').read_text())
 shots=data['shots']; current={s['file'] for s in shots}
 for old in base.glob('*.png'):
  if old.name not in current:old.unlink()
 for old in base.glob('contact-*.jpg'):old.unlink()
 items=[]
 for shot in shots:
  name=html.escape(shot['name']); file=html.escape(shot['file'])
  items.append(f'<figure><a href="{file}"><img loading="lazy" src="{file}" alt="{name}"></a><figcaption>{shot["role"]} · {name} · {shot["width"]} px</figcaption></figure>')
 (base/'index.html').write_text('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ảnh kiểm thử AgiViet</title><style>body{margin:24px;background:#f4f5f1;color:#16241d;font:16px/1.5 sans-serif}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}figure{margin:0;padding:12px;background:white;border:1px solid #dce2d9;border-radius:14px}img{width:100%;height:340px;object-fit:contain;object-position:top}figcaption{overflow-wrap:anywhere}a{color:#1d5a42}</style><h1>Ảnh kiểm thử AgiViet</h1><p>Bấm ảnh để xem kích thước gốc. <a href="ket-qua.json">Kết quả kiểm</a></p><main>'+''.join(items)+'</main></html>')
 for start in range(0,len(shots),12):
  group=shots[start:start+12];canvas=Image.new('RGB',(1440,1200),'#dce2d9');draw=ImageDraw.Draw(canvas)
  for i,shot in enumerate(group):
   im=Image.open(base/shot['file']).convert('RGB');im.thumbnail((350,350));x=(i%4)*360+(350-im.width)//2;y=(i//4)*400
   canvas.paste(im,(x,y+28));draw.text(((i%4)*360+5,y+3),f'{start+i+1}. {shot["role"]} {shot["name"][:24]}',fill='black')
  canvas.save(base/f'contact-{start//12+1}.jpg')
