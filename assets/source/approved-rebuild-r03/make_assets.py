from __future__ import annotations
import os, sys, json, math, hashlib, io, colorsys, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps, ImageFont
from scipy.interpolate import PchipInterpolator
import numpy as np
import cairosvg

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT
W,H=1280,720
REF=ROOT/'assets/references/tokyo/approved'
PLATE=ROOT/'assets/source/approved-rebuild-r03/street/tokyo/empty_plate_seed.webp'
APPROVED={'normal':REF/'tokyo_normal_approved_r02.webp','fever':REF/'tokyo_fever_approved_r02.webp','inferno':REF/'tokyo_inferno_approved_r02.webp'}
BASE='assets/source/approved-rebuild-r03'
PRE='assets/previews/landscape-r02/approved-rebuild-r03'
FILES=[]
def write(path:str,data,kind=None):
    p=OUT/path; p.parent.mkdir(parents=True,exist_ok=True)
    if isinstance(data,(dict,list)): data=json.dumps(data,indent=2,ensure_ascii=False)+'\n'
    if isinstance(data,str): p.write_text(data,encoding='utf-8')
    else: p.write_bytes(data)
    FILES.append(str(path));return p

def png(path,im,compress=6):
    io_=io.BytesIO(); im.save(io_,format='PNG',compress_level=compress);return write(path,io_.getvalue())
def webp(path,im,quality=92):
    io_=io.BytesIO(); im.save(io_,format='WEBP',quality=quality,method=5);return write(path,io_.getvalue())
def svg(path,c,width=W,height=H,defs=''):
    s=f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">{defs}{c}</svg>\n'
    write(path,s);return s

def svg_png(s,scale=1):
    b=cairosvg.svg2png(bytestring=s.encode('utf8'),output_width=int(W*scale) if 'width="1280"' in s[:200] else None)
    return Image.open(io.BytesIO(b)).convert('RGBA')

def overlay_img(bg:Image.Image,layer:Image.Image):
    b=bg.convert('RGBA'); b.alpha_composite(layer.convert('RGBA')); return b

def font(size=20,bold=True):
    candidates=['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf']
    for s in candidates:
        if Path(s).exists():return ImageFont.truetype(s,size)
    return ImageFont.load_default()

def text(im,xy,string,sz=20,fill=(30,45,70),anchor='mm',stroke=0,stroke_fill=None):
    ImageDraw.Draw(im).text(xy,string,font=font(sz),fill=fill,anchor=anchor,stroke_width=stroke,stroke_fill=stroke_fill)

def line(im,xy,col,width=3):ImageDraw.Draw(im).line(xy,fill=col,width=width,joint='curve')

# Reopen exact user-approved images, never re-create or overwrite these sources.
refs={m:Image.open(p).convert('RGB').resize((W,H),Image.Resampling.LANCZOS) for m,p in APPROVED.items()}
plate=Image.open(PLATE).convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
for m,p in APPROVED.items():
    im=Image.open(p)
    print('approved',m,im.format,im.size,hashlib.sha256(p.read_bytes()).hexdigest())

# -------------------------------------------------------------------------
# STEP 01 — trace a shared centerline/edges from the user-approved perspective.
# These are explicit layout anchors, NOT claims of a physically measured 3D camera.
ys=np.array([194,215,242,280,330,390,470,550,635,720],float)
xs_l=np.array([732,710,658,601,533,467,392,345,304,270],float)
xs_r=np.array([846,895,946,999,1057,1121,1190,1261,1336,1420],float)
left_fn=PchipInterpolator(ys,xs_l);right_fn=PchipInterpolator(ys,xs_r)

def edges(y,expansion=0.0):
    y=min(720,max(194,float(y)))
    l=float(left_fn(y));r=float(right_fn(y)); c=(l+r)/2
    return (c-(r-l)*(1+expansion)/2,c+(r-l)*(1+expansion)/2)

def road_at(y,frac,expansion=0):
    l,r=edges(y,expansion);return l+(r-l)*frac

def size_at(y): return round(18+0.36*y,2)
RUNNERS=[
  dict(id='runner_12',number='12',x=475,y=662,eligible=True,shirt='#1f78c9',skin='#c88866',hair='#5a3029'),
  dict(id='runner_18',number='18',x=750,y=690,eligible=True,shirt='#f66b97',skin='#e5ae85',hair='#6b3431'),
  dict(id='runner_24',number='24',x=1048,y=626,eligible=True,shirt='#f3be2f',skin='#cb936f',hair='#613f31'),
  dict(id='runner_36',number='36',x=588,y=508,eligible=True,shirt='#7650b9',skin='#e0a381',hair='#522d3b'),
  dict(id='runner_30',number='30',x=814,y=444,eligible=True,shirt='#2463aa',skin='#e0a987',hair='#332b2c'),
  dict(id='runner_42',number='42',x=951,y=522,eligible=True,shirt='#df665b',skin='#dbab87',hair='#472d30'),
  dict(id='runner_48',number='48',x=642,y=347,eligible=True,shirt='#e5ac1d',skin='#a76545',hair='#433c32'),
  dict(id='runner_27',number='27',x=759,y=285,eligible=False,shirt='#ef7392',skin='#dca17a',hair='#3a322e'),
  dict(id='runner_56',number='56',x=866,y=276,eligible=False,shirt='#54abd7',skin='#e6b28d',hair='#3f3634'),
  dict(id='runner_39',number='39',x=785,y=247,eligible=False,shirt='#6e70b8',skin='#91654d',hair='#2c2c31'),
  dict(id='runner_71',number='71',x=820,y=224,eligible=False,shirt='#69b98b',skin='#d7b195',hair='#313f46')
]
for r in RUNNERS:
    r['height']=size_at(r['y']);r['road_fraction']=round((r['x']-edges(r['y'])[0])/(edges(r['y'])[1]-edges(r['y'])[0]),3)
    r['hit_box']={'center':(r['x'],round(r['y']-r['height']*.49,1)), 'width':round(max(72,r['height']*.46)), 'height':round(max(94,r['height']*.80))} if r['eligible'] else None

# SVG helpers
def path(d,fill='none',stroke='none',sw=1,extra=''):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def rect(x,y,w,h,fill,rx=0,stroke='none',sw=0):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def ellipse(x,y,rx,ry,fill,stroke='none',sw=0):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def stext(x,y,s,size,col='#20324d'):
    return f'<text x="{x}" y="{y}" font-family="DejaVu Sans,sans-serif" font-weight="800" font-size="{size}" fill="{col}" text-anchor="middle">{s}</text>'

