"""Chapter 5: the regulars Bex, Foreman Dill and Moss; the MegaBun cast Chad, Buns-A-Lot and Mrs. Crustworth; the Auto-Oven."""
import os
from PIL import Image, ImageDraw
from portraits import Canvas, rgba, shaded_head, face, EXPRESSIONS

def bex(expression):             # robotics engineer: goggles on the forehead, overalls
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#3a6a9a')            # blue overalls
    c.rect((11, 29, 20, 42), '#2f5a86'); c.px([(12, 31), (19, 31)], '#f2c94c')   # bib and buttons
    c.rect((13, 22, 18, 25), '#fff6e6')
    c.rect((13, 19, 18, 24), '#c68a5e')
    shaded_head(c, '#d9a074', '#c68a5e')
    c.ellipse((7, 3, 24, 10), '#2a1a12')             # short dark hair
    c.rect((8, 7, 23, 9), '#7a8896'); c.rect((10, 6, 14, 9), '#d4eef2'); c.rect((17, 6, 21, 9), '#d4eef2')   # goggles up
    face(c, expression, None)
    c.px([(21, 16), (22, 17)], '#3a3a44')            # a smear of grease
    c.outline(); return c.img

def dill(expression):            # factory foreman: hard hat, moustache, hi-vis
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#f2c94c')            # yellow jacket
    c.rect((6, 28, 25, 29), '#fff6e6'); c.rect((6, 33, 25, 34), '#fff6e6')       # reflective bands
    c.rect((13, 19, 18, 24), '#a8704a')
    shaded_head(c, '#c68a5e', '#a8704a')
    c.ellipse((6, 2, 25, 10), '#f2f2f2'); c.rect((5, 8, 26, 10), '#d8d8d8')      # white hard hat
    c.rect((14, 3, 17, 5), '#c0392b')
    face(c, expression, None)
    c.rect((11, 16, 20, 17), '#3a2a22'); c.px([(10, 17), (21, 17)], '#3a2a22')   # big moustache
    c.outline(); return c.img

def moss(expression):            # local reporter: scarf, notebook, press badge
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#7a8a6a')            # olive coat
    c.rect((8, 23, 23, 27), '#c0392b')               # red scarf
    c.rect((19, 28, 24, 35), '#fff6e6'); c.px([(20, 30), (22, 30), (21, 32)], '#3a3a44')   # notebook
    c.rect((13, 19, 18, 24), '#d9a878')
    shaded_head(c, '#f0c8a0', '#d9a878')
    c.ellipse((6, 3, 25, 12), '#7a5a3a')             # messy hair
    c.px([(5, 11), (26, 11), (6, 14), (25, 14)], '#7a5a3a')
    face(c, expression, None)
    c.rect((9, 11, 14, 14), '#3a3a44'); c.rect((17, 11, 22, 14), '#3a3a44')      # round glasses
    c.rect((10, 12, 13, 13), '#d4eef2'); c.rect((18, 12, 21, 13), '#d4eef2')
    c.outline(); return c.img

def chad(expression):            # CEO Chad Crustworth: suit, gleaming smile, a tie the colour of a bun
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#2a2a34')            # black suit
    c.d.polygon([(11, 23), (20, 23), (16, 33)], fill=rgba('#ffffff'))
    c.px([(15, 25), (16, 25), (15, 27), (16, 27), (15, 29), (16, 29)], '#e8873a')   # orange tie
    c.rect((13, 19, 18, 24), '#d9a878')
    shaded_head(c, '#f0c8a0', '#d9a878')
    c.ellipse((7, 2, 24, 9), '#3a3a44'); c.rect((7, 6, 24, 8), '#3a3a44')        # slicked hair
    c.px([(9, 3), (12, 2), (15, 2)], '#7a7a88')
    face(c, expression, None)
    c.rect((13, 17, 18, 18), '#ffffff')              # the too-white smile
    c.outline(); return c.img

def bunsalot(expression):        # Buns-A-Lot: an intern in a bun costume
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#e8873a')            # orange jumpsuit
    c.ellipse((4, 3, 27, 22), '#d9a05c')             # the bun head
    c.ellipse((5, 3, 26, 11), '#f0c48a')
    c.px([(9, 6), (13, 5), (18, 6), (22, 7), (11, 9), (20, 9)], '#fffaf0')       # sesame seeds
    c.ellipse((9, 11, 22, 20), '#f0c8a0')            # the intern's face through the hole
    face(c, expression, None)
    c.px([(23, 22), (24, 23)], '#a8703a')
    c.outline(); return c.img

def mrs(expression):             # Chad's mother: pearls, a lilac cardigan, firm opinions
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#b8a0d8')            # lilac cardigan
    c.rect((13, 19, 18, 24), '#d9a878')
    c.px([(11, 24), (13, 26), (15, 27), (17, 26), (19, 24)], '#ffffff')          # pearls
    shaded_head(c, '#f0c8a0', '#d9a878')
    c.ellipse((6, 2, 25, 11), '#e8e8f0')             # silver hair, set
    c.ellipse((4, 6, 9, 14), '#e8e8f0'); c.ellipse((22, 6, 27, 14), '#e8e8f0')
    face(c, expression, None)
    c.rect((9, 11, 14, 13), '#8a5ab0'); c.rect((17, 11, 22, 13), '#8a5ab0')      # purple glasses
    c.rect((10, 12, 13, 12), '#d4eef2'); c.rect((18, 12, 21, 12), '#d4eef2')
    c.outline(); return c.img

def auto_oven(expression):       # the Auto-Oven: a steel box with a friendly screen face
    c = Canvas()
    c.rect((4, 8, 27, 36), '#b8c4d0'); c.rect((4, 8, 27, 10), '#dce6ee'); c.rect((4, 34, 27, 36), '#7a8896')
    c.rect((7, 12, 24, 26), '#2a2a34')               # the screen
    c.rect((8, 13, 23, 25), '#1f3358')
    glow = '#9ed9c3'
    if expression == 'neutral':
        c.px([(12, 17), (12, 18), (19, 17), (19, 18)], glow); c.px([(14, 22), (15, 22), (16, 22), (17, 22)], glow)
    elif expression == 'happy':
        c.px([(11, 18), (12, 17), (13, 18), (18, 18), (19, 17), (20, 18)], glow)
        c.px([(13, 21), (14, 22), (15, 22), (16, 22), (17, 22), (18, 21)], glow)
    else:
        c.px([(12, 17), (12, 18), (19, 17), (19, 18)], '#e05a5a'); c.px([(13, 22), (14, 21), (15, 21), (16, 21), (17, 21), (18, 22)], '#e05a5a')
    c.px([(6, 29), (9, 29), (12, 29)], '#c0392b'); c.rect((20, 28, 25, 30), '#7a8896')
    c.rect((12, 5, 19, 7), '#7a8896'); c.px([(15, 3), (16, 4), (15, 4)], '#e8e8f0')   # a puff of steam
    c.outline(); return c.img

CHARACTERS = {'bex': bex, 'dill': dill, 'moss': moss, 'chad': chad, 'bunsalot': bunsalot, 'mrs-crustworth': mrs, 'auto-oven': auto_oven}

def sheet(path, scale=5):
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
    sheet(os.path.join(here, 'portraits_ch5.png'))
    print('ok')
