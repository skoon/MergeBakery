"""Chapter 4: the regulars Ms. Harlow, Big Lou and Dr. Okafor, and the staff Sam, Trevor and Rosa."""
import os
from PIL import Image, ImageDraw
from portraits import Canvas, rgba, shaded_head, face, EXPRESSIONS

def harlow(expression):          # the grocery chain's buyer: blazer, glasses, tidy bun
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#3a3f58')            # navy blazer
    c.rect((13, 23, 18, 26), '#ffffff')              # blouse
    c.px([(15, 27), (16, 27), (15, 28), (16, 28)], '#e0457b')   # brooch
    c.rect((13, 19, 18, 24), '#d9a878')
    c.ellipse((10, 1, 21, 7), '#5a3a28')             # hair bun
    shaded_head(c, '#f0c8a0', '#d9a878')
    c.ellipse((7, 3, 24, 11), '#5a3a28')             # neat hair
    face(c, expression, None)
    c.rect((9, 11, 14, 14), '#3a3f58'); c.rect((17, 11, 22, 14), '#3a3f58')    # glasses frames
    c.rect((10, 12, 13, 13), '#d4eef2'); c.rect((18, 12, 21, 13), '#d4eef2')
    c.px([(15, 12), (16, 12)], '#3a3f58')
    c.outline(); return c.img

def lou(expression):             # delivery driver: cap and hi-vis vest
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#f2a03a')            # orange hi-vis vest
    c.rect((7, 26, 8, 42), '#fff6e6'); c.rect((23, 26, 24, 42), '#fff6e6')   # reflective strips
    c.rect((13, 23, 18, 25), '#3a3a44')              # work shirt collar
    c.rect((13, 19, 18, 24), '#8a5a3a')
    shaded_head(c, '#a8704a', '#8a5a3a')
    c.ellipse((6, 3, 25, 10), '#c0392b')             # red baseball cap
    c.rect((6, 9, 27, 10), '#8f2a20')                # peak
    c.ellipse((11, 16, 20, 22), '#3a2a22')           # stubble
    c.rect((12, 15, 19, 16), '#a8704a')
    face(c, expression, None)
    c.outline(); return c.img

def okafor(expression):          # food-safety inspector: white coat, hairnet, badge
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#f4f6fa')            # white coat
    c.px([(15, 26), (15, 29), (15, 32), (15, 35)], '#c8ccd2')
    c.rect((19, 27, 23, 31), '#2f9fc9'); c.px([(20, 28), (21, 28), (22, 28)], '#ffffff')   # badge
    c.rect((13, 19, 18, 24), '#6a4228')
    shaded_head(c, '#8a5a3a', '#6a4228')
    c.ellipse((7, 3, 24, 10), '#e8eef4')             # hairnet
    c.px([(9, 6), (12, 5), (15, 4), (18, 5), (21, 6), (10, 8), (16, 8), (21, 8)], '#b8c4d0')
    face(c, expression, None)
    c.outline(); return c.img

def sam(expression):             # stockboy: backwards cap, apron
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#5a8a5a')            # green work apron
    c.rect((10, 29, 21, 42), '#7aaa7a'); c.px([(14, 32), (17, 32)], '#fff6e6')
    c.rect((13, 19, 18, 24), '#d9a878')
    shaded_head(c, '#f0c8a0', '#d9a878')
    c.ellipse((6, 3, 25, 10), '#2f6a9a')             # blue cap
    c.rect((4, 8, 12, 9), '#1f4a70')                 # peak, turned round to the side
    c.px([(8, 10), (9, 11), (22, 10), (21, 11)], '#c8883a')   # tufts of ginger hair
    face(c, expression, None)
    c.px([(10, 15), (21, 15), (11, 16), (20, 16)], '#c8883a')   # freckles
    c.outline(); return c.img

def trevor(expression):          # the ex-MegaBun employee: orange polo, lanyard, tired
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#e8873a')            # MegaBun-orange polo
    c.rect((13, 23, 18, 25), '#c0642a')              # collar
    c.rect((14, 25, 17, 36), '#fff6e6'); c.px([(15, 30), (16, 30)], '#3a3a44')   # name lanyard
    c.rect((13, 19, 18, 24), '#d9a878')
    shaded_head(c, '#f0c8a0', '#d9a878')
    c.ellipse((7, 3, 24, 9), '#7a5a3a')              # untidy hair
    c.px([(8, 10), (23, 10), (6, 8), (25, 8)], '#7a5a3a')
    face(c, expression, None)
    c.px([(11, 14), (12, 14), (19, 14), (20, 14)], '#a8845a')   # bags under the eyes
    c.outline(); return c.img

def rosa(expression):            # the runner: headband, tracksuit
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#d9455a')            # red tracksuit jacket
    c.rect((14, 24, 17, 42), '#ffffff')              # zip stripe
    c.px([(6, 28), (6, 30), (25, 28), (25, 30)], '#ffffff')
    c.rect((13, 19, 18, 24), '#a8704a')
    shaded_head(c, '#c68a5e', '#a8704a')
    c.ellipse((7, 3, 24, 10), '#2a1a12')             # dark ponytail base
    c.ellipse((20, 4, 29, 14), '#2a1a12')            # swinging ponytail
    c.rect((7, 7, 24, 9), '#f2c94c')                 # sweatband
    face(c, expression, None)
    c.outline(); return c.img

CHARACTERS = {'harlow': harlow, 'lou': lou, 'okafor': okafor, 'sam': sam, 'trevor': trevor, 'rosa': rosa}

def sheet(path, scale=6):
    pad = 10
    w = pad + len(EXPRESSIONS) * (32 * scale + pad)
    h = pad + len(CHARACTERS) * (32 * scale + pad + 12)
    out = Image.new('RGBA', (w, h), (32, 36, 44, 255)); d = ImageDraw.Draw(out)
    for r, (name, fn) in enumerate(CHARACTERS.items()):
        for col, e in enumerate(EXPRESSIONS):
            x = pad + col * (32 * scale + pad); y = pad + r * (32 * scale + pad + 12)
            out.paste(Image.new('RGBA', (32 * scale, 32 * scale), (247, 215, 116, 255)), (x, y))
            out.alpha_composite(fn(e).resize((32 * scale, 32 * scale), Image.NEAREST), (x, y))
            d.text((x, y + 32 * scale + 2), f'portrait-{name}-{e}', fill=(220, 220, 220, 255))
    out.save(path)

if __name__ == '__main__':
    here = os.path.dirname(__file__)
    art = os.path.join(here, '..', '..', 'public', 'art')
    for name, fn in CHARACTERS.items():
        for e in EXPRESSIONS:
            fn(e).save(os.path.join(art, f'portrait-{name}-{e}.png'))
    sheet(os.path.join(here, 'portraits_ch4.png'))
    print('ok')