road_layers=[]
for j in range(4):
    pts=[(road_at(y,j/3),y) for y in np.linspace(194,720,151)]
    d='M'+' L'.join(f'{x:.2f} {y:.2f}' for x,y in pts)
    road_layers.append(path(d,'none','#fffcef' if j in (1,2) else '#c0dbda',3 if j in (1,2) else 4))
road_centerline=''.join(road_layers)
road_polygon='M'+' L'.join(f'{edges(y)[0]:.2f} {y:.2f}' for y in np.linspace(194,720,130))+' L'+' L'.join(f'{edges(y)[1]:.2f} {y:.2f}' for y in np.linspace(720,194,130))+' Z'
road_vector=path(road_polygon,'#73778e','#d5b9d8',4)+road_centerline
svg(f'{BASE}/camera/approved_road_geometry.svg',road_vector)

def chibi_silhouette(r,grey=True):
    x,y,h=r['x'],r['y'],r['height'];k=h/204
    col='#515a70' if grey else r['shirt'];skin='#d1d3d6' if grey else r['skin'];hair='#53565a' if grey else r['hair']
    # 204px-high sprite drawn with baseline at y=0 then scaled/translated.
    d=f'<g transform="translate({x:.2f} {y:.2f}) scale({k:.4f})">'
    d+=ellipse(0,5,39,6,'#55505f',sw=0)
    d+=path('M-22 -88L-30 -21L-44 -7L-18 -2L0 -55L12 -22L31 -5L48 -10L28 -32L24 -91Z',skin,'#313c4d',3)
    d+=path('M-38 -115Q-27 -136 0 -133Q28 -135 39 -114L29 -71Q0 -62 -29 -72Z',col,'#26364d',4)
    d+=path('M-32 -108L-55 -85L-42 -69M34 -110L57 -90L44 -65','none',skin,14)
    d+=ellipse(0,-160,39,43,skin,'#2c3950',4)
    d+=path('M-37 -168Q-42 -201 -8 -201Q31 -203 39 -173Q21 -184 7 -181Q-9 -166 -37 -168Z',hair,'#28394e',3)
    d+=ellipse(-12,-158,3,4,'#253247')+ellipse(13,-158,3,4,'#253247')
    d+=path('M-10 -140Q0 -132 12 -140','none','#865462',3)
    d+=rect(-32,-110,64,45,'#fffdf6',7,'#26374b',4)
    # Number overlay is separate SVG text node in mock only
    d+=f'<g id="runtime-bib-text">{stext(0,-80,r["number"],37 if len(r["number"])<4 else 20)}</g>'
    return d+'</g>'

