"""Nội suy tay theo khung xương 2 đoạn (vai → khuỷu → cổ tay): cánh tay trên quay quanh vai, cẳng tay quanh khuỷu,
mỗi điểm viền theo đoạn xương gần nó (trộn mềm ở khuỷu). Dùng cho bản tay gập khuỷu (cầm giấy, chống má) trong dung-v3.py."""
import math
def _seg_d(p, a, b):
    ax, ay = b[0]-a[0], b[1]-a[1]; L2 = ax*ax+ay*ay or 1
    t = max(0, min(1, ((p[0]-a[0])*ax+(p[1]-a[1])*ay)/L2))
    return math.hypot(p[0]-a[0]-t*ax, p[1]-a[1]-t*ay)
def trong_so(p, S, E, W):
    du, df = _seg_d(p, S, E), _seg_d(p, E, W)
    # gần cẳng tay → 1; vùng khuỷu trộn mềm
    return 1 / (1 + (df / max(du, 1e-3)) ** 3)
def goc(a, b): return math.atan2(b[1]-a[1], b[0]-a[0])
def gan(g0, g1):
    while g1 - g0 > math.pi: g1 -= 2*math.pi
    while g1 - g0 < -math.pi: g1 += 2*math.pi
    return g1
def dia(p, O, g):  # toạ độ địa phương theo khung (O, góc g)
    dx, dy = p[0]-O[0], p[1]-O[1]; c, s = math.cos(-g), math.sin(-g)
    return (dx*c - dy*s, dx*s + dy*c)
def ra(l, O, g):
    c, s = math.cos(g), math.sin(g); return (O[0] + l[0]*c - l[1]*s, O[1] + l[0]*s + l[1]*c)
def noi_xuong(pa, pb, xa, xb, t, la_ban=False):
    """điểm pa (dáng a, xương xa=(S,E,W)) → pb (dáng b) tại t: cánh tay trên quay quanh vai, cẳng tay quanh khuỷu"""
    (Sa, Ea, Wa), (Sb, Eb, Wb) = xa, xb
    gua, gfa = goc(Sa, Ea), goc(Ea, Wa)
    gub, gfb = gan(gua, goc(Sb, Eb)), gan(gfa, goc(Eb, Wb))
    gu, gf = gua*(1-t)+gub*t, gfa*(1-t)+gfb*t
    lu = math.hypot(Ea[0]-Sa[0], Ea[1]-Sa[1])*(1-t) + math.hypot(Eb[0]-Sb[0], Eb[1]-Sb[1])*t
    S = (Sa[0]*(1-t)+Sb[0]*t, Sa[1]*(1-t)+Sb[1]*t)
    E = (S[0] + lu*math.cos(gu), S[1] + lu*math.sin(gu))
    w = 1.0 if la_ban else (trong_so(pa, Sa, Ea, Wa) + trong_so(pb, Sb, Eb, Wb)) / 2
    ua, ub = dia(pa, Sa, gua), dia(pb, Sb, gub)
    fa, fb = dia(pa, Ea, gfa), dia(pb, Eb, gfb)
    Pu = ra((ua[0]*(1-t)+ub[0]*t, ua[1]*(1-t)+ub[1]*t), S, gu)
    Pf = ra((fa[0]*(1-t)+fb[0]*t, fa[1]*(1-t)+fb[1]*t), E, gf)
    return (Pu[0]*(1-w)+Pf[0]*w, Pu[1]*(1-w)+Pf[1]*w)
