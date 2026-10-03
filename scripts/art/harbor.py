"""Harbor Market Stall renovation art (Chapter 3): the 96 x 128 backdrop and 20 objects,
each drawn once with a `fixed` flag like cafe.py. Slugs match chapter3.json."""
import json, os
from PIL import Image, ImageDraw
from portraits import Canvas, rgba
from shop import WOOD, WOOD_L, WOOD_D, CREAM, BUTTER, RED, GREY, GREY_D, GLASS, BRASS, line, dusty

SEA, SEA_D, FOAM = '#4a9fc0', '#2f7fa0', '#e8f4f8'
BLUE, BLUE_D, TEAL, PINK, LEAF, LEAF_D = '#3a78b8', '#2a5a90', '#3aa8a0', '#f27ba0', '#5aa85a', '#3f7f45'
ROPE, STONE, STONE_D = '#c9a26a', '#c9c2b4', '#8f8a7e'

# ─── Backdrop ──────────────────────────────────────────────────────────────

def harbor_market():
    img = Image.new('RGBA', (96, 128), rgba('#cfe9f2'))              # sky
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 95, 10), fill=rgba('#bfe0ec'))
    for x, y in [(10, 4), (58, 7)]:
        d.ellipse((x, y, x + 15, y + 5), fill=rgba('#ffffff'))
    d.rectangle((0, 12, 95, 30), fill=rgba(SEA))                     # the harbor
    for y in range(14, 30, 4):
        for x in range((y // 4 % 2) * 5, 96, 10):
            d.line([(x, y), (x + 3, y)], fill=rgba(FOAM))
    for x, w in [(14, 9), (70, 11)]:                                 # distant boats
        d.polygon([(x, 20), (x + w, 20), (x + w - 2, 24), (x + 2, 24)], fill=rgba('#7a4f26'))
        d.line([(x + w // 2, 12), (x + w // 2, 20)], fill=rgba('#6d3d1d'))
        d.polygon([(x + w // 2 + 1, 13), (x + w // 2 + 6, 19), (x + w // 2 + 1, 19)], fill=rgba('#fffaf0'))
    d.rectangle((0, 31, 95, 34), fill=rgba(STONE_D))                 # quay edge
    d.rectangle((0, 35, 95, 127), fill=rgba('#c9a26a'))              # boardwalk planks
    for y in range(35, 128, 8):
        d.line([(0, y), (95, y)], fill=rgba('#a8803f'))
    for x in range(0, 96, 24):
        for y in range(35, 128, 16):
            d.line([(x + (y // 16 % 2) * 12, y), (x + (y // 16 % 2) * 12, y + 7)], fill=rgba('#a8803f'))
    for x in (8, 48, 88):                                            # mooring bollards
        d.rectangle((x, 28, x + 3, 33), fill=rgba('#3a3a44'))
    for x in range(2, 96, 14):                                       # pennant string
        d.line([(x, 37), (x + 7, 40)], fill=rgba('#8f8a7e'))
        d.polygon([(x + 3, 38), (x + 6, 38), (x + 4, 42)], fill=rgba([RED, BUTTER, TEAL][x // 14 % 3]))
    return img

# ─── The 20 objects ────────────────────────────────────────────────────────

def clear_quay(c, fixed):
    if fixed:   # a neat coil of rope and a broom
        c.ellipse((4, 17, 20, 28), ROPE); c.ellipse((8, 20, 16, 25), '#a8803f')
        line(c, [(24, 3), (19, 24)], WOOD, 2); c.rect((16, 24, 25, 28), BUTTER)
    else:       # seaweed, a crushed crate, a stray fish bone
        c.ellipse((3, 20, 12, 25), '#3f6f4a'); c.ellipse((14, 14, 24, 18), '#3f6f4a')
        c.rect((17, 22, 28, 28), '#8a6a3a'); line(c, [(18, 22), (27, 28)], WOOD_D)
        line(c, [(5, 9), (13, 9)], '#e8e8e0'); c.px([(5, 8), (5, 10), (13, 8), (13, 10)], '#e8e8e0')

def mend_boards(c, fixed):
    c.rect((2, 14, 29, 28), WOOD_L)
    for x in (2, 10, 18, 26): c.rect((x, 14, x, 28), WOOD_D)
    if fixed:
        c.rect((11, 14, 17, 28), WOOD); c.px([(13, 16), (13, 26), (15, 16), (15, 26)], GREY_D)
    else:
        c.rect((11, 14, 17, 28), '#2f4a5a'); line(c, [(5, 15), (8, 27)], WOOD_D)  # a gap down to the water
        c.px([(13, 20), (14, 21)], FOAM)

def scrub_stall(c, fixed):
    c.rect((2, 14, 29, 20), WOOD_L if fixed else '#6a5a46'); c.rect((2, 20, 29, 28), WOOD if fixed else '#4a3d30')
    if fixed:
        c.rect((2, 14, 29, 15), '#fffaf0'); c.ellipse((20, 6, 26, 12), FOAM); c.ellipse((23, 3, 27, 7), FOAM)
        c.rect((6, 8, 13, 13), BLUE); c.rect((6, 8, 13, 9), BLUE_D); line(c, [(14, 4), (14, 12)], WOOD, 2)
    else:
        c.ellipse((6, 15, 12, 19), '#3f5a40'); c.ellipse((17, 16, 23, 19), '#3f5a40'); c.px([(5, 22), (9, 24), (14, 22)], '#8a8a80')

def paint_stall(c, fixed):
    c.rect((3, 6, 28, 28), BLUE if fixed else '#8a8a82')
    c.rect((3, 6, 28, 8), BLUE_D if fixed else '#6a6a62')
    for x in (9, 15, 21): c.rect((x, 9, x, 28), BLUE_D if fixed else '#6a6a62')
    if fixed:
        c.px([(5, 12), (11, 20), (23, 14)], '#a8d0ee'); c.rect((22, 22, 26, 27), '#f7d774'); c.rect((22, 22, 26, 22), BRASS)
    else:
        c.d.polygon([(4, 14), (9, 17), (6, 22)], fill=rgba('#5a4a3a')); c.px([(17, 12), (22, 18), (12, 24)], '#5a4a3a')

def new_awning(c, fixed):
    c.rect((2, 4, 29, 5), WOOD_D)
    for i in range(7):
        x0 = 2 + i * 4
        col = (RED if i % 2 == 0 else CREAM) if fixed else ('#8a8a82' if i % 2 == 0 else '#b0a890')
        drop = 0 if fixed else [0, 4, 1, 6, 2, 5, 0][i]
        c.rect((x0, 6, x0 + 3, 16 + drop), col)
        if fixed: c.ellipse((x0, 14, x0 + 3, 19), col)
    if fixed: c.rect((3, 22, 4, 28), WOOD_D); c.rect((27, 22, 28, 28), WOOD_D)
    else: line(c, [(8, 14), (12, 24), (15, 14)], '#6a4a3a')

def hang_lanterns(c, fixed):
    line(c, [(2, 4), (29, 4)], GREY_D); line(c, [(15, 5), (15, 9)], GREY_D)
    for x, col in [(4, RED), (13, BUTTER), (22, TEAL)]:
        line(c, [(x + 2, 4), (x + 2, 9)], GREY_D)
        if fixed:
            c.rect((x, 9, x + 5, 19), col); c.rect((x + 1, 11, x + 4, 17), '#fff6e6'); c.rect((x - 1, 8, x + 6, 9), GREY_D)
            c.px([(x + 2, 21), (x + 2, 22)], BRASS)
        else:
            c.rect((x, 9, x + 5, 19), '#6a6a62'); c.rect((x - 1, 8, x + 6, 9), GREY_D); c.px([(x + 1, 13), (x + 4, 16)], '#3a3a38')

def price_boards(c, fixed):
    line(c, [(8, 8), (5, 29)], WOOD_D, 2); line(c, [(23, 8), (26, 29)], WOOD_D, 2)
    c.rect((6, 5, 25, 22), '#2f3a36' if fixed else '#5a625e'); c.rect((6, 5, 25, 6), WOOD_L)
    if fixed:
        for y, w in [(9, 14), (13, 12), (17, 14)]:
            line(c, [(9, y), (9 + w, y)], '#fffaf0'); c.px([(22, y), (23, y)], BUTTER)
    else:
        line(c, [(9, 10), (13, 14)], '#7a827e')

def brass_scales(c, fixed):
    brass = BRASS if fixed else '#6a5a3a'
    c.rect((14, 6, 17, 24), brass); c.rect((9, 24, 22, 27), brass)
    line(c, [(4, 9), (27, 9)], brass, 2)
    for x in (6, 25):
        line(c, [(x, 10), (x - 3, 18)], brass); line(c, [(x, 10), (x + 3, 18)], brass)
        c.ellipse((x - 5, 18, x + 5, 21), brass)
    if fixed:
        c.px([(5, 7), (24, 6), (15, 4)], '#fffaf0'); c.ellipse((3, 14, 7, 18), '#e05a5a'); c.ellipse((23, 14, 27, 18), '#7a4f26')
    else:
        c.px([(10, 13), (21, 20)], '#3a3a30')

def stack_crates(c, fixed):
    if fixed:
        for x, y in [(2, 18), (15, 18), (8, 8)]:
            c.rect((x, y, x + 12, y + 9), WOOD_L); c.rect((x, y, x + 12, y + 1), WOOD); c.rect((x, y + 4, x + 12, y + 5), WOOD_D)
            c.px([(x + 1, y + 2), (x + 11, y + 2)], GREY_D)
        c.ellipse((10, 4, 13, 7), RED); c.ellipse((13, 5, 16, 8), '#f7d774')
    else:
        c.d.polygon([(3, 22), (15, 18), (17, 26), (5, 28)], fill=rgba('#7a5a30'))
        c.d.polygon([(16, 20), (28, 24), (26, 28), (14, 27)], fill=rgba('#8a6a3a'))
        c.rect((20, 12, 28, 17), '#6a4a26'); c.px([(5, 24), (9, 22), (20, 25)], WOOD_D)

def net_display(c, fixed):
    line(c, [(2, 4), (29, 4)], WOOD_D, 2)
    if fixed:
        for x in range(4, 29, 5): line(c, [(x, 5), (x - 1, 22)], ROPE)
        for y in range(8, 22, 5): line(c, [(3, y), (28, y)], ROPE)
        for x, y, col in [(6, 10, RED), (16, 16, BUTTER), (24, 9, RED)]: c.ellipse((x, y, x + 3, y + 3), col)
        c.ellipse((9, 22, 14, 26), '#f2dcb0'); c.px([(10, 23), (12, 24)], PINK)       # shells
        c.ellipse((18, 23, 23, 27), '#f2dcb0')
    else:
        c.ellipse((4, 16, 26, 28), '#8a7a58'); c.ellipse((8, 19, 22, 26), '#a8946a')
        line(c, [(6, 10), (14, 20)], '#8a7a58'); line(c, [(24, 9), (16, 20)], '#8a7a58')

def flower_boxes(c, fixed):
    c.rect((3, 18, 28, 27), WOOD); c.rect((3, 18, 28, 19), WOOD_L); c.rect((3, 26, 28, 27), WOOD_D)
    if fixed:
        for x, fc in [(6, PINK), (11, BUTTER), (16, '#fffaf0'), (21, RED), (26, PINK)]:
            line(c, [(x, 18), (x, 11)], LEAF); c.ellipse((x - 2, 7, x + 2, 11), fc); c.px([(x - 2, 14), (x + 2, 13)], LEAF)
    else:
        c.px([(6, 16), (13, 15), (22, 16)], '#6a5a3a'); line(c, [(9, 18), (10, 13)], '#7a7a50'); line(c, [(20, 18), (19, 14)], '#7a7a50')

def harbor_cat(c, fixed):
    c.ellipse((6, 18, 24, 29), WOOD); c.rect((6, 20, 24, 27), WOOD); c.rect((6, 20, 24, 21), WOOD_D)
    c.rect((6, 23, 24, 23), GREY_D)
    if fixed:
        c.ellipse((10, 8, 22, 20), '#e08a3a'); c.ellipse((11, 9, 21, 19), '#f2a050')
        c.d.polygon([(10, 11), (12, 6), (14, 10)], fill=rgba('#e08a3a')); c.d.polygon([(18, 10), (20, 6), (22, 11)], fill=rgba('#e08a3a'))
        c.px([(13, 13), (18, 13)], '#2a1a12'); c.px([(15, 15), (16, 15)], PINK)
        line(c, [(8, 18), (4, 12)], '#e08a3a', 2)
    else:
        c.rect((10, 15, 20, 16), '#e8e0cc'); c.px([(12, 14), (15, 14), (18, 14)], '#9a9a9a')   # an empty saucer

def festival_banner(c, fixed):
    c.rect((2, 3, 3, 28), WOOD_D); c.rect((28, 3, 29, 28), WOOD_D)
    if fixed:
        c.rect((4, 6, 27, 16), TEAL); c.rect((4, 6, 27, 7), '#5ac8c0')
        for x in range(6, 26, 4): c.rect((x, 10, x + 2, 12), '#fffaf0')
        c.d.polygon([(4, 16), (8, 16), (6, 19)], fill=rgba(TEAL)); c.d.polygon([(23, 16), (27, 16), (25, 19)], fill=rgba(TEAL))
        c.px([(2, 2), (29, 2)], BRASS)
    else:
        c.rect((4, 8, 12, 12), '#9a9a8a'); line(c, [(12, 10), (20, 15)], '#8a8a7a', 2); c.rect((20, 15, 27, 18), '#9a9a8a')

def chalk_menu(c, fixed):
    c.rect((5, 3, 26, 26), WOOD); c.rect((7, 5, 24, 24), '#2f3a36' if fixed else '#4a524e'); c.rect((7, 3, 24, 3), WOOD_L)
    line(c, [(9, 27), (6, 30)], WOOD_D); line(c, [(22, 27), (25, 30)], WOOD_D)
    if fixed:
        line(c, [(10, 8), (21, 8)], '#fffaf0'); c.ellipse((10, 11, 14, 15), RED); line(c, [(16, 13), (21, 13)], '#fffaf0')
        c.ellipse((10, 17, 14, 21), '#c98a4b'); line(c, [(16, 19), (21, 19)], '#fffaf0')
    else:
        line(c, [(9, 9), (14, 12)], '#7a827e'); c.px([(18, 17), (19, 18)], '#7a827e')

def market_bell(c, fixed):
    line(c, [(4, 6), (22, 6)], WOOD_D, 3); line(c, [(22, 6), (22, 26)], WOOD_D, 3)
    brass = BRASS if fixed else '#7a5a3a'
    ox = 0 if fixed else 2
    c.d.polygon([(11 + ox, 10), (19 + ox, 10), (22 + ox, 22), (8 + ox, 22)], fill=rgba(brass))
    c.rect((10 + ox, 22, 20 + ox, 23), brass); c.ellipse((13 + ox, 23, 17 + ox, 27), GREY_D)
    c.rect((14 + ox, 7, 16 + ox, 10), GREY_D)
    if fixed: c.px([(12, 13), (13, 12), (24, 10), (26, 12), (25, 14)], '#fffaf0')
    else: c.px([(12, 16), (16, 18), (14, 13)], '#a8643a')

def paper_boats(c, fixed):
    c.rect((2, 18, 29, 28), SEA_D if fixed else '#5a6a70')
    for x in range(3, 28, 6): c.rect((x, 20, x + 2, 20), FOAM if fixed else '#8a9a9a')
    if fixed:
        for x, col in [(4, '#fffaf0'), (14, BUTTER), (22, '#f27ba0')]:
            c.d.polygon([(x, 14), (x + 8, 14), (x + 6, 18), (x + 2, 18)], fill=rgba(col))
            c.d.polygon([(x + 4, 6), (x + 7, 13), (x + 1, 13)], fill=rgba(col))
            c.px([(x + 4, 11)], '#f7d774')
    else:
        c.ellipse((10, 22, 16, 25), '#7a8a8a')

def tasting_table(c, fixed):
    c.rect((3, 12, 28, 15), '#fffaf0' if fixed else '#b0a890'); c.rect((3, 15, 28, 21), '#e0457b' if fixed else '#7a6a60')
    c.rect((5, 22, 7, 29), WOOD_D); c.rect((24, 22, 26, 29), WOOD_D)
    if fixed:
        for x in (7, 14, 21): c.ellipse((x, 7, x + 5, 12), '#ffffff'); c.ellipse((x + 1, 8, x + 4, 11), '#f7d774')
        c.px([(24, 8), (25, 9)], RED)
    else:
        line(c, [(5, 16), (9, 19)], '#5a4a40')

def festival_stage(c, fixed):
    c.rect((2, 20, 29, 28), WOOD_L if fixed else '#7a6a52'); c.rect((2, 20, 29, 21), WOOD)
    for x in range(5, 29, 6): c.rect((x, 22, x, 28), WOOD_D)
    if fixed:
        c.rect((2, 4, 29, 6), RED); c.rect((2, 6, 8, 19), '#a8323a'); c.rect((23, 6, 29, 19), '#a8323a')
        c.px([(5, 12), (26, 12)], BRASS); c.px([(15, 9), (16, 10), (15, 11)], BUTTER)
    else:
        line(c, [(3, 6), (9, 19)], WOOD_D, 2); c.rect((14, 8, 24, 12), '#8a7a60'); line(c, [(24, 12), (27, 19)], WOOD_D, 2)

def third_recipe_page(c, fixed):
    c.rect((3, 4, 28, 27), '#8a6a4a' if fixed else '#6a5a46')
    if fixed:
        c.rect((5, 6, 14, 25), '#f2dcb0'); c.rect((17, 6, 26, 25), '#f2dcb0'); c.rect((15, 6, 16, 25), '#d9b07a')
        for y in (9, 12, 15): line(c, [(7, y), (13, y)], '#a8845a')
        c.ellipse((19, 11, 24, 16), RED); c.rect((18, 17, 25, 20), '#d9a05c'); c.px([(21, 9)], LEAF)
    else:
        c.rect((5, 6, 26, 25), '#8a7a62'); c.rect((12, 10, 18, 16), '#4a3a2a')     # a loose brick hiding the page

def festival_night(c, fixed):
    c.rect((2, 6, 4, 29), WOOD_D); c.rect((27, 6, 29, 29), WOOD_D)
    if fixed:
        line(c, [(3, 7), (15, 14), (28, 7)], GREY_D)
        for x, y, col in [(6, 11, RED), (11, 13, BUTTER), (16, 14, TEAL), (21, 13, PINK), (25, 11, BUTTER)]:
            c.ellipse((x - 1, y, x + 2, y + 3), col)
        for x, y, col in [(10, 3, BUTTER), (21, 4, PINK)]:
            c.px([(x, y), (x - 2, y), (x + 2, y), (x, y - 2), (x, y + 2), (x - 1, y - 1), (x + 1, y + 1), (x + 1, y - 1), (x - 1, y + 1)], col)
        c.rect((8, 22, 23, 28), '#fffaf0'); c.px([(11, 24), (15, 24), (19, 24)], RED)
    else:
        line(c, [(3, 11), (15, 18), (28, 11)], '#8a6a5a', 2)
        c.rect((11, 20, 20, 26), '#b0503a'); c.rect((13, 22, 18, 23), '#e8d8c8')

BUILDERS = {
    'clear-quay': clear_quay, 'mend-boards': mend_boards, 'scrub-stall': scrub_stall,
    'paint-stall': paint_stall, 'new-awning': new_awning, 'hang-lanterns': hang_lanterns,
    'price-boards': price_boards, 'brass-scales': brass_scales, 'stack-crates': stack_crates,
    'net-display': net_display, 'flower-boxes': flower_boxes, 'harbor-cat': harbor_cat,
    'festival-banner': festival_banner, 'chalk-menu': chalk_menu, 'market-bell': market_bell,
    'paper-boats': paper_boats, 'tasting-table': tasting_table, 'festival-stage': festival_stage,
    'third-recipe-page': third_recipe_page, 'festival-night': festival_night,
}

def render(slug, fixed):
    c = Canvas(); BUILDERS[slug](c, fixed); c.outline()
    return c.img if fixed else dusty(c.img, sum(map(ord, slug)))

def sheet(path, scale=4):
    pad = 8; cell = 32 * scale; cols = 5
    rows = (len(BUILDERS) + cols - 1) // cols
    out = Image.new('RGBA', (pad + cols * (2 * cell + pad * 2), pad + rows * (cell + 16)), (32, 36, 44, 255))
    d = ImageDraw.Draw(out)
    for n, slug in enumerate(BUILDERS):
        bx = pad + (n % cols) * (2 * cell + pad * 2); by = pad + (n // cols) * (cell + 16)
        for k, fixed in enumerate((False, True)):
            x = bx + k * cell
            out.paste(Image.new('RGBA', (cell, cell), (201, 162, 106, 255)), (x, by))
            out.alpha_composite(render(slug, fixed).resize((cell, cell), Image.NEAREST), (x, by))
        d.text((bx, by + cell + 2), slug, fill=(220, 220, 220, 255))
    out.save(path)

def scene_preview(path, fixed, scale=4):
    chapter = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'chapter3.json'), encoding='utf-8'))
    w, h = 96 * scale, 128 * scale
    base = Image.new('RGBA', (w, h), rgba('#fff6e6'))
    faded = harbor_market().resize((w, h), Image.NEAREST); faded.putalpha(int(255 * 0.35))
    base.alpha_composite(faded)
    size = round(w * 0.22)
    for task in chapter['tasks']:
        slug = task['id'].removeprefix('harbor-')
        sprite = render(slug, fixed).resize((size, size), Image.NEAREST)
        x = round(task['spot']['x'] * w - size / 2); y = round(task['spot']['y'] * h - size / 2)
        base.alpha_composite(sprite, (max(0, x), max(0, y)))
    base.save(path)

if __name__ == '__main__':
    here = os.path.dirname(__file__)
    art = os.path.join(here, '..', '..', 'public', 'art')
    harbor_market().save(os.path.join(art, 'harbor-market.png'))
    for slug in BUILDERS:
        for fixed, tag in ((False, 'before'), (True, 'after')):
            render(slug, fixed).save(os.path.join(art, f'harbor-market-{slug}-{tag}.png'))
    sheet(os.path.join(here, 'harbor_sheet.png'))
    scene_preview(os.path.join(here, 'harbor_before.png'), False); scene_preview(os.path.join(here, 'harbor_after.png'), True)
    print('ok', len(BUILDERS) * 2 + 1)