def gray_scene(variant='A'):
    exp=0 if variant=='A' else .045
    lpoly='M'+' L'.join(f'{edges(y,exp)[0]:.1f} {y:.1f}' for y in np.linspace(194,720,120))+' L'+' L'.join(f'{edges(y,exp)[1]:.1f} {y:.1f}' for y in np.linspace(720,194,120))+' Z'
    s=rect(0,0,W,H,'#e2e5e8')+rect(0,190,W,530,'#c9d0d4')
    s+=path(lpoly,'#888e9c','#626e7d',3)
    for j in [1,2]:
        pts=[(road_at(y,j/3,exp),y) for y in np.linspace(194,720,130)]
        s+=path('M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in pts),'none','#f0f2ed',5)
    s+=rect(22,18,270,80,'#fff',18,'#9aa7b6',3)+rect(310,18,210,80,'#fff',18,'#9aa7b6',3)+rect(538,18,218,80,'#fff',18,'#9aa7b6',3)
    s+=rect(11,543,145,75,'#f5f5f2',14,'#76849a',3)+rect(11,634,145,75,'#f5f5f2',14,'#76849a',3)
    # Staff physically behind the desk: head visible, lower body hidden by foreground tabletop.
    s+=ellipse(135,425,39,46,'#7B838C','#394656',3)
    s+=path('M99 449Q138 430 174 452L180 528L94 530Z','#9199A1','#3B4657',3)
    s+=path('M164 464Q200 448 217 428','none','#777E87',14)
    s+=rect(7,520,254 if variant=='A' else 235,175,'#bec1c6',7,'#727681',3)
    for r in RUNNERS:
        test_r={**r,'number':'1000' if r['id']=='runner_30' else r['number']}
        s+=chibi_silhouette(test_r)
    # Direct overlay numbers are review-only, not baked into sprites.
    s+=rect(215,210,132,86,'#fff',30,'#2e496b',4)+stext(281,274,'6',65)
    s+=stext(104,600,'4',44)+stext(104,690,'8',44)
    s+=stext(120,126,'CAMERA '+variant,19,'#344256')
    if variant=='A':s+=stext(980,58,'APPROVED TRACE',22,'#344256')
    else:s+=stext(980,58,'WIDTH STRESS TEST',22,'#344256')
    return svg(f'{BASE}/camera/camera_{variant}_grey_master.svg',s)
for v in ['A','B']:
    ss=gray_scene(v);png(f'{PRE}/01_camera_{v}_1280x720.png',Image.open(io.BytesIO(cairosvg.svg2png(bytestring=ss.encode()))).convert('RGB'))

# Anchor overlay directly over unchanged approved pixel images so locations can be judged.
def camera_overlay(im,mode='normal',gray=False):
    canvas=im.convert('RGBA')
    if gray:canvas=ImageOps.grayscale(canvas.convert('RGB')).convert('RGBA')
    paint=Image.new('RGBA',(W,H));d=ImageDraw.Draw(paint)
    for j in [0,1,2,3]:
        pts=[(road_at(y,j/3),y) for y in np.linspace(200,720,130)]
        d.line(pts,fill=(0,235,220,185) if j in [1,2] else (250,192,70,185),width=4)
    for r in RUNNERS:
        if not r['eligible']:continue
        cx,cy=r['hit_box']['center'];w=r['hit_box']['width'];h=r['hit_box']['height'];box=(cx-w/2,cy-h/2,cx+w/2,cy+h/2)
        d.rounded_rectangle(box,13,fill=(64,222,173,30),outline=(41,216,156,235),width=3)
        d.ellipse((cx-3,cy-3,cx+3,cy+3),fill=(255,231,85,240))
    for box in [(0,8,1260,111),(10,532,162,713),(207,175,379,304)]:
        d.rounded_rectangle(box,15,outline=(244,174,84,210),width=3)
    canvas.alpha_composite(paint)
    return canvas.convert('RGB')
for m in ['normal','fever','inferno']:
    png(f'{PRE}/01_approved_{m}_geometry_overlay.png',camera_overlay(refs[m],m))

safe=Image.new('RGB',(W,H),(245,247,249));d=ImageDraw.Draw(safe)
safe=Image.blend(refs['normal'],safe,0.63);d=ImageDraw.Draw(safe)
zones={
'hud':[15,12,1258,110], 'backup_0':[12,548,160,629], 'backup_1':[12,635,160,715],
'bubble':[215,185,384,317], 'runner_corridor':[400,200,1225,710], 'landmark':[1056,4,1220,193]
}
cs={'hud':'#df6f4e','backup_0':'#e88d32','backup_1':'#e88d32','bubble':'#e88d32','runner_corridor':'#178b96','landmark':'#6272ce'}
for key,box in zones.items():
    d.rounded_rectangle(tuple(box),14,outline=cs[key],width=4)
    tx=box[0]+12;ty=box[1]+8
    d.rectangle((tx-3,ty-5,tx+10+len(key)*12,ty+20),fill='white')
    text(safe,(tx,ty+7),key.upper(),14,fill=cs[key],anchor='lm')
png(f'{PRE}/01_approved_safe_zones.png',safe)
# Four-digit mid-field test is a dynamic bib overlay, never baked into the runner art.
fourdigit=refs['normal'].copy(); dr=ImageDraw.Draw(fourdigit)
dr.rounded_rectangle((779,300,836,340),6,fill='#FFFEF7',outline='#18335B',width=3)
text(fourdigit,(808,318),'1000',20,fill='#0A2E70')
png(f'{PRE}/01_four_digit_1000_midfield_test.png',fourdigit)

png(f'{PRE}/01_640x360_readability.png',camera_overlay(refs['normal']).resize((640,360),Image.Resampling.LANCZOS))
wide=Image.new('RGB',(1560,720));wide.paste(refs['normal'].resize((1560,720),Image.Resampling.LANCZOS));# DO NOT claim this stretched view as valid
# For review the camera content stays 1280 wide; outskirts extend using mirrored strips rather than stretching runner scale.
wide=Image.new('RGB',(1560,720));wide.paste(refs['normal'],(140,0));
wide.paste(ImageOps.mirror(refs['normal'].crop((0,0,140,720))),(0,0));wide.paste(ImageOps.mirror(refs['normal'].crop((1140,0,1280,720))),(1420,0));
png(f'{PRE}/01_wide_19_5x9_center_unchanged.png',wide)
narrow=Image.new('RGB',(960,720),(31,43,64));narrow.paste(refs['normal'].resize((960,540),Image.Resampling.LANCZOS),(0,90));
png(f'{PRE}/01_narrow_4x3_letterboxed.png',narrow)
# collision of hit regions; quantify overlap rather than claiming untested physical touch.
def iou(a,b):
    def box(r):
        cx,cy=r['hit_box']['center'];w=r['hit_box']['width'];h=r['hit_box']['height'];return(cx-w/2,cy-h/2,cx+w/2,cy+h/2)
    x1,y1,x2,y2=box(a);X1,Y1,X2,Y2=box(b)
    area=max(0,min(x2,X2)-max(x1,X1))*max(0,min(y2,Y2)-max(y1,Y1))
    if not area:return 0
    return area/((x2-x1)*(y2-y1)+(X2-X1)*(Y2-Y1)-area)
pairs=[{'a':a['id'],'b':b['id'],'iou':round(iou(a,b),3)} for i,a in enumerate(RUNNERS[:7]) for b in RUNNERS[i+1:7] if iou(a,b)>0.02]
coord={
    'schemaVersion':3,'visualSource':'owner-approved Tokyo Normal/Fever/Revised Inferno (Nov 2026)',
    'status':'derived review geometry, not original image or measured real-world pinhole calibration',
    'canvas':{'width':1280,'height':720},'approvedCamera':'A','cameraAlternative':'B is layout-only width stress, not owner-approved art',
    'road':{'screenSpaceModel':'monotonic PCHIP left/right traced boundaries; lane lines linear across width at equal y',
            'yControlPoints':ys.astype(int).tolist(),'leftX':xs_l.astype(int).tolist(),'rightX':xs_r.astype(int).tolist(),
            'laneFractions':[0,1/3,2/3,1],'farBendDirection':'road recedes towards the upper-middle/right'},
    'runnerScale':{'formula':'spriteHeightPx = 18 + 0.36 * footY',
        'uniformAcrossEligibleAndBackground':True,'targetEligible':7,
        'notes':'Stylized screen-space perspective scale calibrated from approved sample; does not encode age or real-world physical size'},
    'runners':RUNNERS,'hitboxOverlapPairsAbove0_02':pairs,'safeZones':zones,
    'touchPolicy':{'minimumPortraitCSSpxNotApplicable':True,'notDeviceMeasured':True,
        'minimumHitboxAt1280':{'width':72,'height':94},'only7Eligible':True,'closeRunnerSelection':'frontmost if regions overlap'},
    'responsive':{'base':'1280x720','thumbnail':'640x360',
       'wide19_5x9':'preserve center 1280x720; outer bands are illustrative extensions, not final art',
       'narrow4x3':'960x540 content with 90px top/bottom letterbox until UI reflow validated'},
    'uiNumbers':{'bubble':['6','12','13'],'backup':[4,8],'bib':['12','18','24','36','30','42','48','1000']},
    'statusTests':{'smallPixelsVisualOnly':True,'hardwareTouchTest':'pending'}
}
write(f'{BASE}/camera/approved_camera_coordinates.json',coord)
print('runners',[(r['number'],r['x'],r['y'],r['height'],r['road_fraction']) for r in RUNNERS]);print('overlap',pairs)

# -------------------------------------------------------------------------
# STEP 02 — use user-approved actual pixels as style evidence.
palettes={
 'outline':'#22395C','bibWhite':'#FFFDF4','bibNavy':'#082878',
 'normal':{'sky':'#218EF1','jacketBlue':'#267DC3','pavement':'#8F6EAD','skin':'#F3B28F','water':'#27B9EA'},
 'fever':{'sky':'#319DF0','jacketPink':'#F273A9','lantern':'#F9B84A','sakura':'#FF8DCB','bib':'#FFFDF4'},
 'inferno':{'sky':'#18298D','robeViolet':'#5B1A97','fireGold':'#FFC760','firePink':'#F856C5','water':'#35C9FE'},
 'materials':{'hair':'#653D2F','cap':'#237CDB','clothWarm':'#F474AF','skinWarm':'#F7B28F'},
 'rule':'Same character silhouette and number contrast across all three lighting modes; lighting overlays must not change epidermal identity.'
}
write(f'{BASE}/style/approved_palette.json',palettes)
write(f'{BASE}/style/approved_character_ratio.json',{
 'reference':'approved Tokyo trio at 1536x864 source images',
 'target':'cute chibi runners (~2.5–3.5 visual heads in approved illustrations, not 3.5–4.5 as old provisional gray asset)',
 'readableBib':{'foregroundAt1280':'~60–85 px wide','middle':'~45–60 px','fourDigitTest':'dynamic fitted 1000 in 60 px bib'},
 'continuity':coord['runnerScale'],
 'sampleCrops':{'staffNormal':[0,245,340,735],'staffFever':[0,240,350,740],'staffInferno':[0,190,370,670],'runnerField':[390,220,1340,850]},
 'modeConsistency':['head-to-body ratio','water item silhouette','bottle-cap blue','railings and lane geometry'],
 'status':'approval/reference extraction, not newly approved independent character models'
})
# Crop from ORIGINAL, not duplicated or re-rendered subjects.
style=Image.new('RGB',(1500,900),(241,243,250));d=ImageDraw.Draw(style)
text(style,(750,32),'APPROVED TOKYO REFERENCES  |  STYLE • SCALE • LIGHT',28,anchor='mm')
for i,m in enumerate(['normal','fever','inferno']):
    xx=16+497*i; src=Image.open(APPROVED[m]).convert('RGB')
    d.rounded_rectangle((xx,69,xx+471,632),radius=14,fill='white',outline=(198,205,220),width=3)
    # Each mode uses the same geometry in original approved images.
    src=src.crop((0,185,1500,864)).resize((461,424),Image.Resampling.LANCZOS)
    style.paste(src,(xx+5,122))
    text(style,(xx+236,96),m.upper(),22,fill={'normal':'#1681B8','fever':'#D34282','inferno':'#6832C0'}[m])
    text(style,(xx+236,565),'SAME CAMERA / MODE-SPECIFIC LIGHT',13)
    for j,(name,col) in enumerate(palettes[m].items()):
        colx=xx+13+(j%3)*146; coly=649+(j//3)*64
        d.rounded_rectangle((colx,coly,colx+31,coly+25),fill=col,outline='#5A6075',width=2)
        text(style,(colx+37,coly+12),name[:13],12,anchor='lm')
text(style,(755,835),'Source = unchanged owner-approved images; individual sprite cutouts are not implied.',16)
png(f'{PRE}/02_approved_style_scale_sheet.png',style)

# -------------------------------------------------------------------------
# STEP 03 — professional clean environment PLATE is a new candidate derived from visual direction.
# Retain its shared geometry, create mode lighting/color overlays without repainting road.
sharedplate=plate.convert('RGBA')
webp(f'{BASE}/street/tokyo/shared_empty_environment_plate.webp',plate,quality=95)
# Coarse but disjoint semantically identified pixel partitions.
region_masks={name:Image.new('L',(W,H),0) for name in ['skyline','left_street','road','right_river']}
for y in range(H):
    for x in range(W):
        if y<201:region='skyline'
        else:
            l,r=edges(y)
            region='left_street' if x<l else ('road' if x<=r else 'right_river')
        region_masks[region].putpixel((x,y),255)
# Verify every pixel is in one and only one layer.
a_sum=np.zeros((H,W),np.uint16)
for n,mask in region_masks.items():a_sum+=np.asarray(mask,dtype=np.uint16)
assert np.all(a_sum==255),'Layer partition is not disjoint/complete'
for n,mask in region_masks.items():
    layer=plate.convert('RGBA');layer.putalpha(mask)
    # Lossless alpha-cropped pixel content; source geometry/raster compositing is exact.
    png(f'{BASE}/street/tokyo/layers/{n}_master.png',layer,compress=9)
# Compositing all pieces must equal master exactly.
rebuild=Image.new('RGBA',(W,H),(0,0,0,0))
for n in region_masks:
    comp=plate.convert('RGBA');comp.putalpha(region_masks[n]);rebuild.alpha_composite(comp)
assert np.array_equal(np.asarray(rebuild.convert('RGB')),np.asarray(plate))

# Grading modes using same geometry; deliberately derived, not passed off as approved originals.
def grade_mode(original,mode):
    im=original.convert('RGB')
    a=np.asarray(im).astype(np.float32)
    Y,X=np.mgrid[:H,:W];fade=np.clip((265-Y)/250,0,1).astype('float32')[:,:,None]
    if mode=='fever':
        tint=np.array([255,161,207],np.float32)[None,None,:]
        a= a*(1-(0.16*fade))+tint*(0.16*fade)
        a[:,:,0]=np.clip(a[:,:,0]*1.05,0,255)
    if mode=='inferno':
        tint=np.array([26,28,98],np.float32)[None,None,:]
        a=a*(1-(0.62*fade))-0.04*a*fade+tint*(0.62*fade)
        a[:,:,0]*=0.87;a[:,:,1]*=0.82;a[:,:,2]*=1.00
        # Keep bright river shimmer and white lane markings.
        bottom=(1-fade)
        a=a*(1-0.06*bottom)
    return Image.fromarray(np.uint8(np.clip(a,0,255)),'RGB')
modeplates={m:grade_mode(plate,m) for m in ['normal','fever','inferno']}
for m in ['normal','fever','inferno']:webp(f'{BASE}/street/tokyo/{m}_empty_environment_plate.webp',modeplates[m],quality=95)

# Animated decorative overlay equivalents are standalone SVG only; road doesn't change.
import random
rand=random.Random(27013)
petals=''
for i in range(84):
    x=round(rand.uniform(35,1250),1);y=round(rand.uniform(150,690),1);rx=rand.uniform(2,6)
    petals+=f'<g transform="translate({x} {y}) rotate({i*29%360})">{ellipse(0,0,rx,rx*.55,rand.choice(["#FFB5D4","#FFDBE7","#F7A2D0"]))}</g>'
fever_overlay=petals+path('M0 160Q400 220 850 183','none','#FF8BC2',3)
svg(f'{BASE}/street/tokyo/ambient_fever.svg',fever_overlay)
def fireworks(x,y,R,col):
    s=''
    for i in range(12):
        a=i*2*math.pi/12
        p=(x+math.cos(a)*R*.3,y+math.sin(a)*R*.3);q=(x+math.cos(a)*R,y+math.sin(a)*R)
        s+=path(f'M{p[0]:.1f} {p[1]:.1f}L{q[0]:.1f} {q[1]:.1f}','none',col,3)
    return s+ellipse(x,y,7,7,'#FFF3D3')
inferno_overlay=fireworks(887,75,57,'#F5A2FF')+fireworks(1056,70,65,'#FFC762')+fireworks(1175,135,32,'#71DAFF')+petals
svg(f'{BASE}/street/tokyo/ambient_inferno.svg',inferno_overlay)

# Hand-authored vector road + rail guide (editable guides; visible elaborate rail art is in plate).
rail=''
for edge,side in [('left',-1),('right',1)]:
    for offset,col,sw in [(15,'#C7D1DD',6),(23,'#425474',5)]:
        pts=[]
        for yy in np.linspace(225,720,80):
            ll,rr=edges(yy);x=ll+offset*side if side==-1 else rr+offset
            pts.append((x,yy))
        rail+=path('M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in pts),'none',col,sw)
svg(f'{BASE}/street/tokyo/editable_rail_guides.svg',rail)

# Fixed rectangular table based on owner-approved screenshot. Separate frame, rear post, top and replaceable fascia.
# All three modes share IDENTICAL xy. Normal and Fever staff are behind, Inferno feet contact the top.
station_common_defs='''<defs><linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#F3C46E"/><stop offset="1" stop-color="#B47743"/></linearGradient><linearGradient id="topwood" x1="0" x2="1"><stop stop-color="#FFDB92"/><stop offset="1" stop-color="#D99855"/></linearGradient></defs>'''
rear_legs=path('M30 552L45 546L43 714L24 715Z','#855034','#4B3D3E',3)+path('M261 518L277 522L281 698L260 697Z','#855034','#4B3D3E',3)
frame=path('M9 557L255 517L290 548L282 718L15 718Z','url(#wood)','#6D473E',7)+path('M13 565L273 543L275 708L21 712Z','#B9854B','#71513E',3)
top=path('M0 538L247 501L290 535L273 564L11 575Z','url(#topwood)','#704D40',6)
top+=path('M16 547L251 515L275 533','none','#FFF0AE',4)
top+=path('M18 570L274 550','none','#7B543E',3)
top+=ellipse(143,533,116,17,'#AF6A3C',sw=0).replace('fill="#AF6A3C"','fill="#AF6A3C" opacity=".13"')
svg(f'{BASE}/station/tokyo/shared_table_rear_legs.svg',rear_legs,defs=station_common_defs)
svg(f'{BASE}/station/tokyo/shared_table_frame.svg',frame,defs=station_common_defs)
svg(f'{BASE}/station/tokyo/shared_tabletop.svg',top,defs=station_common_defs)
front_points='M57 577L260 553L258 705L60 712Z'
fascias={
'normal':('#275BA6','#F8F0F7'),
'fever':('#E56FA1','#FFF0FB'),
'inferno':('#303C99','#F2D5FF')}
for mode,(c0,c1) in fascias.items():
    decoration=path(front_points,c0,'#3F3C56',4)
    if mode=='normal':
        decoration+=path('M95 644Q130 606 153 646Q190 597 229 649','none','#DCEFFF',7)
        decoration+=ellipse(152,616,16,7,'#FFF7FF')
    elif mode=='fever':
        for xx,yy in [(111,640),(188,605),(224,667)]:
            for k in range(5):
                a=k*math.pi*2/5
                decoration+=ellipse(xx+math.cos(a)*12,yy+math.sin(a)*10,8,13,c1)
    else:
        for xx,yy in [(105,628),(206,615),(232,667)]:decoration+=fireworks(xx,yy,24,'#FBD17E')
    svg(f'{BASE}/station/tokyo/front_fascia_{mode}.svg',decoration)
# Separate station material masters and real alpha previews.
station_pngs={}
for mode in fascias:
    materials=[rear_legs,frame,Path(OUT/f'{BASE}/station/tokyo/front_fascia_{mode}.svg').read_text().split('>',1)[1].rsplit('</svg>',1)[0],top]
    src=svg(f'{BASE}/station/tokyo/assembled_station_{mode}.svg',''.join(materials),defs=station_common_defs)
    render=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=src.encode()))).convert('RGBA')
    station_pngs[mode]=render
    png(f'{BASE}/station/tokyo/assembled_station_{mode}.png',render)

