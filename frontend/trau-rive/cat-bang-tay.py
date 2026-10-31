"""Cắt 4 hình trong bảng tư thế → ảnh 512: tìm từng hình theo cặp móng chân ở đáy; căn tâm chân x=256,
chóp sừng (trong cột ±0,35 chiều cao quanh chân) y=58, đáy chân y=490."""
import sys, numpy as np
from PIL import Image
src, tien = sys.argv[1], sys.argv[2]
im=Image.open(src).convert('RGB'); a=np.asarray(im).astype(int); nb=a.sum(2)<600
H,W=nb.shape
for y in range(int(H*.6),H):
    if nb[y].mean()>0.4: nb[max(0,y-6):y+7]=False   # bỏ đường đất
rows=np.nonzero(nb.sum(1)>=6)[0]; bot=rows.max()
band=nb[bot-int(H*.03):bot+1].any(0)
cl=[]; x=0
while x<W:
    if band[x]:
        s=x
        while x<W and band[x]: x+=1
        cl.append((s,x))
    x+=1
fig=[]
for s,e in cl:   # gộp các cụm gần nhau (hai móng một con)
    if fig and s-fig[-1][1]<W*0.03: fig[-1]=(fig[-1][0],e)
    else: fig.append((s,e))
fig=sorted(fig,key=lambda g:g[1]-g[0],reverse=True)[:4]; fig.sort()
print([((s+e)//2) for s,e in fig])
for k,(s,e) in enumerate(fig):
    cx=(s+e)/2; hgt=bot-rows.min(); w=int(hgt*.35)
    col=nb[:,max(0,int(cx-w)):int(cx+w)]; top=np.nonzero(col.sum(1)>=6)[0].min()
    k512=(490-58)/(bot-top)
    x0p=cx-256/k512; y0p=top-58/k512
    im.transform((512,512),Image.EXTENT,(x0p,y0p,x0p+512/k512,y0p+512/k512),Image.BICUBIC,fillcolor='white').save(f'{tien}-{k}.png')
