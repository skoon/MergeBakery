"""Batch 2: Grandma (framed like a photo) and the six walk-ins."""
from PIL import Image, ImageDraw
from portraits import Canvas, INK, rgba, shaded_head, face

def grandma(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#d9707a')           # rose dress
    c.rect((10, 25, 21, 31), '#fffaf0')             # apron
    c.px([(12, 27), (17, 29), (19, 26)], '#f2dcb0')  # flour smudges
    c.rect((13, 19, 18, 24), '#d9b090')
    for x, y in [(8, 7), (22, 7), (7, 11), (23, 11), (8, 15), (22, 15)]:
        c.ellipse((x - 3, y - 3, x + 3, y + 3), '#dcdce6')  # curls round the face
    shaded_head(c, '#f2d0b0', '#d9b090')
    for x, y in [(10, 5), (14, 3), (18, 3), (21, 5)]:
        c.ellipse((x - 3, y - 2, x + 3, y + 3), '#e8e8f0')  # curls on top
    face(c, expression, '#f2d0b0')
    if expression != 'happy':
        c.px([(10, 15), (21, 15)], '#f27ba0')       # always a little rosy
    c.px([(8, 17), (23, 17)], '#fffaf0')            # pearl earrings
    c.outline()
    # Mount it in a wooden frame on a sepia ground, like a photo on the wall.
    photo = Image.new('RGBA', (32, 32), rgba('#f2dcb0'))
    photo.alpha_composite(c.img)
    d = ImageDraw.Draw(photo)
    d.rectangle((0, 0, 31, 31), outline=rgba('#6d3d1d'), width=1)
    d.rectangle((1, 1, 30, 30), outline=rgba('#9c5b2e'), width=1)
    d.rectangle((2, 2, 29, 29), outline=rgba('#c99a55'), width=1)
    return photo

def walkin(build):
    def draw():
        c = Canvas(); build(c); face(c, 'neutral', None); c.outline(); return c.img
    return draw

def hiker(c):
    c.ellipse((3, 23, 28, 42), '#e07a3a')
    c.rect((9, 24, 10, 31), '#5a4a3a'); c.rect((21, 24, 22, 31), '#5a4a3a')  # pack straps
    c.rect((13, 19, 18, 24), '#b97f52')
    shaded_head(c, '#d9a070', '#b97f52')
    c.ellipse((6, 2, 25, 9), '#8a9a5a'); c.rect((4, 8, 27, 9), '#7a8a4a')  # bucket hat

def tourist(c):
    c.ellipse((3, 23, 28, 42), '#3aa8a0')
    c.px([(8, 27), (12, 29), (19, 26), (23, 29), (15, 30)], '#f27ba0')  # shirt flowers
    c.rect((13, 19, 18, 24), '#e0b08a')
    shaded_head(c, '#f7d0b0', '#e0b08a')
    c.ellipse((4, 4, 27, 10), '#e8c07d'); c.ellipse((9, 1, 22, 8), '#e8c07d')  # straw sunhat
    c.rect((9, 7, 22, 7), '#c0392b')                                             # hat band
    c.rect((10, 12, 21, 13), '#3a2414')                                          # sunglasses
    c.px([(11, 12), (18, 12)], '#8fb8dd')

def student(c):
    c.ellipse((3, 23, 28, 42), '#7a5ab0')
    c.rect((12, 23, 19, 24), '#e05a5a'); c.rect((10, 23, 11, 26), '#c0392b'); c.rect((20, 23, 21, 26), '#c0392b')  # red headphones round the neck
    c.rect((13, 19, 18, 24), '#d9a878')
    shaded_head(c, '#f2c8a0', '#d9a878')
    c.ellipse((7, 3, 24, 11), '#e8c07d'); c.rect((8, 8, 10, 13), '#e8c07d')  # blonde, side part

def jogger(c):
    c.ellipse((3, 23, 28, 42), '#7fc8f8')
    c.rect((13, 19, 18, 24), '#8a5a3a')
    c.ellipse((20, 6, 27, 16), '#3a2a1a')           # ponytail
    shaded_head(c, '#a86a44', '#8a5a3a')
    c.ellipse((8, 3, 23, 10), '#3a2a1a')
    c.rect((8, 8, 23, 9), '#e05a5a')                # headband

def neighbor(c):
    c.ellipse((3, 23, 28, 42), '#9c6b3e')           # cardigan
    c.px([(15, 25), (15, 27), (15, 29)], '#f2dcb0')  # buttons
    c.rect((13, 19, 18, 24), '#d9a878')
    shaded_head(c, '#f0c8a0', '#d9a878')
    c.ellipse((7, 8, 11, 15), '#bdbdbd'); c.ellipse((20, 8, 24, 15), '#bdbdbd')  # grey sides, bald top
    c.px([(13, 16), (14, 16), (15, 16), (16, 16), (17, 16), (18, 16)], '#9a9a9a')  # moustache

def painter(c):
    c.ellipse((3, 23, 28, 42), '#fffaf0')           # smock
    c.px([(8, 27), (11, 29), (20, 27), (23, 30), (16, 30)], '#4a7fb0')
    c.px([(9, 30), (22, 26)], '#f2c94c')
    c.rect((13, 19, 18, 24), '#c68a5e')
    shaded_head(c, '#e0a878', '#c68a5e')
    c.ellipse((6, 5, 25, 12), '#6d3d1d')            # hair
    c.ellipse((7, 1, 22, 8), '#c0392b'); c.px([(14, 0), (15, 0)], '#c0392b')  # beret

WALKINS = {'hiker': hiker, 'tourist': tourist, 'student': student,
           'jogger': jogger, 'neighbor': neighbor, 'painter': painter}

def all_images():
    out = [(f'portrait-grandma-{e}', grandma(e)) for e in ('neutral', 'happy', 'impatient')]
    out += [(f'portrait-walkin-{n}', walkin(b)()) for n, b in WALKINS.items()]
    return out

def sheet(path, scale=6, cols=3):
    items = all_images(); pad = 12
    rows = (len(items) + cols - 1) // cols
    out = Image.new('RGBA', (pad + cols * (32 * scale + pad), pad + rows * (32 * scale + pad + 12)), (32, 36, 44, 255))
    d = ImageDraw.Draw(out)
    for i, (key, img) in enumerate(items):
        x = pad + (i % cols) * (32 * scale + pad); y = pad + (i // cols) * (32 * scale + pad + 12)
        out.paste(Image.new('RGBA', (32 * scale, 32 * scale), (247, 215, 116, 255)), (x, y))
        out.alpha_composite(img.resize((32 * scale, 32 * scale), Image.NEAREST), (x, y))
        d.text((x, y + 32 * scale + 2), key, fill=(220, 220, 220, 255))
    out.save(path)

if __name__ == '__main__':
    sheet('portraits_batch2.png'); print('ok')