# Volunteer vector proxy with clear occlusion: behind desk in normal/fever, standing atop in Inferno.
def volunteer_art(mode):
    normal=mode in ('normal','fever');cx,cy=(140,420) if normal else (176,330)
    shirt={'normal':'#226DBC','fever':'#F47AAA','inferno':'#573196'}[mode]
    skin='#F1B18F'; outline='#463F55';hair='#593A35'
    s=''
    if normal:
        s+=path('M95 450Q135 414 190 453L210 556L79 566Z',shirt,outline,5)
        s+=path('M122 457L139 485L163 457','none','#FFF3E6',12)
        s+=path('M181 467Q205 443 237 430','none',skin,20)
        s+=ellipse(236,427,12,10,skin,outline,3)
        s+=ellipse(138,406,49,52,skin,outline,5)
        s+=path('M89 406Q83 351 132 352Q192 345 188 411Q171 394 154 385Q136 415 89 406Z',hair,outline,3)
        s+=ellipse(120,409,4,5,outline)+ellipse(151,409,4,5,outline)
        s+=path('M127 434Q144 445 156 429','none','#A46467',4)
        s+=path('M95 379Q137 349 184 381','none','#FFFFFF',14)
        s+=ellipse(128,372,14,8,'#89C3F1')
        if mode=='fever':s+=ellipse(174,370,12,12,'#F8B0D2')
    else:
        # Shoes on top polygon @ (140..200, 510..525). Robe hides legs as required.
        s+=path('M119 502L157 509L190 512L211 505L226 517Q175 545 108 520Z','#553783',outline,5)
        s+=ellipse(141,519,19,7,'#FFF0DD',outline,4)+ellipse(197,511,21,7,'#FFF0DD',outline,4)
        s+=path('M140 366L204 361Q229 401 229 496Q202 529 112 512Q100 458 121 393Z',shirt,outline,6)
        for xx,yy in [(132,436),(196,417),(154,485)]:s+=fireworks(xx,yy,14,'#FFD469')
        s+=path('M132 397L111 423L119 452','none',skin,17)
        s+=path('M214 381Q248 348 275 304','none',skin,22)
        s+=ellipse(280,305,12,10,skin,outline,3)
        s+=ellipse(172,313,56,58,skin,outline,5)
        s+=path('M116 313Q112 258 155 257Q223 241 231 308Q200 290 184 273Q148 313 116 313Z',hair,outline,4)
        s+=ellipse(155,314,4,5,outline)+ellipse(185,315,4,5,outline)
        s+=path('M155 339Q173 350 189 337','none','#A45F6A',4)
        for xx,yy in [(133,265),(206,265),(120,285)]:s+=ellipse(xx,yy,14,12,'#FFE0F1')
    return s
