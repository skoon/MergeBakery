"""32x32 bust portraits built from layered shapes, with an automatic ink outline."""
from PIL import Image, ImageDraw

INK = (58, 36, 20, 255)          # #3a2414, same as the item art
MOUTH = (122, 58, 40, 255)
BLUSH = (242, 123, 160, 255)

def rgba(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

class Canvas:
    def __init__(self):
        self.img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
    def ellipse(self, box, color): self.d.ellipse(box, fill=rgba(color))
    def rect(self, box, color): self.d.rectangle(box, fill=rgba(color))
    def px(self, points, color):
        c = color if isinstance(color, tuple) else rgba(color)
        for p in points:
            if 0 <= p[0] < 32 and 0 <= p[1] < 32: self.img.putpixel(p, c)
    def outline(self):
        """Ink on every transparent pixel touching an opaque one (4-neighbour)."""
        src = self.img.copy(); w, h = src.size
        for y in range(h):
            for x in range(w):
                if src.getpixel((x, y))[3] != 0: continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src.getpixel((nx, ny))[3] != 0:
                        self.img.putpixel((x, y), INK); break

HEAD = (8, 5, 23, 22)

def shaded_head(c, skin, shade):
    c.ellipse(HEAD, skin)
    # A crescent of shade down the right side.
    mask = Image.new('1', (32, 32), 0); ImageDraw.Draw(mask).ellipse((6, 4, 21, 22), fill=1)
    for y in range(32):
        for x in range(32):
            if c.img.getpixel((x, y))[:3] == rgba(skin)[:3] and not mask.getpixel((x, y)) and x > 15:
                c.img.putpixel((x, y), rgba(shade))

def face(c, expression, skin):
    if expression == 'neutral':
        c.px([(12, 12), (12, 13), (19, 12), (19, 13)], INK)
        c.px([(14, 18), (15, 18), (16, 18), (17, 18)], MOUTH)
    elif expression == 'happy':
        c.px([(11, 13), (12, 12), (13, 13), (18, 13), (19, 12), (20, 13)], INK)
        c.px([(13, 17), (14, 18), (15, 18), (16, 18), (17, 18), (18, 17)], MOUTH)
        c.px([(10, 15), (11, 15), (20, 15), (21, 15)], BLUSH)
    elif expression == 'impatient':
        c.px([(12, 12), (12, 13), (19, 12), (19, 13)], INK)
        c.px([(10, 9), (11, 10), (12, 10), (19, 10), (20, 10), (21, 9)], INK)
        c.px([(13, 19), (14, 18), (15, 18), (16, 18), (17, 18), (18, 19)], MOUTH)
        c.px([(26, 10), (26, 11), (25, 12), (26, 12)], '#7fc8f8')  # a bead of sweat, beside the head

def gus(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#f2c94c')           # yellow oilskin
    c.rect((12, 23, 19, 26), '#e0b23a')             # collar
    c.rect((13, 19, 18, 24), '#b97f52')             # neck
    shaded_head(c, '#d9a070', '#b97f52')
    c.ellipse((8, 14, 23, 25), '#c9c9c9')           # beard
    c.rect((12, 15, 19, 16), '#d9a070')             # cheeks above the beard
    c.ellipse((7, 1, 24, 10), '#2f4a7a')            # knit beanie, above the eyes
    c.rect((7, 8, 24, 9), '#4a6aa0')                # beanie fold
    face(c, expression, '#d9a070')
    if expression != 'impatient':
        c.px([(14, 18), (15, 18), (16, 18), (17, 18)], '#8a8a8a')  # mouth hides in the beard
        c.px([(15, 19), (16, 19)] if expression == 'happy' else [], MOUTH)
    c.outline(); return c.img

def edith(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#b89ad8')           # lavender cardigan
    c.px([(14, 24), (15, 25), (16, 25), (17, 24)], '#fff4d6')  # blouse collar
    c.rect((13, 19, 18, 24), '#d9b090')
    c.ellipse((6, 5, 25, 18), '#e8e8f0')            # hair, behind the face
    shaded_head(c, '#f2d0b0', '#d9b090')
    c.ellipse((8, 4, 23, 11), '#e8e8f0')            # hair on top
    c.ellipse((11, -1, 20, 6), '#3a2414')           # ink ring, so the bun reads apart from the hair
    c.ellipse((12, 0, 19, 5), '#d8d8e4')            # bun
    c.px([(14, 1), (15, 1), (14, 2)], '#f4f4fa')
    face(c, expression, '#f2d0b0')
    for x0 in (10, 17):                             # round glasses
        c.px([(x0 + i, 11) for i in range(1, 4)] + [(x0 + i, 15) for i in range(1, 4)]
             + [(x0, y) for y in range(12, 15)] + [(x0 + 4, y) for y in range(12, 15)], INK)
    c.px([(15, 13), (16, 13)], INK)                 # bridge
    c.outline(); return c.img

def dex(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#4a4a55')           # jacket
    c.rect((11, 24, 20, 31), '#c0392b')             # MegaBun polo showing
    c.px([(17, 27), (18, 27), (17, 28)], '#f2c94c')  # logo, half hidden
    c.rect((13, 19, 18, 24), '#c99a70')
    shaded_head(c, '#e8b890', '#c99a70')
    c.ellipse((7, 3, 24, 12), '#6d4a2a')            # messy hair
    c.px([(9, 3), (12, 2), (15, 1), (16, 2), (19, 2), (22, 4), (8, 6), (23, 7)], '#6d4a2a')
    c.rect((8, 10, 9, 13), '#6d4a2a'); c.rect((22, 10, 23, 13), '#6d4a2a')
    face(c, expression, '#e8b890')
    c.outline(); return c.img

def mina(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#fff4d6')           # shirt
    c.rect((10, 25, 21, 31), '#5aa85a')             # green apron bib
    c.px([(10, 24), (21, 24)], '#5aa85a')           # apron straps
    c.rect((13, 19, 18, 24), '#a8704a')
    c.ellipse((5, 4, 26, 27), '#2a1a14')            # long hair, behind
    shaded_head(c, '#c68a5e', '#a8704a')
    c.ellipse((7, 3, 24, 11), '#2a1a14')            # fringe
    c.px([(22, 6), (23, 5), (24, 6), (23, 7)], '#f27ba0')  # flower clip
    c.px([(23, 6)], '#f7d774')
    face(c, expression, '#c68a5e')
    c.px([(10, 16), (12, 16), (19, 16), (21, 16)], '#8a5a3a')  # freckles
    c.outline(); return c.img

CHARACTERS = {'gus': gus, 'edith': edith, 'dex': dex, 'mina': mina}
EXPRESSIONS = ['neutral', 'happy', 'impatient']

def sheet(path, scale=6):
    pad = 12
    w = pad + len(EXPRESSIONS) * (32 * scale + pad)
    h = pad + len(CHARACTERS) * (32 * scale + pad + 12)
    out = Image.new('RGBA', (w, h), (32, 36, 44, 255))
    d = ImageDraw.Draw(out)
    for r, (name, fn) in enumerate(CHARACTERS.items()):
        for col, e in enumerate(EXPRESSIONS):
            x = pad + col * (32 * scale + pad); y = pad + r * (32 * scale + pad + 12)
            out.paste(Image.new('RGBA', (32 * scale, 32 * scale), (247, 215, 116, 255)), (x, y))  # the dialogue's butter frame
            out.alpha_composite(fn(e).resize((32 * scale, 32 * scale), Image.NEAREST), (x, y))
            d.text((x, y + 32 * scale + 2), f'portrait-{name}-{e}', fill=(220, 220, 220, 255))
    out.save(path)

if __name__ == '__main__':
    sheet('portraits_batch1.png'); print('ok')
