"""Wholesale Kitchen renovation art (Chapter 4): the 96 x 128 backdrop and 20 objects,
each drawn once with a `fixed` flag like cafe.py and harbor.py. Slugs match chapter4.json."""
import json, os
from PIL import Image, ImageDraw
from portraits import Canvas, rgba
from shop import WOOD, WOOD_L, WOOD_D, CREAM, BUTTER, RED, GREY, GREY_D, GLASS, BRASS, line, dusty

STEEL, STEEL_L, STEEL_D = '#b8c4d0', '#dce6ee', '#7a8896'
TILE, TILE_D, BLUE, BLUE_D = '#eef4f6', '#c8d4da', '#3a78b8', '#2a5a90'
GREEN, GREEN_D, ORANGE, PINK = '#4f9b4a', '#3f7f45', '#f2a03a', '#f27ba0'

# ─── Backdrop ──────────────────────────────────────────────────────────────

def wholesale_kitchen():
    img = Image.new('RGBA', (96, 128), rgba('#e8eef2'))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 95, 9), fill=rgba('#9aa6b2'))                # ceiling
    for x in range(6, 96, 20):                                       # strip lights
        d.rectangle((x, 6, x + 11, 8), fill=rgba('#fffbe6'))
    d.line([(0, 4), (95, 4)], fill=rgba('#7a8896'))                  # a pipe run
    d.rectangle((0, 10, 95, 52), fill=rgba(TILE))                    # tiled wall
    for y in range(10, 53, 6):
        d.line([(0, y), (95, y)], fill=rgba(TILE_D))
    for x in range(0, 96, 8):
        d.line([(x, 10), (x, 52)], fill=rgba(TILE_D))
    d.rectangle((0, 40, 95, 42), fill=rgba(BLUE))                    # a blue tile stripe
    d.rectangle((0, 53, 95, 56), fill=rgba(STEEL_D))                 # steel kick rail
    d.rectangle((0, 57, 95, 127), fill=rgba('#c0705a'))              # quarry-tile floor
    for y in range(57, 128, 9):
        d.line([(0, y), (95, y)], fill=rgba('#a85a48'))
        for x in range(((y - 57) // 9 % 2) * 6, 96, 12):
            d.line([(x, y), (x, y + 8)], fill=rgba('#a85a48'))
    d.rectangle((0, 122, 95, 127), fill=rgba('#a85a48'))
    for x in (20, 60):                                               # floor drains
        d.rectangle((x, 100, x + 5, 102), fill=rgba(STEEL_D))
    return img

# ─── The 20 objects ────────────────────────────────────────────────────────

def clear_unit(c, fixed):
    if fixed:   # empty swept floor, a mop and bucket
        line(c, [(8, 4), (12, 22)], WOOD, 2); c.rect((8, 22, 17, 25), CREAM)
        c.rect((18, 18, 28, 28), BLUE); c.rect((18, 18, 28, 20), BLUE_D); c.px([(21, 23), (25, 22)], '#d4eef2')
    else:       # flattened boxes and a heap of packing paper
        c.rect((3, 20, 17, 27), '#a8803f'); c.rect((12, 14, 26, 21), '#8a6a3a'); c.rect((19, 22, 29, 28), '#a8803f')
        line(c, [(4, 22), (16, 25)], WOOD_D); c.ellipse((5, 10, 12, 16), '#d8d2c4')

def loading_door(c, fixed):
    c.rect((3, 3, 28, 29), STEEL_D)
    c.rect((5, 5, 26, 28), STEEL if fixed else '#8a8a82')
    if fixed:
        for y in range(7, 27, 4): c.rect((5, y, 26, y), STEEL_L)
        c.rect((13, 4, 18, 5), RED); c.rect((14, 20, 17, 22), BRASS)
    else:       # roller door stuck half open, jammed
        c.rect((5, 5, 26, 14), STEEL_D)
        for y in (8, 11): c.rect((5, y, 26, y), '#6a6a62')
        c.rect((5, 14, 26, 28), '#2a2a30'); c.px([(10, 18), (20, 22)], '#7a5a3a')

def scrub_floors(c, fixed):
    c.rect((2, 12, 29, 28), '#c0705a' if fixed else '#6a5a50')
    for y in (16, 21, 26): c.rect((2, y, 29, y), '#a85a48' if fixed else '#4a3a30')
    if fixed:
        c.px([(6, 14), (14, 19), (23, 15), (10, 24), (21, 23)], '#fff0e6')
        c.ellipse((20, 6, 26, 11), '#eaf6fb'); c.ellipse((23, 3, 27, 7), '#eaf6fb')   # bubbles
    else:
        c.ellipse((6, 15, 14, 20), '#4a4038'); c.ellipse((17, 21, 26, 26), '#3a322c')

def steel_counters(c, fixed):
    top = STEEL_L if fixed else '#8a8a82'
    c.rect((2, 10, 29, 13), top); c.rect((2, 13, 29, 26), STEEL if fixed else '#6a6a62')
    c.rect((3, 26, 5, 29), STEEL_D); c.rect((26, 26, 28, 29), STEEL_D)
    if fixed:
        c.rect((6, 16, 14, 22), STEEL_D); c.rect((6, 16, 14, 17), STEEL_L)
        c.rect((17, 16, 27, 22), STEEL_D); c.rect((17, 16, 27, 17), STEEL_L)
        c.px([(10, 19), (22, 19)], BRASS)
    else:
        c.rect((6, 5, 20, 10), WOOD); c.rect((22, 3, 27, 10), '#8a6a3a')    # old wooden bench on top

def big_sinks(c, fixed):
    c.rect((2, 12, 29, 14), STEEL if fixed else '#8a8a82')
    c.rect((3, 14, 14, 24), STEEL_D if fixed else '#4a4a44'); c.rect((17, 14, 28, 24), STEEL_D if fixed else '#4a4a44')
    c.rect((3, 24, 28, 28), STEEL if fixed else '#6a6a62')
    line(c, [(15, 4), (15, 11)], STEEL_L if fixed else GREY_D, 2); c.rect((10, 3, 20, 4), STEEL_L if fixed else GREY_D)
    if fixed:
        c.rect((5, 16, 12, 22), '#7fc8f8'); c.px([(7, 15), (10, 14)], '#ffffff')
    else:
        c.px([(6, 18), (9, 21), (20, 19)], '#6a4a2a'); line(c, [(5, 15), (12, 23)], '#3a3a34')

def walk_in_fridge(c, fixed):
    c.rect((4, 3, 27, 29), STEEL if fixed else '#8a8a82'); c.rect((4, 3, 27, 5), STEEL_L if fixed else '#9a9a92')
    c.rect((7, 7, 24, 27), STEEL_L if fixed else '#7a7a72')
    c.rect((21, 14, 22, 20), BRASS if fixed else '#5a4a30')
    c.rect((9, 9, 14, 11), '#2f9fc9' if fixed else '#4a5a60')
    if fixed: c.px([(10, 10), (11, 10)], '#d4eef2')
    else: line(c, [(8, 8), (23, 26)], '#5a5a54'); c.px([(11, 24), (17, 20)], '#5a3a2a')

def delivery_bay(c, fixed):
    c.rect((2, 22, 29, 28), '#6a6a72'); c.rect((2, 22, 29, 23), '#8a8a92')
    if fixed:
        for x in range(3, 29, 6): c.rect((x, 24, x + 2, 24), BUTTER)    # yellow lines
        c.rect((8, 6, 23, 20), '#2f9fc9'); c.rect((8, 6, 23, 8), '#1f7a9c'); c.rect((10, 11, 21, 17), '#fffaf0')
        c.px([(12, 13), (15, 13), (18, 13)], '#c0392b')
    else:
        c.rect((8, 8, 23, 20), '#6a7a80'); line(c, [(8, 8), (23, 20)], '#4a5a60')
        c.px([(5, 25), (20, 26)], '#3a3a3a')

def deck_oven(c, fixed):
    body, trim = (STEEL, STEEL_D) if fixed else ('#8a8a82', '#5a5a52')
    c.rect((2, 5, 29, 27), body); c.rect((2, 5, 29, 7), STEEL_L if fixed else '#9a9a92'); c.rect((2, 25, 29, 27), trim)
    for y0 in (9, 17):
        c.rect((5, y0, 26, y0 + 6), '#f2a040' if fixed else '#2a2a28'); c.rect((5, y0, 26, y0), trim)
        if fixed: c.rect((6, y0 + 1, 25, y0 + 1), BUTTER)
    c.rect((27, 9, 28, 22), BRASS if fixed else '#5a4a30')
    if fixed: c.px([(10, 3), (11, 2), (17, 3), (18, 2)], '#e8e8f0')
    else: line(c, [(3, 6), (9, 3)], '#d8d2c4'); line(c, [(9, 3), (13, 6)], '#d8d2c4')

def order_board(c, fixed):
    c.rect((3, 4, 28, 26), WOOD_D); c.rect((5, 6, 26, 24), '#f4f0e6' if fixed else '#c8c2b4')
    if fixed:
        for y, w in [(9, 10), (13, 14), (17, 8)]:
            line(c, [(8, y), (8 + w, y)], '#3a3a44'); c.px([(23, y), (24, y)], GREEN)
        c.rect((19, 20, 24, 22), RED)
    else:
        c.px([(9, 9), (10, 9), (14, 15), (20, 11)], '#9a9488'); line(c, [(7, 20), (11, 22)], '#8a8478')

def hygiene_rating(c, fixed):
    c.rect((6, 3, 25, 28), '#fffaf0' if fixed else '#b8b4a4'); c.rect((6, 3, 25, 5), BLUE if fixed else '#6a7a80')
    if fixed:
        for x in (9, 13, 17, 21, 25): pass
        for i in range(4): c.ellipse((8 + i * 4, 9, 11 + i * 4, 12), BUTTER); c.px([(9 + i * 4, 9)], '#fffbe6')
        c.ellipse((10, 15, 21, 25), GREEN); c.rect((14, 17, 17, 22), '#fffaf0')     # a tick
        c.px([(13, 21), (14, 22), (15, 21), (16, 19), (17, 17)], GREEN_D)
    else:
        for i in range(2): c.ellipse((8 + i * 4, 9, 11 + i * 4, 12), '#8a8478')
        line(c, [(9, 20), (22, 24)], '#8a8478')

def staff_room(c, fixed):
    c.rect((2, 22, 29, 25), WOOD if fixed else '#6a5a46'); c.rect((4, 25, 6, 29), WOOD_D); c.rect((25, 25, 27, 29), WOOD_D)
    if fixed:
        c.rect((6, 14, 12, 22), '#fffaf0'); c.rect((12, 16, 14, 19), '#fffaf0'); c.px([(8, 11), (9, 10), (10, 11)], '#e8e8f0')   # kettle? mug+steam
        c.rect((16, 8, 27, 20), '#d9b04c'); c.rect((17, 9, 26, 19), '#f4e4a8'); c.px([(19, 11), (22, 13), (20, 16)], RED)    # corkboard
    else:
        c.rect((17, 10, 26, 18), '#8a7a5a'); line(c, [(17, 10), (26, 18)], '#6a5a3a')

def uniforms(c, fixed):
    line(c, [(4, 6), (27, 6)], STEEL_D, 2)
    for x, col in [(5, '#fffaf0'), (13, BLUE), (21, '#fffaf0')]:
        c.rect((x + 3, 6, x + 4, 8), STEEL_D)
        if fixed:
            c.d.polygon([(x, 9), (x + 8, 9), (x + 9, 25), (x - 1, 25)], fill=rgba(col)); c.rect((x + 3, 9, x + 5, 12), STEEL_L if col == BLUE else '#d8e0e8')
            c.px([(x + 4, 15), (x + 4, 19)], ORANGE)
        else:
            c.d.polygon([(x, 9), (x + 8, 9), (x + 7, 20), (x + 1, 20)], fill=rgba('#8a8a82'))
    if not fixed: c.rect((10, 24, 20, 28), '#a8803f')

def label_printer(c, fixed):
    c.rect((4, 14, 27, 26), STEEL if fixed else '#8a8a82'); c.rect((4, 14, 27, 16), STEEL_L if fixed else '#9a9a92')
    c.rect((8, 8, 22, 14), STEEL_D if fixed else '#5a5a52')
    c.rect((7, 22, 24, 24), '#2a2a30')
    if fixed:
        c.rect((10, 24, 20, 29), '#fffaf0'); c.px([(12, 26), (14, 26), (16, 26)], '#3a3a44'); c.px([(23, 18)], GREEN)
    else:
        line(c, [(10, 24), (13, 28)], '#d8d2c4'); line(c, [(13, 28), (17, 25)], '#d8d2c4')

def cold_store(c, fixed):
    c.rect((3, 5, 28, 27), STEEL if fixed else '#8a8a82')
    for y in (11, 17, 23): c.rect((5, y, 26, y), STEEL_D)
    if fixed:
        for x, y, col in [(7, 6, RED), (13, 6, BUTTER), (19, 6, GREEN), (8, 12, BLUE), (15, 12, '#fffaf0'), (21, 18, RED), (8, 18, BUTTER)]:
            c.rect((x, y, x + 3, y + 3), col)
        c.px([(24, 8), (25, 9), (24, 10)], '#d4eef2')
    else:
        c.rect((8, 20, 20, 26), '#6a4a2a'); c.px([(9, 8), (17, 14)], '#3a5a40'); line(c, [(4, 6), (27, 10)], '#6a6a62')

def packing_line(c, fixed):
    c.rect((2, 17, 29, 21), '#4a4a52'); c.rect((2, 17, 29, 18), '#6a6a72')
    for x in range(4, 29, 5): c.px([(x, 19)], '#8a8a92')
    c.rect((4, 21, 6, 28), STEEL_D); c.rect((25, 21, 27, 28), STEEL_D)
    if fixed:
        for x in (4, 12, 20):
            c.rect((x, 10, x + 6, 16), '#d9a05c'); c.rect((x, 10, x + 6, 11), '#f0c48a'); c.px([(x + 3, 12), (x + 3, 14)], '#fffaf0')
    else:
        c.rect((5, 12, 11, 16), '#8a6a3a'); c.rect((17, 8, 24, 16), '#7a5a30'); line(c, [(10, 22), (22, 26)], '#3a3a34')

def delivery_van(c, fixed):
    col = '#fffaf0' if fixed else '#b0aa9a'
    c.rect((2, 9, 22, 22), col); c.d.polygon([(22, 12), (28, 12), (29, 22), (22, 22)], fill=rgba(col))
    c.rect((24, 13, 27, 16), '#7fc8f8' if fixed else '#6a7a80')
    c.ellipse((4, 20, 10, 27), '#2a2a30'); c.ellipse((20, 20, 26, 27), '#2a2a30'); c.px([(7, 23), (23, 23)], STEEL)
    if fixed:
        c.rect((5, 12, 19, 16), RED); c.rect((7, 13, 17, 14), '#fffaf0'); c.px([(26, 21)], BUTTER)
    else:
        c.rect((4, 11, 12, 15), '#8a7a60'); c.px([(14, 18), (8, 10)], '#6a4a2a'); line(c, [(2, 22), (22, 22)], '#8a8a82')

def tasting_day(c, fixed):
    c.rect((2, 16, 29, 20), '#fffaf0' if fixed else '#b0a890'); c.rect((2, 20, 29, 26), BLUE if fixed else '#6a6a62')
    c.rect((4, 26, 6, 29), WOOD_D); c.rect((25, 26, 27, 29), WOOD_D)
    if fixed:
        for x in (4, 12, 20):
            c.ellipse((x, 9, x + 6, 15), '#d9a05c'); c.px([(x + 2, 10), (x + 4, 12)], '#f0c48a')
        c.px([(2, 5), (3, 5), (28, 5), (29, 5)], BUTTER); line(c, [(2, 6), (29, 6)], RED)
    else:
        c.rect((6, 12, 12, 15), '#8a8478')

def fourth_recipe_page(c, fixed):
    c.rect((3, 3, 28, 28), '#8a6a4a' if fixed else '#6a5a46')
    if fixed:
        c.rect((5, 5, 15, 26), '#f2dcb0'); c.rect((17, 5, 26, 26), '#f2dcb0'); c.rect((15, 5, 16, 26), '#d9b07a')
        for y in (8, 11, 14): line(c, [(7, y), (13, y)], '#a8845a')
        c.ellipse((19, 9, 24, 13), '#d9a05c'); c.rect((19, 15, 24, 22), '#d9a05c'); line(c, [(19, 18), (24, 18)], '#a8703a')
    else:
        c.rect((5, 5, 26, 26), '#8a7a62'); c.rect((13, 9, 19, 17), '#4a3a2a'); c.px([(8, 22), (22, 7)], '#6a5a46')

def chain_inspection(c, fixed):
    c.rect((6, 3, 25, 28), '#fffaf0' if fixed else '#b8b4a4'); c.rect((8, 2, 23, 5), STEEL_D)
    if fixed:
        for y in (9, 14, 19):
            line(c, [(9, y), (16, y)], '#3a3a44'); c.ellipse((18, y - 2, 22, y + 2), GREEN)
            c.px([(19, y), (20, y - 1)], '#ffffff')
        c.rect((9, 23, 22, 26), BLUE); c.px([(11, 24), (14, 24)], '#ffffff')
    else:
        for y in (9, 14, 19): line(c, [(9, y), (16, y)], '#8a8478'); c.ellipse((18, y - 2, 22, y + 2), '#9a9488')

def first_big_order(c, fixed):
    c.rect((3, 20, 28, 28), '#6a6a72'); c.rect((3, 20, 28, 21), '#8a8a92')    # a trolley
    line(c, [(4, 6), (4, 20)], STEEL_D, 2)
    if fixed:
        for x, y in [(6, 12), (14, 12), (22, 12), (10, 4), (18, 4)]:
            c.rect((x, y, x + 6, y + 7), '#d9a05c'); c.rect((x, y, x + 6, y + 1), '#f0c48a'); c.px([(x + 3, y + 3)], '#fffaf0')
        c.rect((24, 2, 28, 6), GREEN); c.px([(25, 4), (26, 5), (27, 3)], '#ffffff')
    else:
        c.rect((8, 14, 14, 20), '#8a6a3a'); c.rect((17, 17, 22, 20), '#7a5a30')

BUILDERS = {
    'clear-unit': clear_unit, 'loading-door': loading_door, 'scrub-floors': scrub_floors,
    'steel-counters': steel_counters, 'big-sinks': big_sinks, 'walk-in-fridge': walk_in_fridge,
    'delivery-bay': delivery_bay, 'deck-oven': deck_oven, 'order-board': order_board,
    'hygiene-rating': hygiene_rating, 'staff-room': staff_room, 'uniforms': uniforms,
    'label-printer': label_printer, 'cold-store': cold_store, 'packing-line': packing_line,
    'delivery-van': delivery_van, 'tasting-day': tasting_day, 'fourth-recipe-page': fourth_recipe_page,
    'chain-inspection': chain_inspection, 'first-big-order': first_big_order,
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
            out.paste(Image.new('RGBA', (cell, cell), (192, 112, 90, 255)), (x, by))
            out.alpha_composite(render(slug, fixed).resize((cell, cell), Image.NEAREST), (x, by))
        d.text((bx, by + cell + 2), slug, fill=(220, 220, 220, 255))
    out.save(path)

def scene_preview(path, fixed, scale=4):
    chapter = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'chapter4.json'), encoding='utf-8'))
    w, h = 96 * scale, 128 * scale
    base = Image.new('RGBA', (w, h), rgba('#fff6e6'))
    faded = wholesale_kitchen().resize((w, h), Image.NEAREST); faded.putalpha(int(255 * 0.35))
    base.alpha_composite(faded)
    size = round(w * 0.22)
    for task in chapter['tasks']:
        slug = task['id'].removeprefix('wholesale-')
        sprite = render(slug, fixed).resize((size, size), Image.NEAREST)
        x = round(task['spot']['x'] * w - size / 2); y = round(task['spot']['y'] * h - size / 2)
        base.alpha_composite(sprite, (max(0, x), max(0, y)))
    base.save(path)

if __name__ == '__main__':
    here = os.path.dirname(__file__)
    art = os.path.join(here, '..', '..', 'public', 'art')
    wholesale_kitchen().save(os.path.join(art, 'wholesale-kitchen.png'))
    for slug in BUILDERS:
        for fixed, tag in ((False, 'before'), (True, 'after')):
            render(slug, fixed).save(os.path.join(art, f'wholesale-kitchen-{slug}-{tag}.png'))
    sheet(os.path.join(here, 'wholesale_sheet.png'))
    scene_preview(os.path.join(here, 'wholesale_after.png'), True)
    print('ok', len(BUILDERS) * 2 + 1)