for mode in ['normal','fever','inferno']:
    s=svg(f'{BASE}/station/tokyo/volunteer_geometry_proxy_{mode}.svg',volunteer_art(mode))
    # Worker is review-only geometry proxy, not the finished model specified in step06.

# Scene composition: staff behind table and table occludes torso. Inferno staff on same table.
for m in ['normal','fever','inferno']:
    im=modeplates[m].convert('RGBA')
    if m!='normal':
        ambient_src=(OUT/f'{BASE}/street/tokyo/ambient_{m}.svg').read_text()
        alpha=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=ambient_src.encode()))).convert('RGBA')
        im.alpha_composite(alpha)
    # For all three modes: rear table legs + worker + front fascia + TOP (last) for behind-table occlusion;
    # for Inferno: table fully drawn FIRST, worker drawn on TOP to show weight contact.
    art_src=f'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">{station_common_defs}'
    fascia_content=(OUT/f'{BASE}/station/tokyo/front_fascia_{m}.svg').read_text().split('>',1)[1].rsplit('</svg>',1)[0]
    if m!='inferno':pieces=rear_legs+volunteer_art(m)+frame+fascia_content+top
    else:pieces=rear_legs+frame+fascia_content+top+volunteer_art(m)
    alpha=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=(art_src+pieces+'</svg>').encode()))).convert('RGBA')
    im.alpha_composite(alpha)
    png(f'{PRE}/03_tokyo_{m}_station_occlusion_review.png',im.convert('RGB'))
    # No game numbers/player UI in empty-mode environment plate; this is scene station placement QA only.

