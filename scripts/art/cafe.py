"""Café Terrace renovation art (Chapter 2): the 96 x 128 backdrop and 20 objects,
each drawn once with a `fixed` flag like shop.py. Slugs match chapter2.json."""
import json
from PIL import Image, ImageDraw
from portraits import Canvas, rgba
from shop import (WOOD, WOOD_L, WOOD_D, CREAM, BUTTER, RED, GREY, GREY_D, GLASS, BRASS,
                   line, dusty)

LEAF, LEAF_D, STONE, STONE_D = '#5aa85a', '#3f7f45', '#c9c2b4', '#8f8a7e'
TEAL, PINK, BLUE = '#3aa8a0', '#f27ba0', '#4a7fb0'

# ─── Backdrop ──────────────────────────────────────────────────────────────

def cafe_terrace():
    img = Image.new('RGBA', (96, 128), rgba('#cfe9f2'))             # open sky
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 95, 12), fill=rgba('#bfe0ec'))
    for x, y in [(12, 5), (62, 8)]:                                 # clouds
        d.ellipse((x, y, x + 14, y + 5), fill=rgba('#ffffff'))
    d.rectangle((0, 14, 95, 30), fill=rgba('#c98d55'))               # back wall, warm brick
    for y in range(14, 31, 4):
        d.line([(0, y), (95, y)], fill=rgba('#b07a45'))
        for x in range((y // 4 % 2) * 6, 96, 12):
            d.line([(x, y), (x, y + 3)], fill=rgba('#b07a45'))
    d.rectangle((0, 31, 95, 33), fill=rgba('#6d3d1d'))               # wall cap
    for x in range(0, 96, 6):                                       # ivy
        d.ellipse((x, 26 + (x // 6) % 3, x + 5, 32), fill=rgba(LEAF))
    d.rectangle((0, 34, 95, 127), fill=rgba('#e8dfcb'))              # flagstones
    for y in range(34, 128, 10):
        d.line([(0, y), (95, y)], fill=rgba('#c9c2b4'))
        for x in range(((y - 34) // 10 % 2) * 8, 96, 16):
            d.line([(x, y), (x, y + 9)], fill=rgba('#c9c2b4'))
    d.rectangle((0, 120, 95, 127), fill=rgba('#5aa85a'))             # lawn edge
    for x in range(1, 96, 4):
        d.point((x, 121 + x % 3), fill=rgba(LEAF_D))
    for x in range(2, 96, 14):                                      # fairy-light string
        d.line([(x, 36), (x + 7, 39)], fill=rgba('#8f8a7e'))
        d.point((x + 7, 39), fill=rgba('#f7d774'))
    return img

def preview(path, fixed, scale=4):
    chapter = json.load(open('/mnt/d/source/MergeBakery/src/data/chapter2.json'))
    w, h = 96 * scale, 128 * scale
    base = Image.new('RGBA', (w, h), rgba('#fff6e6'))
    faded = cafe_terrace().resize((w, h), Image.NEAREST)
    faded.putalpha(int(255 * 0.35))                 # the view draws the scene at 35%
    base.alpha_composite(faded)
    size = round(w * 0.22)
    for task in chapter['tasks']:
        slug = task['id'].removeprefix('cafe-')
        sprite = render(slug, fixed).resize((size, size), Image.NEAREST)
        x = round(task['spot']['x'] * w - size / 2); y = round(task['spot']['y'] * h - size / 2)
        base.alpha_composite(sprite, (max(0, x), max(0, y)))
    base.save(path)

# ─── The 20 objects ────────────────────────────────────────────────────────

def sweep_terrace(c, fixed):
    if fixed:   # a tidy pile of leaves in a dustpan and a broom
        line(c, [(24, 3), (15, 23)], WOOD, 2)
        c.d.polygon([(11, 22), (19, 22), (22, 29), (8, 29)], fill=rgba(BUTTER))
        line(c, [(10, 26), (20, 26)], '#d9b04c')
        c.ellipse((2, 24, 8, 29), LEAF)
    else:       # leaves and a crisp bag scattered
        for x, y, col in [(5, 8, '#c98a3a'), (14, 14, '#a8643a'), (22, 7, '#c98a3a'),
                           (9, 22, '#a8643a'), (20, 21, '#c98a3a'), (25, 27, '#8a5a30')]:
            c.ellipse((x, y, x + 4, y + 3), col)
        c.rect((12, 24, 17, 28), '#b0905a')

def fix_gate(c, fixed):
    c.rect((3, 3, 5, 29), WOOD_D); c.rect((26, 3, 28, 29), WOOD_D)  # posts
    if fixed:
        c.rect((6, 7, 25, 25), WOOD_L)
        for x in range(8, 25, 4):
            c.rect((x, 7, x + 1, 25), WOOD)
        c.rect((6, 12, 25, 13), WOOD); c.rect((6, 20, 25, 21), WOOD)
        c.rect((22, 15, 24, 17), BRASS)
    else:       # hanging off one hinge, a plank missing
        c.d.polygon([(6, 7), (22, 12), (22, 29), (6, 24)], fill=rgba('#8a7a60'))
        for x in (10, 14, 18):
            line(c, [(x, 9 + (x - 6) // 3), (x, 25 + (x - 6) // 3)], '#6a5a40')
        c.d.rectangle((12, 14, 15, 28), fill=(0, 0, 0, 0))   # the missing plank

def wipe_tables(c, fixed):
    c.ellipse((3, 10, 28, 19), '#fffaf0' if fixed else '#9a8a70')
    c.rect((4, 15, 27, 19), '#fffaf0' if fixed else '#9a8a70')
    c.rect((15, 20, 16, 27), WOOD_D); c.rect((10, 27, 21, 28), WOOD_D)
    if fixed:   # a clean cloth and a sparkle
        c.rect((10, 11, 21, 12), '#ffffff')
        c.px([(24, 6), (23, 7), (24, 7), (25, 7), (24, 8)], '#ffffff')
        c.ellipse((6, 6, 12, 10), '#e05a5a')
    else:
        c.ellipse((8, 11, 14, 15), '#6a5a3a'); c.ellipse((19, 13, 24, 16), '#6a5a3a')

def string_lights(c, fixed):
    line(c, [(2, 6), (10, 12), (16, 14), (22, 12), (29, 6)], GREY_D)
    for x, y, col in [(6, 10, '#f7d774'), (11, 13, PINK), (16, 15, '#f7d774'),
                      (21, 13, '#9ed9c3'), (26, 9, PINK)]:
        if fixed:
            c.ellipse((x - 1, y, x + 2, y + 3), col)
            c.px([(x - 3, y + 1), (x + 4, y + 1)], '#fff6e6')
        else:
            c.ellipse((x - 1, y, x + 2, y + 3), '#5a5a5a')
    if fixed:
        c.px([(16, 18), (16, 19), (16, 20)], BRASS)
    else:       # a tangled heap
        for r in (3, 5, 7):
            c.d.arc((16 - r, 24 - r, 16 + r, 24 + r), 0, 300, fill=rgba(GREY_D))

def paint_railings(c, fixed):
    col, cap = (TEAL, '#2f8a84') if fixed else ('#8a9a8a', '#6a7a6a')
    c.rect((2, 8, 29, 10), cap); c.rect((2, 22, 29, 24), cap)
    for x in range(4, 29, 5):
        c.rect((x, 10, x + 1, 22), col)
        c.rect((x - 1, 4, x + 2, 8), col)
    if not fixed:
        c.rect((10, 12, 11, 16), '#b0603a'); c.rect((20, 15, 21, 19), '#b0603a')  # rust
    else:
        c.px([(5, 12), (10, 13), (15, 12), (20, 13)], '#ffffff')

def plant_herbs(c, fixed):
    c.rect((2, 20, 29, 28), WOOD); c.rect((2, 20, 29, 21), WOOD_L)
    c.rect((4, 18, 27, 19), '#6d4a2a')
    if fixed:
        for x, col in [(7, LEAF), (14, LEAF_D), (22, LEAF)]:
            for dx, dy in [(-2, 6), (0, 9), (2, 5), (-1, 3), (1, 1)]:
                c.ellipse((x + dx - 1, 18 - dy - 1, x + dx + 2, 18 - dy + 1), col)
    else:
        c.px([(8, 17), (15, 16), (23, 17)], '#7a5a3a')
        c.px([(12, 14), (13, 13), (19, 15)], '#6a5a3a')

def umbrellas(c, fixed):
    line(c, [(16, 10), (16, 29)], WOOD_D, 2)
    if fixed:   # a striped parasol, open
        for i, col in enumerate([RED, CREAM, RED, CREAM, RED]):
            x0 = 2 + i * 5
            c.d.polygon([(16, 3), (x0, 14), (x0 + 5, 14)], fill=rgba(col))
        c.ellipse((13, 1, 18, 5), BRASS)
    else:       # furled, tied, leaning
        c.d.polygon([(16, 3), (12, 24), (20, 24)], fill=rgba('#9a8a70'))
        line(c, [(13, 14), (19, 14)], '#6a5a40', 2)
        line(c, [(13, 20), (19, 20)], '#6a5a40', 2)

def menu_board(c, fixed):
    c.rect((5, 3, 26, 26), WOOD); c.rect((7, 5, 24, 24), '#2f3a36' if fixed else '#4a524e')
    c.rect((7, 3, 24, 3), WOOD_L)
    line(c, [(9, 27), (6, 30)], WOOD_D); line(c, [(22, 27), (25, 30)], WOOD_D)
    if fixed:
        line(c, [(10, 8), (21, 8)], '#fffaf0'); line(c, [(10, 12), (19, 12)], '#f7d774')
        line(c, [(10, 15), (21, 15)], '#fffaf0'); line(c, [(10, 18), (17, 18)], '#f27ba0')
        c.px([(20, 20), (21, 20), (20, 21)], '#fffaf0')
    else:
        line(c, [(10, 9), (14, 12)], '#7a827e'); c.px([(18, 17), (19, 18)], '#7a827e')

def fix_fountain(c, fixed):
    c.rect((3, 22, 28, 28), STONE); c.rect((3, 22, 28, 23), STONE_D)
    c.rect((13, 12, 18, 22), STONE)
    c.ellipse((8, 9, 23, 14), STONE); c.ellipse((10, 10, 21, 13), '#7fc8f8' if fixed else '#6a6a60')
    if fixed:
        line(c, [(16, 3), (16, 10)], '#7fc8f8'); c.px([(14, 5), (18, 5), (13, 8), (19, 8)], '#d4eef2')
        c.rect((5, 24, 26, 25), '#7fc8f8')
    else:
        line(c, [(10, 22), (12, 27)], '#5a5a50'); c.px([(20, 11), (22, 12)], '#5a7a4a')  # crack, moss

def tune_piano(c, fixed):
    c.rect((3, 6, 28, 26), '#3a2a22' if fixed else '#6a5a4a')
    c.rect((5, 8, 26, 12), '#4a3a30' if fixed else '#7a6a5a')
    c.rect((3, 15, 28, 21), '#fffaf0' if fixed else '#cfc7ae')
    for x in range(6, 28, 3):
        c.rect((x, 15, x, 21), '#bfb8a0')
    for x in (6, 9, 15, 18, 21):
        c.rect((x, 15, x + 1, 18), '#2a1a12')
    c.rect((4, 27, 6, 30), '#3a2a22'); c.rect((25, 27, 27, 30), '#3a2a22')
    if fixed:
        c.px([(10, 4), (11, 3), (12, 4), (12, 2)], '#f7d774')   # a note
    else:
        c.d.polygon([(2, 3), (29, 3), (29, 6), (2, 6)], fill=rgba('#5a4a3a'))  # bedsheet slipped
        c.rect((2, 3, 29, 14), '#d8d2c4')

def striped_awning(c, fixed):
    c.rect((2, 3, 29, 5), WOOD_D)
    for i in range(7):
        x0 = 2 + i * 4
        color = (TEAL if i % 2 == 0 else CREAM) if fixed else ('#7a8a82' if i % 2 == 0 else '#b0a890')
        droop = 0 if fixed else (i * 2 if i < 4 else (6 - i) * 2)
        c.rect((x0, 6, x0 + 3, 16 + droop), color)
        if fixed:
            c.ellipse((x0, 14, x0 + 3, 19), color)
    if not fixed:
        line(c, [(12, 12), (14, 22), (16, 12)], '#6a4a3a')

def third_oven(c, fixed):
    body, trim = ('#f2c9a0', '#d49a68') if fixed else ('#8a8a8a', '#6a6a6a')
    c.rect((3, 8, 28, 26), body); c.rect((3, 24, 28, 26), trim)
    c.rect((6, 11, 19, 21), '#f2a040' if fixed else '#3a3a3a')
    if fixed:
        c.rect((7, 12, 18, 13), BUTTER)
        c.px([(10, 4), (11, 5), (14, 3), (15, 4)], '#e8e8f0')   # steam
    for y in (12, 16, 20):
        c.px([(23, y), (24, y)], trim if fixed else GREY_D)
    c.rect((5, 27, 7, 29), trim); c.rect((24, 27, 26, 29), trim)
    if not fixed:
        line(c, [(3, 8), (9, 4)], '#e8e8f0'); line(c, [(9, 4), (12, 8)], '#e8e8f0')

def cake_stand(c, fixed):
    c.rect((15, 17, 16, 27), GREY); c.rect((9, 27, 22, 28), GREY)
    c.ellipse((4, 15, 27, 20), '#fffaf0' if fixed else '#b8b4a4')
    if fixed:   # a frosted cake under a dome
        c.rect((9, 9, 22, 16), '#f5a3c0'); c.rect((9, 12, 22, 12), '#fffaf0')
        c.ellipse((13, 5, 18, 9), RED)
        c.d.arc((7, 2, 24, 16), 180, 360, fill=rgba('#ffffff'))
    else:       # a cracked plate under a cobweb
        line(c, [(10, 16), (14, 19)], '#6a645c')
        line(c, [(4, 6), (14, 15)], '#e8e8f0'); line(c, [(4, 6), (22, 12)], '#e8e8f0')

def chalk_sign(c, fixed):
    line(c, [(9, 6), (4, 29)], WOOD_D, 2); line(c, [(22, 6), (27, 29)], WOOD_D, 2)
    c.rect((7, 6, 24, 24), '#fffaf0' if fixed else '#b8b4a4'); c.rect((7, 6, 24, 7), WOOD_L)
    if fixed:
        c.rect((9, 10, 22, 14), RED)
        c.ellipse((12, 16, 19, 22), '#c17d3f'); c.ellipse((12, 16, 19, 19), '#e0a458')
    else:
        c.rect((10, 12, 14, 16), '#8a7a5a'); c.rect((16, 18, 21, 21), '#8a7a5a')

def flower_pots(c, fixed):
    for x0, col in [(1, '#c0603a'), (11, '#d9783a'), (21, '#c0603a')]:
        c.d.polygon([(x0, 18), (x0 + 8, 18), (x0 + 6, 28), (x0 + 2, 28)], fill=rgba(col))
        c.rect((x0 - 1, 17, x0 + 9, 19), '#e08a4a')
        if fixed:
            for dx, fc in [(1, PINK), (4, BUTTER), (7, '#fffaf0')]:
                line(c, [(x0 + dx, 17), (x0 + dx, 11)], LEAF)
                c.ellipse((x0 + dx - 2, 7, x0 + dx + 2, 11), fc)
        else:
            c.px([(x0 + 2, 16), (x0 + 5, 15)], '#6a5a3a')
    if not fixed:
        line(c, [(26, 17), (28, 12)], '#7a5a3a')

def lanterns(c, fixed):
    line(c, [(2, 3), (29, 3)], GREY_D)
    for x, col in [(5, RED), (14, BUTTER), (23, PINK)]:
        line(c, [(x + 2, 3), (x + 2, 8)], GREY_D)
        if fixed:
            c.ellipse((x - 1, 8, x + 5, 20), col)
            c.ellipse((x + 1, 11, x + 3, 17), '#fff6e6')
            line(c, [(x + 2, 20), (x + 2, 24)], BRASS)
        else:
            c.ellipse((x - 1, 8, x + 5, 20), '#7a6a5a')
    if not fixed:
        c.px([(8, 14), (17, 12), (25, 15)], '#4a3a2a')

def mural(c, fixed):
    c.rect((2, 3, 29, 28), WOOD); c.rect((4, 5, 27, 26), '#e8d8b4' if fixed else '#b8a888')
    if fixed:   # sun, hills, a teapot
        c.ellipse((18, 7, 25, 14), '#f7d774')
        c.ellipse((4, 18, 17, 26), LEAF); c.ellipse((13, 19, 27, 27), LEAF_D)
        c.rect((8, 12, 13, 16), '#fffaf0'); c.rect((13, 13, 15, 14), '#fffaf0')
        c.px([(10, 10), (11, 9)], '#fffaf0')
    else:       # pencil outline only
        line(c, [(6, 22), (12, 16), (20, 20), (26, 14)], '#8a7a5a')
        c.d.arc((16, 7, 24, 14), 0, 360, fill=rgba('#8a7a5a'))

def bunting(c, fixed):
    line(c, [(1, 5), (16, 12), (30, 5)], GREY_D)
    cols = [RED, BUTTER, BLUE, PINK, TEAL] if fixed else ['#8a7a6a'] * 5
    for i, col in enumerate(cols):
        x = 4 + i * 5
        y = 6 + (4 - abs(i - 2) * 1) if i != 2 else 11
        y = 6 + [0, 3, 6, 3, 0][i] + 1
        c.d.polygon([(x, y), (x + 4, y), (x + 2, y + 6)], fill=rgba(col))
    if fixed:
        c.px([(2, 4), (29, 4)], BRASS)
    else:
        for r in (3, 5):
            c.d.arc((16 - r, 24 - r, 16 + r, 24 + r), 0, 300, fill=rgba(GREY_D))

def second_recipe_page(c, fixed):
    c.rect((4, 3, 27, 28), WOOD); c.rect((6, 5, 25, 26), '#f2dcb0' if fixed else '#5a4a3a')
    if fixed:
        for y in (9, 12, 15):
            line(c, [(9, y), (22, y)], '#a8845a')
        c.rect((10, 18, 21, 23), '#f5a3c0'); c.rect((10, 18, 21, 19), '#fffaf0')   # a cake drawing
        c.px([(15, 16), (16, 16), (15, 15)], RED)
    else:
        c.px([(8, 7), (8, 8), (9, 7)], '#8a7a6a')

def grand_opening(c, fixed):
    c.rect((3, 6, 5, 28), WOOD_D); c.rect((26, 6, 28, 28), WOOD_D)      # two posts
    c.ellipse((2, 3, 6, 7), BRASS); c.ellipse((25, 3, 29, 7), BRASS)
    if fixed:   # a red ribbon, and gold scissors
        c.rect((6, 11, 25, 15), RED); c.rect((6, 12, 25, 12), '#e05a5a')
        c.d.polygon([(11, 15), (14, 15), (13, 24), (10, 24)], fill=rgba(RED))   # a tail
        line(c, [(18, 20), (23, 27)], BRASS, 2); line(c, [(23, 20), (18, 27)], BRASS, 2)
        c.ellipse((16, 26, 19, 29), BRASS); c.ellipse((22, 26, 25, 29), BRASS)
    else:       # a sagging rope and a CLOSED tag
        line(c, [(6, 11), (15, 17), (25, 11)], '#8a6a5a', 2)
        c.rect((12, 19, 19, 25), '#b0503a'); c.rect((14, 21, 17, 22), '#e8d8c8')

BUILDERS = {
    'sweep-terrace': sweep_terrace, 'fix-gate': fix_gate, 'wipe-tables': wipe_tables,
    'string-lights': string_lights, 'paint-railings': paint_railings, 'plant-herbs': plant_herbs,
    'umbrellas': umbrellas, 'menu-board': menu_board, 'fix-fountain': fix_fountain,
    'tune-piano': tune_piano, 'striped-awning': striped_awning, 'third-oven': third_oven,
    'cake-stand': cake_stand, 'chalk-sign': chalk_sign, 'flower-pots': flower_pots,
    'lanterns': lanterns, 'mural': mural, 'bunting': bunting,
    'second-recipe-page': second_recipe_page, 'grand-opening': grand_opening,
}

def render(slug, fixed):
    c = Canvas(); BUILDERS[slug](c, fixed); c.outline()
    return c.img if fixed else dusty(c.img, sum(map(ord, slug)))

def sheet(path, slugs, scale=5):
    pad = 10; cell = 32 * scale
    out = Image.new('RGBA', (pad + 2 * (cell + pad) + 190, pad + len(slugs) * (cell + pad)), (32, 36, 44, 255))
    d = ImageDraw.Draw(out)
    for r, slug in enumerate(slugs):
        y = pad + r * (cell + pad)
        for col, fixed in enumerate((False, True)):
            x = pad + col * (cell + pad)
            out.paste(Image.new('RGBA', (cell, cell), (232, 223, 203, 255)), (x, y))
            out.alpha_composite(render(slug, fixed).resize((cell, cell), Image.NEAREST), (x, y))
        d.text((pad + 2 * (cell + pad), y + cell // 2 - 6), slug, fill=(220, 220, 220, 255))
    out.save(path)

def scene_sheet(path):
    preview('/tmp/claude-1000/-mnt-d-source-MergeBakery/a287d79c-1335-48dc-957f-5debe0070e39/scratchpad/_cafe_before.png', False); preview('/tmp/claude-1000/-mnt-d-source-MergeBakery/a287d79c-1335-48dc-957f-5debe0070e39/scratchpad/_cafe_after.png', True)
    s = cafe_terrace().resize((96 * 4, 128 * 4), Image.NEAREST)
    a, b = Image.open('/tmp/claude-1000/-mnt-d-source-MergeBakery/a287d79c-1335-48dc-957f-5debe0070e39/scratchpad/_cafe_before.png'), Image.open('/tmp/claude-1000/-mnt-d-source-MergeBakery/a287d79c-1335-48dc-957f-5debe0070e39/scratchpad/_cafe_after.png')
    out = Image.new('RGBA', (s.width * 3 + 40, s.height + 20), (32, 36, 44, 255))
    for i, im in enumerate((s, a, b)):
        out.alpha_composite(im, (10 + i * (s.width + 10), 10))
    out.save(path)

if __name__ == '__main__':
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    keys = list(BUILDERS)
    sheet(f'{out}/T7.7-batch1.png', keys[:10]); sheet(f'{out}/T7.7-batch2.png', keys[10:])
    scene_sheet(f'{out}/T7.7-scene.png'); print('ok')
