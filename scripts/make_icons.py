from PIL import Image, ImageDraw
import math, os
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
os.makedirs(OUT, exist_ok=True)
GREEN=(15,81,50); GOLD=(201,151,0); WHITE=(255,255,255); LIGHT=(191,227,200)

def dumbbell(d, cx, cy, s, color=GOLD):
    # bar
    d.rounded_rectangle([cx-260*s, cy-22*s, cx+260*s, cy+22*s], radius=20*s, fill=color)
    # plates
    for sign in (-1,1):
        for off,w,h in [(150,52,150),(215,42,110)]:
            x=cx+sign*off*s
            d.rounded_rectangle([x-w*s/2, cy-h*s, x+w*s/2, cy+h*s], radius=14*s, fill=color)
    # grips ends
    d.ellipse([cx-285*s, cy-30*s, cx-235*s, cy+30*s], fill=color)
    d.ellipse([cx+235*s, cy-30*s, cx+285*s, cy+30*s], fill=color)

def base(size, bg, scale=1.0):
    img=Image.new("RGBA",(size,size),(0,0,0,0) if bg is None else bg+(255,))
    d=ImageDraw.Draw(img)
    return img,d

# icon.png 1024 full square green with gold dumbbell + check/calendar dots
for name,size,bg,transparent in [("icon.png",1024,GREEN,False),("adaptive-icon.png",1024,None,True),("splash-icon.png",1024,None,True),("favicon.png",64,GREEN,False)]:
    img,d=base(size,bg)
    if bg:
        # subtle calendar grid dots
        for r in range(3):
            for c in range(6):
                x=140+ c*150*(size/1024); y=760+ r*70*(size/1024)
                rr=16*(size/1024)
                col=LIGHT if (r*6+c)%4!=0 else GOLD
                d.ellipse([x-rr,y-rr,x+rr,y+rr], fill=col+(255,) if transparent else col)
    dumbbell(d, size/2, size*0.42, size/1024*0.95)
    # flame-ish accent: simple gold circle check
    img.save(os.path.join(OUT,name))
    print(name, img.size)