# -------------------------------------------------------------------------
# STEP 04 — pixel-perfect original standalone SVG supplies and high-resolution true-alpha PNGs.
PROPS_DEFS='''<defs><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FCFFFF" stop-opacity=".98"/><stop offset=".42" stop-color="#8ACDF4" stop-opacity=".8"/><stop offset="1" stop-color="#D6F9FF" stop-opacity=".96"/></linearGradient><linearGradient id="banana" x1="0" x2="1"><stop stop-color="#FFE898"/><stop offset=".6" stop-color="#FFD049"/><stop offset="1" stop-color="#EBA939"/></linearGradient><linearGradient id="gel" x1="0" x2="1"><stop stop-color="#92F2B9"/><stop offset="1" stop-color="#159C85"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="3"/></filter></defs>'''
PROPS={
'water':path('M64 38L92 38L92 57Q111 62 115 83L112 167Q111 187 95 189L59 189Q43 188 43 170L40 83Q45 62 64 57Z','url(#glass)','#23456B',5)
 +rect(60,22,38,23,'#268ADF',7,'#1C4A83',4)+path('M64 28V38M73 28V38M84 28V38M93 28V38','none','#B9E4FF',3)
 +rect(51,91,53,47,'#E6F8FF',13,'#73C3E8',2)
 +path('M55 72L51 162','none','#FFFFFF',8)+path('M102 69Q114 84 107 114','none','#FFFFFF',6)
 +path('M59 155Q79 162 103 155','none','#C5F4FF',5)
 +path('M70 115C70 107 79 98 79 98C79 98 88 109 88 115A9 9 0 1 1 70 115Z','#35BCE7','#1A93BF',2),
'gel':path('M49 30L106 30L116 52L114 169Q114 191 99 192L53 192Q41 187 39 170L42 52Z','url(#gel)','#1B5366',5)
 +path('M51 30L108 30L103 48L55 47Z','#C8FFE8','#1B5366',3)
 +path('M105 31L117 23L119 55Z','#168F8E','#1B5366',3)
 +path('M55 61Q80 71 104 61L103 157Q82 172 54 159Z','#16A68D','#0B806F',2)
 +path('M58 79L67 83L63 148L55 144','none','#A8F7DA',5)
 +ellipse(79,117,22,26,'#FFEDB3')+path('M71 120L84 99L92 115L78 131Z','#F5AF57','#E6A151',2)
 +path('M51 174L105 174','none','#BAFFEF',4),
'banana':path('M35 47Q39 134 117 164Q147 142 155 64Q132 112 105 119Q65 122 53 64Z','url(#banana)','#6B4C36',6)
 +path('M55 71Q75 109 111 122Q135 124 144 85','none','#FFF5A7',10)
 +path('M59 96Q76 140 116 152','none','#F09C35',5)
 +path('M33 39L50 43L60 66L44 65Z','#78583C','#483A39',4)
 +path('M147 58L161 53L165 70L150 78Z','#745339','#483A39',4)
}
PROP_OUT=f'{BASE}/supply'
for item in PROPS:
    # master 200x200, separate changes by using only transforms in derivatives.
    master=svg(f'{PROP_OUT}/{item}/master.svg',PROPS[item],200,200,PROPS_DEFS)
    for role,angle,scale in [('hand',-18,1.0),('flight',44,1.0),('slot',-12,.56)]:
        source=f'<g transform="translate(100 100) rotate({angle}) scale({scale}) translate(-100 -100)">{PROPS[item]}</g>'
        derivative=svg(f'{PROP_OUT}/{item}/{role}.svg',source,200,200,PROPS_DEFS)
        raw=cairosvg.svg2png(bytestring=derivative.encode(),output_width=256 if role!='slot' else 128,output_height=256 if role!='slot' else 128)
        # Preserve alpha explicitly; no white background.
        sprite=Image.open(io.BytesIO(raw)).convert('RGBA')
        png(f'{PROP_OUT}/{item}/{role}.png',sprite,compress=9)

bubble_shape=path('M36 11H191Q209 11 209 29V94Q209 111 189 111H107L79 132V111H36Q17 111 17 91V29Q17 11 36 11Z','#FFFFFF','#192E55',7)+path('M39 32Q43 24 67 25','none','#DFEEF7',5)
slot_shape=rect(8,7,181,94,'#172E55',25,'#0C2040',5)+rect(14,13,169,82,'#FBFCF6',20,'#A5C6DD',3)+rect(23,22,68,64,'#E6F7FE',13)+path('M115 29L166 29M115 80L167 80','none','#DBE6EB',5)
svg(f'{BASE}/ui/speech_number_empty.svg',bubble_shape,226,142)
svg(f'{BASE}/ui/backup_slot_empty.svg',slot_shape,197,109)
for name in ['speech_number_empty','backup_slot_empty']:
    s=(OUT/f'{BASE}/ui/{name}.svg').read_text()
    b=cairosvg.svg2png(bytestring=s.encode(),output_width=452 if name.startswith('speech') else 394)
    png(f'{BASE}/ui/{name}.png',Image.open(io.BytesIO(b)).convert('RGBA'),compress=9)
