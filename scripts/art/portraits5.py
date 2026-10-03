"""Chapter 3's regulars: Captain Marisol, Mr. Pell, Juno."""
import os
from PIL import Image, ImageDraw
from portraits import Canvas, rgba, shaded_head, face, EXPRESSIONS

def marisol(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#1f3358')            # navy captain's coat
    c.px([(14, 26), (17, 26), (14, 29), (17, 29)], '#f2c94c')   # brass buttons
    c.rect((13, 23, 18, 24), '#fffaf0')              # shirt collar
    c.rect((13, 19, 18, 24), '#a8704a')
    shaded_head(c, '#c68a5e', '#a8704a')
    c.ellipse((6, 3, 25, 10), '#fffaf0')             # white captain's cap
    c.rect((5, 8, 26, 10), '#1f3358')                # cap band
    c.px([(15, 8), (16, 8), (15, 9), (16, 9)], '#f2c94c')  # anchor badge
    c.px([(6, 11), (7, 12), (24, 11), (23, 12)], '#3a3a44')  # dark curls at the temples
    face(c, expression, None)
    c.outline(); return c.img

def pell(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#e8e0cc')            # fishmonger's apron over a striped shirt
    c.px([(5, 27), (8, 27), (11, 27), (20, 27), (23, 27), (26, 27)], '#2f9fc9')
    c.rect((10, 29, 21, 42), '#fffaf0')              # apron bib
    c.px([(15, 31), (16, 32), (17, 31), (14, 32)], '#7fc8f8')   # a scale
    c.rect((13, 19, 18, 24), '#d9a878')
    shaded_head(c, '#f0c8a0', '#d9a878')
    c.ellipse((7, 3, 24, 9), '#9a9a9a')              # grey hair
    c.px([(7, 9), (8, 10), (23, 9), (22, 10)], '#9a9a9a')
    c.ellipse((10, 16, 21, 22), '#9a9a9a')           # big grey beard
    c.rect((12, 15, 19, 16), '#f0c8a0')
    face(c, expression, None)
    c.outline(); return c.img

def juno(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#7b4fc4')            # purple festival jacket
    c.px([(8, 27), (9, 28), (22, 27), (23, 28)], '#f2c94c')    # gold trim
    c.rect((12, 28, 19, 36), '#e0457b')              # clipboard
    c.px([(14, 30), (15, 30), (16, 30), (14, 32), (15, 32)], '#fffaf0')
    c.rect((13, 19, 18, 24), '#8a5a3a')
    shaded_head(c, '#a8704a', '#8a5a3a')
    c.ellipse((5, 3, 26, 14), '#2a1a12')             # big curly hair
    c.ellipse((8, 7, 23, 22), '#a8704a')             # face shows through
    c.px([(6, 14), (5, 16), (26, 14), (27, 16), (6, 8), (25, 8)], '#2a1a12')
    c.rect((9, 4, 22, 6), '#f2c94c')                 # a yellow headband
    face(c, expression, None)
    c.px([(8, 17), (23, 17)], '#e0457b')             # bright earrings
    c.outline(); return c.img

CHARACTERS = {'marisol': marisol, 'pell': pell, 'juno': juno}

def sheet(path, scale=8):
    pad = 12
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
    sheet(os.path.join(here, 'portraits_ch3.png'))
    print('ok')
