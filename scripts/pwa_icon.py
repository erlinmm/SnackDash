"""Dependency-free, antialiased SnackDash launcher artwork.

The full-bleed background works with platform masks. The banana, motion
streaks and spark are kept inside the central 80% safe circle for Android.
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

    def curve(start, segments):
        pts=[start]
        for a,b,c in segments:
            x,y=pts[-1]
            for j in range(1,25):
                t=j/24; u=1-t
                pts.append((u**3*x+3*u*u*t*a[0]+3*u*t*t*b[0]+t**3*c[0],
                            u**3*y+3*u*u*t*a[1]+3*u*t*t*b[1]+t**3*c[1]))
        return pts

    def offset(pts, dx,dy):
        return [(x+dx,y+dy) for x,y in pts]

    def circle(cx,cy,r,color):
        polygon([(cx+r*math.cos(i*math.tau/64),cy+r*math.sin(i*math.tau/64)) for i in range(64)],color)

    # Circular athletic badge and subtly visible track lanes.
    circle(.5,.5,.405,(18,82,89))
    circle(.5,.5,.385,(43,162,147))
    for x in (.18,.27,.36):
        polygon([(x,.82),(x+.025,.82),(x+.37,.18),(x+.345,.18)],(51,174,156))

    # Fast-moving supply: cream speed stripes, angled like the runner's stride.
    for x,y,w in ((.17,.40,.17),(.15,.49,.19),(.21,.58,.11)):
        polygon([(x,y),(x+w,y-.035),(x+w-.025,y+.005),(x-.025,y+.04)],(255,245,210))

    # Hand-drawn crescent banana with a dark outline and warm shadow.
    banana=curve((.31,.34),[
        ((.39,.49),(.51,.60),(.64,.53)),
        ((.73,.48),(.77,.36),(.75,.26)),
        ((.78,.25),(.82,.26),(.83,.30)),
        ((.90,.49),(.76,.72),(.57,.77)),
        ((.38,.81),(.23,.63),(.23,.44)),
        ((.22,.40),(.26,.35),(.31,.34)),
    ])
    polygon(offset(banana,.014,.025),(12,58,65))
    polygon(banana,(92,55,28))
    inside=[(.54+(x-.54)*.943,.53+(y-.53)*.943) for x,y in banana]
    polygon(inside,(255,190,48))
    highlight=curve((.29,.41),[
        ((.35,.57),(.49,.68),(.63,.62)),
        ((.72,.58),(.77,.49),(.80,.39)),
        ((.79,.53),(.73,.65),(.61,.71)),
        ((.46,.77),(.33,.63),(.29,.41)),
    ])
    polygon(highlight,(255,226,91))
    shine=curve((.35,.54),[
        ((.41,.62),(.50,.66),(.56,.66)),
        ((.52,.69),(.41,.67),(.35,.54)),
    ])
    polygon(shine,(255,250,188))
    polygon([(.25,.41),(.28,.36),(.31,.35),(.34,.40),(.30,.44)],(124,82,42))
    polygon([(.75,.27),(.76,.22),(.79,.21),(.82,.26),(.82,.30),(.78,.31)],(110,76,36))
    # Bright four-point spark; readable even at a small launcher size.
    polygon([(.57,.23),(.60,.30),(.67,.33),(.60,.36),(.57,.43),(.54,.36),(.47,.33),(.54,.30)],(255,249,213))
    circle(.43,.27,.019,(255,249,213))

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