# Layered grip: rear fingers behind a physical item, thumb and knuckles in front.
reargrip=path('M18 108Q27 77 47 71Q61 65 67 77L74 92L60 124L33 136Z','#F2B18B','#754F59',5)
thumb=path('M13 94Q29 68 46 84L65 106Q72 117 61 128Q54 135 42 122L22 108Z','#F8C19C','#805B60',5)
svg(f'{BASE}/supply/grip_rear_hand.svg',reargrip,102,156)
svg(f'{BASE}/supply/grip_front_thumb.svg',thumb,102,156)
# Object flight arc (no number printed on physical item).
flight_arc=path('M340 390Q460 250 590 380','none','#FFD05E',10)+path('M342 390Q460 252 590 380','none','#FFF5AA',4)
svg(f'{BASE}/supply/flight_arc_fx_master.svg',flight_arc)

# Source-only test assembly with three modes (6/12/13), reserves show icon + number, airborne item has NO number.
def paste_transparent(dst,src,xy,size=None):
    if isinstance(src,(str,Path)):src=Image.open(src).convert('RGBA')
    if size:src=src.resize(size,Image.Resampling.LANCZOS)
    dst.alpha_composite(src,(int(xy[0]),int(xy[1])))
def prop_img(name,role):return Image.open(OUT/f'{PROP_OUT}/{name}/{role}.png').convert('RGBA')
def ui_img(name):return Image.open(OUT/f'{BASE}/ui/{name}.png').convert('RGBA')
for index,(item,num) in enumerate([('water',6),('gel',12),('banana',13)]):
    mode=['normal','fever','inferno'][index]
    img=Image.new('RGBA',(W,H),(0,0,0,0));
    # Camera overlay is NOT the final approved image; use the composited scene geometry plate.
    img.alpha_composite(modeplates[mode].convert('RGBA'))
    paste_transparent(img,station_pngs[mode],(0,0))
    paste_transparent(img,ui_img('speech_number_empty'),(215,215),(180,112))
    text(img,(306,264),str(num),52,fill='#082878')
    for n,(it,qty) in enumerate([('water',4),('banana',8)]):
        box=ui_img('backup_slot_empty')
        paste_transparent(img,box,(12,541+n*86),(144,80))
        paste_transparent(img,prop_img(it,'slot'),(20,548+n*86),(76,76))
        text(img,(113,578+n*86),str(qty),39,fill='#172F5B')
    paste_transparent(img,prop_img(item,'hand'),(319,344),(90,90))
    paste_transparent(img,prop_img(item,'flight'),(457,315),(88,88))
    # sample only; transparent numeric overlay is attached to bubble, not sprite; flight doesn't contain text.
    png(f'{PRE}/04_{mode}_{item}_assembly_review.png',img.convert('RGB'))

# Contact sheet for 9 sprite exports, light/dark backgrounds.
contact=Image.new('RGB',(1200,850),(241,245,249));d=ImageDraw.Draw(contact)
text(contact,(600,32),'ORIGINAL SUPPLY COMPONENTS — 3 ITEMS × 3 USES',27)
for i,item in enumerate(['water','gel','banana']):
    text(contact,(185+i*400,79),item.upper(),23)
    for j,role in enumerate(['hand','flight','slot']):
        x=i*400+20; y=104+j*234
        d.rounded_rectangle((x,y,x+365,y+205),radius=18,fill='#ffffff' if j!=1 else '#22344f',outline='#aab6cc',width=3)
        p=prop_img(item,role); p.thumbnail((155,155))
        contact.paste(p,(x+104,y+21),p)
        text(contact,(x+179,y+183),role.upper(),16,fill='#26354b' if j!=1 else '#ffffff')
png(f'{PRE}/04_supplies_alpha_contact_sheet.png',contact)

# -------------------------------------------------------------------------
# QA and reproducibility (validations that can really be signed at preview phase).
validation={'schemaVersion':3,'referenceIntegrity':{},'camera':{},'step03':{},'step04':{},'manualDeviceQA':'pending'}
for m,p in APPROVED.items():validation['referenceIntegrity'][m]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sourcePx':list(Image.open(p).size)}
validation['camera']={'activeCount':len([r for r in RUNNERS if r['eligible']]),'runnerScaleMonotonic':all(size_at(y+10)>size_at(y) for y in range(200,700,20)),'screenSpaceLaneWidthMonotonic':all(edges(y+20)[1]-edges(y+20)[0]>edges(y)[1]-edges(y)[0] for y in range(200,680,20)), 'hitboxIouPairs':pairs,'hitboxCollisionReviewNeeded':len(pairs)>0}
validation['step03']={'fourPartLayerRecompositionExact':np.array_equal(np.asarray(rebuild.convert('RGB')),np.asarray(plate)),'sameTableCoordinatesAllModes':True,'volunteerOcclusionOrderBehindInNormalFever':True,'infernoFeetOnUnchangedTabletop':'illustrated proxy contact; manual visual review still required'}
alpha={}
for item in PROPS:
    for role in ['hand','flight','slot']:
        im=Image.open(OUT/f'{PROP_OUT}/{item}/{role}.png').convert('RGBA')
        alpha[f'{item}_{role}']={'cornerAlpha':im.getpixel((0,0))[3],'nontransparentPixels':int(np.sum(np.asarray(im)[:,:,3]>0)), 'hasRealAlpha':im.getpixel((0,0))[3]==0}
for name in ['speech_number_empty','backup_slot_empty']:
    im=Image.open(OUT/f'{BASE}/ui/{name}.png').convert('RGBA')
    alpha[name]={'cornerAlpha':im.getpixel((0,0))[3],'hasRealAlpha':im.getpixel((0,0))[3]==0}
assert len(alpha)==11 and all(v['hasRealAlpha'] for v in alpha.values())
validation['step04']={'alphaExports':alpha,'bubbleSourceTextFree':'<text' not in (OUT/f'{BASE}/ui/speech_number_empty.svg').read_text(),'twoSlotsOnlyInAssembly':True,'samePhysicalObjectForHandFlightAndIcon':True,'gelNotMappedToRuntime':True}
write(f'{PRE}/QA_approved_steps_01_04.json',validation)

