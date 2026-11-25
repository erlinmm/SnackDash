"""Dependency-free, antialiased SnackDash launcher artwork.

The full-bleed background works with platform masks. The runner, water cup,
and motion streaks are kept inside the central 80% safe circle for Android.
"""
import math
import struct
import zlib


def icon(size, maskable=False):
    scale = 3
    n = size * scale
    rows = [bytearray(n * 3) for _ in range(n)]

    # Teal track-inspired background, darker toward the bottom.
    for y, row in enumerate(rows):
        t = y / (n - 1)
        color = bytes(round(a + (b-a)*t) for a,b in zip((39,147,139),(15,67,79)))
        row[:] = color * n

    def xy(x,y):
        # Slightly smaller art for adaptive launchers.
        f = .89 if maskable else 1
        return ((.5+(x-.5)*f)*n, (.5+(y-.5)*f)*n)

    def polygon(points, color):
        pts = [xy(*p) for p in points]
        lo = max(0, math.floor(min(p[1] for p in pts)))
        hi = min(n, math.ceil(max(p[1] for p in pts)))
        rgb = bytes(color)
        for y in range(lo, hi):
            yy = y+.5
            crosses = []
            for (x1,y1),(x2,y2) in zip(pts, pts[1:]+pts[:1]):
                if (y1<=yy<y2) or (y2<=yy<y1):
                    crosses.append(x1+(yy-y1)*(x2-x1)/(y2-y1))
            crosses.sort()
            for left,right in zip(crosses[::2],crosses[1::2]):
                l=max(0,math.ceil(left-.5))
                r=min(n,math.ceil(right-.5))
                if r>l: rows[y][l*3:r*3]=rgb*(r-l)

    def circle(cx,cy,r,color):
        polygon([(cx+r*math.cos(i*math.tau/64),cy+r*math.sin(i*math.tau/64)) for i in range(64)],color)

    # Circular athletic badge and subtly visible track lanes.
    circle(.5,.5,.405,(18,82,89))
    circle(.5,.5,.385,(43,162,147))
    for x in (.18,.27,.36):
        polygon([(x,.82),(x+.025,.82),(x+.37,.18),(x+.345,.18)],(51,174,156))

    cream=(255,248,222)
    ink=(14,66,78)
    orange=(255,153,76)
    blue=(102,212,245)

    def stroke(points, width, color):
        for (x1,y1),(x2,y2) in zip(points,points[1:]):
            length=math.hypot(x2-x1,y2-y1)
            if not length:
                continue
            dx,dy=-(y2-y1)*width/(2*length),(x2-x1)*width/(2*length)
            polygon([(x1+dx,y1+dy),(x2+dx,y2+dy),
                     (x2-dx,y2-dy),(x1-dx,y1-dy)],color)
        for x,y in points:
            circle(x,y,width/2,color)

    # Motion lines and the running athlete, reaching for a water cup.
    for x,y,w in ((.19,.39,.10),(.16,.46,.12),(.18,.53,.09)):
        stroke([(x,y),(x+w,y)],.025,cream)

    # Legs: a long forward stride and a bent trailing leg.
    stroke([(.43,.53),(.54,.63),(.46,.76),(.53,.77)],.082,ink)
    stroke([(.42,.53),(.32,.65),(.24,.68)],.082,ink)
    stroke([(.43,.53),(.54,.63),(.46,.76)],.055,cream)
    stroke([(.42,.53),(.32,.65),(.24,.68)],.055,cream)
    stroke([(.45,.76),(.53,.77)],.052,orange)
    stroke([(.24,.68),(.20,.66)],.052,orange)

    # Arms, forward arm reaching toward the hydration station.
    stroke([(.40,.39),(.30,.44),(.28,.36)],.073,ink)
    stroke([(.49,.39),(.56,.47),(.65,.43)],.073,ink)
    stroke([(.40,.39),(.30,.44),(.28,.36)],.045,cream)
    stroke([(.49,.39),(.56,.47),(.65,.43)],.045,cream)
    polygon([(.39,.35),(.48,.35),(.53,.40),(.46,.57),
             (.36,.55),(.35,.49)],ink)
    polygon([(.40,.37),(.47,.37),(.50,.41),(.44,.54),
             (.38,.53),(.38,.48)],orange)
    polygon([(.40,.43),(.465,.44),(.45,.50),(.39,.49)],cream)
    # Head and a bright running headband.
    circle(.49,.275,.085,ink)
    circle(.49,.275,.066,cream)
    polygon([(.427,.258),(.552,.244),(.554,.274),(.43,.287)],orange)

    # Water cup with a blue waterline and a simple hydration droplet.
    polygon([(.63,.37),(.80,.37),(.775,.59),(.66,.59)],ink)
    polygon([(.649,.39),(.781,.39),(.759,.566),(.677,.566)],cream)
    polygon([(.659,.445),(.771,.445),(.759,.566),(.677,.566)],blue)
    stroke([(.63,.375),(.80,.375)],.026,cream)
    polygon([(.715,.454),(.686,.496),(.692,.518),(.715,.527),
             (.738,.518),(.744,.496)],(27,122,180))
    circle(.715,.504,.027,(27,122,180))
    # Water splash above the cup.
    stroke([(.68,.325),(.665,.30)],.025,blue)
    stroke([(.72,.315),(.726,.275)],.025,blue)
    stroke([(.755,.33),(.777,.31)],.025,blue)

    # Box-filter supersampling produces crisp edges without Pillow.
    raw=[]
    divisor=scale*scale
    for y in range(size):
        out=bytearray()
        for x in range(size):
            i=x*scale*3
            for k in range(3):
                total=sum(rows[y*scale+dy][i+dx*3+k] for dy in range(scale) for dx in range(scale))
                out.append((total+divisor//2)//divisor)
        raw.append(b'\x00'+out)
    def chunk(tag,data):
        return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(raw)))+chunk(b'IEND',b'')
