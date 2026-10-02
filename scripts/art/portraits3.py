"""Chapter 2's regulars: Priya, Mr. Bramble, Theo."""
from PIL import Image, ImageDraw
from portraits import Canvas, rgba, shaded_head, face, EXPRESSIONS

def priya(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#e8735a')            # coral top
    c.rect((19, 24, 20, 31), '#3a3a44')              # camera strap
    c.rect((13, 19, 18, 24), '#a8704a')
    c.ellipse((6, 4, 25, 21), '#4a2a1a')             # shoulder-length hair, behind
    shaded_head(c, '#c68a5e', '#a8704a')
    c.ellipse((7, 3, 24, 10), '#4a2a1a')             # bangs
    c.rect((9, 3, 22, 5), '#3a3a44'); c.px([(10, 4), (11, 4), (19, 4), (20, 4)], '#8fb8dd')  # sunglasses up on her head
    face(c, expression, None)
    c.px([(8, 17), (23, 17)], '#f2c94c')             # gold hoops
    c.outline(); return c.img

def bramble(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#2f4a7a')            # postal uniform
    c.px([(9, 26), (10, 27), (21, 26), (22, 27)], '#c0392b')  # red piping
    c.d.line([(6, 24), (24, 31)], fill=rgba('#8a5a3a'), width=2)  # mailbag strap
    c.rect((13, 19, 18, 24), '#d9a878')
    shaded_head(c, '#f0c8a0', '#d9a878')
    c.ellipse((7, 3, 24, 10), '#2f4a7a')             # peaked cap
    c.rect((6, 9, 25, 10), '#1f3358')                # the peak
    c.px([(15, 5), (16, 5), (15, 6), (16, 6)], '#f2c94c')  # cap badge
    face(c, expression, None)
    c.px([(13, 16), (14, 16), (15, 16), (16, 16), (17, 16), (18, 16), (12, 17), (19, 17)], '#9a9a9a')  # moustache
    c.outline(); return c.img

def theo(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#8a5a3a')            # tweed jacket
    c.px([(7, 27), (10, 29), (22, 27), (24, 30), (12, 31)], '#6d4a2a')
    c.rect((13, 23, 18, 25), '#fffaf0')              # shirt collar
    c.px([(14, 25), (15, 26), (16, 26), (17, 25), (15, 25), (16, 25)], '#c0392b')  # red bow tie
    c.rect((13, 19, 18, 24), '#6a4228')
    shaded_head(c, '#8a5a3a', '#6a4228')
    # Close-cropped white hair: recolour the top of the head itself.
    for y in range(4, 9):
        for x in range(32):
            if c.img.getpixel((x, y))[3] and c.img.getpixel((x, y))[:3] in (rgba('#8a5a3a')[:3], rgba('#6a4228')[:3]):
                c.img.putpixel((x, y), rgba('#e8e8f0'))
    c.ellipse((10, 16, 21, 23), '#e8e8f0')           # trimmed white beard
    c.rect((12, 15, 19, 16), '#8a5a3a')
    face(c, expression, None)
    c.outline(); return c.img

CHARACTERS = {'priya': priya, 'bramble': bramble, 'theo': theo}

def sheet(path, scale=6):
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
    sheet('portraits_ch2.png'); print('ok')