spec='''# SnackDash Tokyo — approved-reference rebuild, steps 01–04

**Branch target:** `feature/main2-landscape-assets-r02` (the existing user-authorized branch)  
**Design basis:** three user-approved Tokyo images, with **revised Inferno `1000084030.png`**.  
**Status:** derived source and previews **for review**. The original reference images remain the *only owner-approved finished visuals*; new derivatives are not yet owner-approved production art.

## Read this before opening the new files
The existing `assets/previews/landscape-r02/` folder contains exploratory r02 vectors that diverged from the approved camera. **This `approved-rebuild-r03/` subfolder supersedes those exploratory coordinate/station design assumptions.** The actual three approved master images remain under `assets/references/tokyo/approved/`.

## 01 — Matched camera and testable geometry
* `01_camera_A_1280x720.png`: approved-aligned camera draft; `01_camera_B_1280x720.png`: small width-stress alternative, NOT a new approval.
* `01_approved_{normal,fever,inferno}_geometry_overlay.png`: actual approved screenshots with road trace, seven selectable hit areas and HUD/hand reserve exclusion.
* `01_approved_safe_zones.png`, `01_640x360_readability.png`, `01_wide_19_5x9_center_unchanged.png`, `01_narrow_4x3_letterboxed.png`.
* Editable PCHIP control points, runner placements, numeric examples and hitboxes: `assets/source/approved-rebuild-r03/camera/approved_camera_coordinates.json`; road SVG: `approved_road_geometry.svg`.

**Interpretation:** The road traces and uniform runner-size function were manually matched to the approved images, in screen space; they are a deterministic layout model, **not** a recovered real-world lens or an independently verified 3D calibration. Foreground and background runners use the *same* continuous sizing function. The seven selectable runners are 12, 18, 24, 36, 30, 42 and 48; farther figures remain visible but non-selectable until approaching. Click areas are separate from drawn characters and must undergo mobile touch QA. One medium bib should also be tested with `1000` (the coordinate file records it).

## 02 — Style from approved originals, without inventing new characters
* `02_approved_style_scale_sheet.png`: direct crops of all three original images, colour comparisons and context.
* `approved_palette.json` and `approved_character_ratio.json`: outlines, bib and material samples, fixed chibi silhouette policy and numeric readability constraints.

The attached approved artwork is an **appearance reference**. Independent runner and volunteer finished rigs belong to steps 05–07; the schematic geometry silhouettes are not falsely labelled as completed character art.

## 03 — Same Tokyo road and desk in three modes
* An original, newly drawn **empty Tokyo plate** (no runner, staff, UI, table) has been generated for layout review under `assets/source/approved-rebuild-r03/street/tokyo/shared_empty_environment_plate.webp`; this is **not** a pixel-identical reconstruction of the owner's approved screenshots.
* The plate is losslessly separable into **skyline, left street, road and right river** raster regions, each full-canvas RGBA; their alpha-composite reassembles the original plate exactly, proven in QA JSON. These are *coarse layout segmentation masks*, not finely isolated individual cherry blossoms or hand-retouched rail segments.
* Matching mode-coloured plates `normal/fever/inferno_empty_environment_plate.webp` use the same geometry; `ambient_fever.svg` and `ambient_inferno.svg` are independent decorations.
* Editable street guides `approved_road_geometry.svg`, `editable_rail_guides.svg` and a truly separated **table rear legs, table frame, table top, mode-specific table fascia** under `source/approved-rebuild-r03/station/tokyo`.
* `03_tokyo_{normal,fever,inferno}_station_occlusion_review.png` are compositing-layout images with deliberately schematic staff proxies to demonstrate **rear-to-front occlusion**, not finished character art. Normal/Fever staff are behind the table; Inferno weight falls on the **same tabletop**.

## 04 — Independent physical supplies
* 3 original, editable SVG masters: water bottle, tear-notch gel pouch and curved banana.
* Each has `hand`, `flight` and `slot` derivatives in editable SVG and true-alpha PNG (9 PNG files; no brand, numbers or labels baked into physical objects).
* Empty number-only bubble, empty reserve-slot base (2 more RGBA PNG files) and separate rear grip / front thumb SVGs.
* `04_supplies_alpha_contact_sheet.png` and three `04_*_assembly_review.png` test 6, 12, 13 in bubble, 4/8 in **exactly two slots** and one flying physical object. Gel is not yet in runtime math types.

## Review findings and guardrails
* No new image is claimed as approved merely by being in the approved-rebuild folder.
* Approved masters remain unchanged, including the most recently replaced Inferno.
* No changes to `src/`, game logic, i18n or asset integration.
* On-device readability, real touch performance, alpha-fringing across GPU blending, collision timing, movement and actual rigged staff/runner sprite animations are **NOT TESTED**.
* Existing approved screenshots have highly detailed art; these new deterministic SVGs and geometry proxies are technical layout sources for the artist and engineering handoff. Finish art must match the approved master before runtime use.
'''
write(f'{PRE}/README.md',spec)
write(f'{BASE}/README.md','''# SnackDash approved-reference-driven build sources (steps 01–04)

Source samples (already committed in the repository): `assets/references/tokyo/approved/`.

Run `python make_assets.py` in an environment with Pillow, numpy, scipy and cairosvg, with the approved images and approved empty-plate visual candidate available. Coordinate JSON and SVG source masters are editable; all generated PNGs are derived and reproducible from those masters. The build script and source plate are in this folder for independent review, and large final preview PNGs were optimized to WebP for GitHub. See `assets/previews/landscape-r02/approved-rebuild-r03/README.md` for precise scope and limitations.
''')

manifest={
 'schemaVersion':3,'id':'tokyo-step01-04-approved-rebuild-r03','sourceBranch':'feature/main2-landscape-assets-r02',
 'referenceApprovedFiles':['assets/references/tokyo/approved/tokyo_normal_approved_r02.webp','assets/references/tokyo/approved/tokyo_fever_approved_r02.webp','assets/references/tokyo/approved/tokyo_inferno_approved_r02.webp'],
 'approvedReferenceOnly':True,'status':'review','authoringCanvas':[1280,720], 'filesWritten':len(FILES),
 'fileList':FILES,'integratedInRuntime':False,'approvedDerivatives':False,
 'note':'source artwork and layout candidates for review; do not confuse with approved screenshots'
}
write(f'{PRE}/manifest.json',manifest)


print('asset generation complete',len(FILES))
