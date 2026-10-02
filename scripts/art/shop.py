"""Corner Shop renovation art: each object is drawn once with a `fixed` flag, so
before and after share their framing; the before also gets a dusty filter."""
import random
from PIL import Image, ImageDraw
from portraits import Canvas, INK, rgba

WOOD, WOOD_L, WOOD_D = '#9c5b2e', '#c98d55', '#6d3d1d'
CREAM, BUTTER, RED = '#fff6e6', '#f7d774', '#c0392b'
GREY, GREY_D, GLASS, BRASS = '#9a9aa5', '#5a5a64', '#d4eef2', '#d9a83c'

def line(c, points, color, width=1):
    c.d.line(points, fill=rgba(color) if isinstance(color, str) else color, width=width)

def dusty(img, seed):
    """Fade towards a grey-brown, dim a little, and scatter dust specks."""
    out = img.copy(); px = out.load(); rng = random.Random(seed)
    grey = (138, 128, 112)
    for y in range(32):
        for x in range(32):
            r, g, b, a = px[x, y]
            if a == 0: continue
            if (r, g, b, a) == INK:
                continue
            k = 0.55
            px[x, y] = (int(r * (1 - k) + grey[0] * k), int(g * (1 - k) + grey[1] * k), int(b * (1 - k) + grey[2] * k), a)
    for _ in range(9):
        x, y = rng.randrange(32), rng.randrange(32)
        if px[x, y][3] != 0 and px[x, y] != INK:
            px[x, y] = (110, 100, 88, 255)
    return out

# ─── The 20 objects ────────────────────────────────────────────────────────

def sweep_cobwebs(c, fixed):
    if fixed:   # a broom and dustpan
        line(c, [(21, 3), (12, 22)], WOOD, 2)
        c.d.polygon([(8, 21), (16, 21), (19, 29), (5, 29)], fill=rgba(BUTTER))
        line(c, [(7, 25), (17, 25)], '#d9b04c')
        c.d.polygon([(19, 24), (29, 24), (28, 29), (20, 29)], fill=rgba(GREY))
        c.rect((29, 22, 30, 25), GREY_D)
    else:       # a cobweb in the corner, and a spider
        for end in [(28, 3), (26, 14), (20, 22), (10, 28), (3, 28)]:
            line(c, [(3, 3), end], '#e8e8f0')
        for r in (6, 11, 17):
            c.d.arc((3 - r, 3 - r, 3 + r, 3 + r), 0, 90, fill=rgba('#e8e8f0'))
        c.px([(20, 22), (21, 22), (20, 23), (21, 23)], INK)
        line(c, [(21, 3), (21, 21)], '#e8e8f0')

def wash_window(c, fixed):
    c.rect((4, 3, 27, 28), WOOD)
    pane = GLASS if fixed else '#9a8a6a'
    for x0, y0 in [(6, 5), (17, 5), (6, 17), (17, 17)]:
        c.rect((x0, y0, x0 + 8, y0 + 9), pane)
    if fixed:
        for x0, y0 in [(6, 5), (17, 5), (6, 17), (17, 17)]:
            line(c, [(x0 + 1, y0 + 6), (x0 + 5, y0 + 2)], '#ffffff')
    else:
        c.px([(8, 8), (9, 9), (20, 7), (22, 11), (9, 21), (21, 20), (23, 23)], '#6d5a3a')
    c.rect((3, 28, 28, 29), WOOD_L)

def clear_counter(c, fixed):
    c.rect((2, 16, 29, 29), WOOD); c.rect((2, 15, 29, 16), WOOD_L)
    c.rect((4, 20, 27, 26), WOOD_D)
    if fixed:   # a brass till and a little cake stand
        c.rect((5, 7, 15, 14), BRASS); c.rect((6, 8, 14, 10), '#fff0b8')
        c.rect((7, 12, 13, 13), '#b8862c')
        c.rect((20, 12, 26, 13), CREAM); c.rect((22, 13, 24, 14), CREAM)
        c.ellipse((20, 7, 26, 12), '#f5a3c0')
    else:       # boxes piled up
        c.rect((3, 6, 13, 14), '#b0905a'); line(c, [(3, 10), (13, 10)], '#8a6a3a')
        c.rect((12, 2, 20, 14), '#c9a57a'); line(c, [(16, 2), (16, 14)], '#a8845a')
        c.rect((20, 9, 28, 14), '#b0905a')

def fix_stool(c, fixed):
    if fixed:
        c.ellipse((8, 6, 23, 11), '#e05a5a'); c.rect((8, 9, 23, 11), '#c0392b')
        for x in (10, 20):
            c.rect((x, 12, x + 1, 28), WOOD)
        c.rect((10, 21, 21, 22), WOOD_D)
    else:       # tipped over, a leg snapped off
        c.d.polygon([(6, 12), (20, 6), (22, 10), (8, 16)], fill=rgba('#8a6a6a'))
        line(c, [(10, 16), (16, 28)], WOOD, 2)
        line(c, [(19, 12), (25, 24)], WOOD, 2)
        line(c, [(22, 27), (28, 25)], WOOD, 2)  # the broken leg on the floor

def patch_roof(c, fixed):
    for row in range(5):
        y = 4 + row * 5
        off = 0 if row % 2 == 0 else 3
        for col in range(5):
            x = 2 + off + col * 6
            if not fixed and (row, col) in {(1, 2), (2, 1), (3, 3)}:
                continue  # missing tiles
            c.rect((x, y, x + 5, y + 4), '#b85a4a')
            line(c, [(x, y + 4), (x + 5, y + 4)], '#8a3a2a')
    if not fixed:
        c.px([(16, 26), (16, 28), (16, 30)], '#7fc8f8')  # the leak

def repaint_door(c, fixed):
    body = '#3aa8a0' if fixed else '#8a9a8a'
    c.rect((8, 2, 23, 30), body)
    c.rect((10, 4, 21, 12), GLASS if fixed else '#9a8a6a')
    c.rect((10, 15, 21, 28), '#2f8a84' if fixed else '#7a8a7a')
    c.px([(20, 20), (21, 20), (20, 21)], BRASS if fixed else GREY_D)
    if not fixed:  # peeling paint showing bare wood
        c.rect((12, 16, 14, 19), WOOD_L); c.rect((17, 24, 19, 26), WOOD_L); c.rect((9, 7, 10, 9), WOOD_L)

def recipe_board(c, fixed):
    c.rect((3, 5, 28, 26), WOOD); c.rect((5, 7, 26, 24), '#c9a26a')
    if fixed:
        for x0, y0, pin in [(7, 9, RED), (17, 8, '#4a7fb0'), (11, 16, '#5aa85a')]:
            c.rect((x0, y0, x0 + 7, y0 + 7), CREAM)
            line(c, [(x0 + 1, y0 + 3), (x0 + 6, y0 + 3)], '#c9a57a')
            line(c, [(x0 + 1, y0 + 5), (x0 + 5, y0 + 5)], '#c9a57a')
            c.px([(x0 + 3, y0), (x0 + 4, y0)], pin)
    else:
        c.rect((8, 10, 15, 17), '#b89660')  # a faded patch where a card was
        c.d.polygon([(18, 9), (23, 9), (21, 14)], fill=rgba('#d9cfb0'))  # a torn scrap

def shop_bell(c, fixed):
    c.rect((4, 3, 20, 5), '#5a5a64'); c.rect((4, 3, 6, 10), '#5a5a64')  # bracket
    if fixed:
        line(c, [(16, 6), (16, 10)], RED, 2)
        c.d.polygon([(11, 11), (21, 11), (24, 23), (8, 23)], fill=rgba(BRASS))
        c.ellipse((10, 9, 22, 15), BRASS)
        c.rect((13, 12, 14, 20), '#fff0b8')
        c.ellipse((14, 23, 18, 27), '#b8862c')
    else:       # hanging askew by one link
        line(c, [(16, 6), (18, 11)], GREY_D)
        c.d.polygon([(14, 12), (24, 14), (22, 26), (8, 21)], fill=rgba('#7a6a4a'))

def flour_bins(c, fixed):
    for x0 in (2, 16):
        c.rect((x0, 12, x0 + 13, 29), WOOD)
        c.rect((x0 + 1, 18, x0 + 12, 19), WOOD_D)
        if fixed:
            c.ellipse((x0 + 1, 7, x0 + 12, 15), '#fffaf0')
        else:
            c.rect((x0 + 1, 12, x0 + 12, 13), WOOD_D)
    if fixed:
        c.rect((24, 4, 28, 9), GREY); line(c, [(26, 9), (29, 13)], WOOD, 2)  # a scoop
    else:
        line(c, [(6, 20), (8, 24), (7, 28)], WOOD_D)  # a crack

def scrub_tiles(c, fixed):
    a, b = ('#f2dcb0', '#c0392b') if fixed else ('#9a8a70', '#6a4a3a')
    for row in range(6):
        for col in range(6):
            c.rect((1 + col * 5, 1 + row * 5, 5 + col * 5, 5 + row * 5), a if (row + col) % 2 == 0 else b)
    if fixed:
        c.px([(24, 5), (23, 6), (24, 6), (25, 6), (24, 7)], '#ffffff')
    else:
        c.ellipse((8, 10, 17, 17), '#5a4a30'); c.ellipse((18, 20, 26, 26), '#5a4a30')


FONT = {  # 3 x 5 pixel letters
    'C': ['###', '#..', '#..', '#..', '###'], 'L': ['#..', '#..', '#..', '#..', '###'],
    'O': ['###', '#.#', '#.#', '#.#', '###'], 'S': ['###', '#..', '###', '..#', '###'],
    'E': ['###', '#..', '##.', '#..', '###'], 'D': ['##.', '#.#', '#.#', '#.#', '##.'],
    'P': ['###', '#.#', '###', '#..', '#..'], 'N': ['#..#', '##.#', '#.##', '#..#', '#..#'],
}

def text(c, word, y, color):
    """Centred on the 32 px canvas, one pixel between letters."""
    width = sum(len(FONT[ch][0]) for ch in word) + len(word) - 1
    x = (32 - width) // 2
    for ch in word:
        for dy, row in enumerate(FONT[ch]):
            for dx, cell in enumerate(row):
                if cell == '#':
                    c.px([(x + dx, y + dy)], color)
        x += len(FONT[ch][0]) + 1

def mend_awning(c, fixed):
    c.rect((2, 3, 29, 5), WOOD_D)  # the bar it hangs from
    for i in range(7):
        x0 = 2 + i * 4
        color = (RED if i % 2 == 0 else CREAM) if fixed else ('#8a5a50' if i % 2 == 0 else '#b0a890')
        droop = 0 if fixed else (i * 2 if i < 4 else (6 - i) * 2)
        c.rect((x0, 6, x0 + 3, 16 + droop), color)
        if fixed:
            c.ellipse((x0, 14, x0 + 3, 19), color)  # scalloped edge
    if not fixed:
        c.d.polygon([(12, 12), (16, 12), (14, 22)], fill=(0, 0, 0, 0))  # a tear
        line(c, [(12, 12), (14, 22), (16, 12)], '#6a4a3a')

def second_oven(c, fixed):
    body, trim = ('#9ed9c3', '#6fae9b') if fixed else ('#8a8a8a', '#6a6a6a')
    c.rect((3, 8, 28, 26), body); c.rect((3, 24, 28, 26), trim)
    c.rect((6, 11, 19, 21), '#f2a040' if fixed else '#3a3a3a')  # window, glowing when it works
    if fixed:
        c.rect((7, 12, 18, 13), '#f7d774')
    for y in (12, 16, 20):
        c.px([(23, y), (24, y)], trim if fixed else GREY_D)
    c.rect((5, 27, 7, 29), trim); c.rect((24, 27, 26, 29), trim)
    if not fixed:
        line(c, [(3, 8), (9, 4)], '#e8e8f0'); line(c, [(9, 4), (12, 8)], '#e8e8f0')  # cobweb

def display_case(c, fixed):
    c.rect((2, 20, 29, 29), WOOD); c.rect((2, 20, 29, 21), WOOD_L)
    c.rect((3, 7, 28, 19), GLASS if fixed else '#b8b4a4')
    line(c, [(5, 17), (9, 9)], '#ffffff' if fixed else '#d0ccbc')
    c.rect((3, 14, 28, 14), '#c9d6de' if fixed else '#9a968a')  # shelf
    if fixed:
        c.ellipse((6, 10, 12, 13), '#e0a458'); c.ellipse((14, 9, 19, 13), '#f5a3c0')
        c.rect((15, 11, 18, 13), '#e8c07d'); c.ellipse((21, 10, 26, 13), '#c98d55')
        c.ellipse((8, 15, 14, 19), '#c17d3f'); c.ellipse((17, 15, 24, 19), '#e0a458')

def fix_lights(c, fixed):
    line(c, [(16, 0), (16, 8)] if fixed else [(16, 0), (18, 8)], GREY_D)
    shade = [(8, 16), (24, 16), (20, 8), (12, 8)]
    if not fixed:
        shade = [(x + 2, y) for x, y in shade]
    c.d.polygon(shade, fill=rgba('#4a7fb0' if fixed else '#6a7a8a'))
    if fixed:
        c.ellipse((13, 14, 19, 20), '#fff0b8')
        for a, b in [((16, 22), (16, 28)), ((10, 20), (6, 25)), ((22, 20), (26, 25))]:
            line(c, [a, b], '#f7d774')
    else:
        c.ellipse((15, 14, 21, 20), '#5a5a5a')
        line(c, [(12, 10), (15, 14)], '#3a3a3a')  # crack in the shade

def varnish_shelves(c, fixed):
    wood, edge = (WOOD_L, WOOD) if fixed else ('#8a8278', '#6a645c')
    c.rect((3, 2, 5, 29), edge); c.rect((26, 2, 28, 29), edge)
    for y in (8, 17, 26):
        c.rect((3, y, 28, y + 2), wood)
    if fixed:
        for x, y, color in [(8, 3, '#a8d8f0'), (13, 4, '#f2c94c'), (19, 3, '#e05a5a'),
                             (9, 12, '#f5a3c0'), (16, 13, '#9ed9c3'), (21, 12, '#e8c07d')]:
            c.rect((x, y, x + 3, y + 4), color); c.rect((x, y, x + 3, y), '#fffaf0')
        c.px([(7, 9), (18, 18), (24, 27)], '#fff0b8')  # varnish shine
    else:
        line(c, [(12, 17), (20, 21)], '#6a645c', 2)  # a broken plank

def window_boxes(c, fixed):
    c.rect((2, 20, 29, 28), WOOD); c.rect((2, 20, 29, 21), WOOD_L)
    c.rect((4, 18, 27, 19), '#6d4a2a')  # soil
    if fixed:
        for x in (6, 12, 18, 24):
            line(c, [(x, 18), (x, 11)], '#5aa85a')
            c.px([(x - 1, 14), (x + 1, 13)], '#5aa85a')
        for x, color in [(6, '#f27ba0'), (12, BUTTER), (18, '#fffaf0'), (24, '#f27ba0')]:
            c.ellipse((x - 2, 7, x + 2, 11), color); c.px([(x, 9)], '#f2c94c' if color != BUTTER else '#e07a3a')
    else:
        for x, bend in [(7, 3), (14, -2), (22, 2)]:
            line(c, [(x, 18), (x, 13), (x + bend, 10)], '#7a5a3a')

def repaint_sign(c, fixed):
    line(c, [(9, 1), (9, 6)] if fixed else [(9, 1), (7, 8)], GREY_D)
    line(c, [(22, 1), (22, 6)], GREY_D)
    board = [(3, 6), (28, 6), (28, 24), (3, 24)] if fixed else [(3, 8), (28, 6), (28, 24), (3, 26)]
    c.d.polygon(board, fill=rgba(BUTTER if fixed else '#a89a78'))
    if fixed:  # a painted loaf and a border
        c.d.rectangle((5, 8, 26, 22), outline=rgba(RED))
        c.ellipse((9, 11, 22, 19), '#c17d3f'); c.ellipse((10, 11, 21, 16), '#e0a458')
        for x in (12, 15, 18):
            line(c, [(x, 12), (x + 1, 14)], '#f2dcb0')
    else:
        c.rect((8, 12, 12, 16), '#8a7a5a'); c.rect((17, 15, 22, 19), '#8a7a5a')  # flaking

def cafe_table(c, fixed):
    if fixed:
        # A round table in gingham, on a pedestal, with a cup of coffee.
        c.ellipse((3, 11, 28, 18), '#fffaf0')
        c.rect((4, 15, 27, 19), '#fffaf0')
        for y in range(11, 20):
            for x in range(3, 29):
                if c.img.getpixel((x, y))[3] and ((x // 2) + (y // 2)) % 2 == 0:
                    c.px([(x, y)], '#e05a5a')
        c.rect((15, 20, 16, 27), WOOD_D); c.rect((10, 27, 21, 28), WOOD_D)
        c.rect((13, 6, 18, 11), '#fffaf0'); c.rect((14, 7, 17, 8), '#7a4a2a')
        c.px([(19, 8), (19, 9)], '#fffaf0')
    else:       # folded up and leaning, a chair stacked on it
        c.d.polygon([(6, 4), (12, 3), (16, 28), (10, 29)], fill=rgba('#9a8a70'))
        line(c, [(19, 8), (25, 28)], WOOD_D, 2); line(c, [(25, 8), (19, 28)], WOOD_D, 2)
        c.rect((18, 6, 27, 8), '#8a7a60')

def first_recipe_page(c, fixed):
    c.rect((4, 3, 27, 28), WOOD); c.rect((6, 5, 25, 26), '#f2dcb0' if fixed else '#5a4a3a')
    if fixed:
        for y in (9, 12, 15, 18):
            line(c, [(9, y), (22 if y != 18 else 17, y)], '#a8845a')
        c.ellipse((16, 17, 23, 23), '#e0a458'); c.px([(18, 19), (20, 20)], '#b07a45')  # a croissant doodle
        c.px([(9, 21), (10, 22), (11, 21)], '#e05a5a')  # a heart
    else:
        c.px([(8, 7), (8, 8), (9, 7)], '#8a7a6a')  # an empty frame, a bent corner

def reopening_day(c, fixed):
    line(c, [(9, 2), (16, 7)], GREY_D); line(c, [(22, 2), (16, 7)], GREY_D)
    c.rect((3, 8, 28, 20), '#5aa85a' if fixed else '#b0503a')
    if fixed:
        text(c, 'OPEN', 12, '#fffaf0')
        for i, color in enumerate([RED, BUTTER, '#4a7fb0', RED, BUTTER, '#4a7fb0']):  # bunting
            x = 2 + i * 5
            c.d.polygon([(x, 23), (x + 4, 23), (x + 2, 27)], fill=rgba(color))
        line(c, [(1, 23), (30, 23)], GREY_D)
    else:
        text(c, 'CLOSED', 12, '#e8d8c8')

BUILDERS = {
    'sweep-cobwebs': sweep_cobwebs, 'wash-window': wash_window, 'clear-counter': clear_counter,
    'fix-stool': fix_stool, 'patch-roof': patch_roof, 'repaint-door': repaint_door,
    'recipe-board': recipe_board, 'shop-bell': shop_bell, 'flour-bins': flour_bins,
    'scrub-tiles': scrub_tiles, 'mend-awning': mend_awning, 'second-oven': second_oven,
    'display-case': display_case, 'fix-lights': fix_lights, 'varnish-shelves': varnish_shelves,
    'window-boxes': window_boxes, 'repaint-sign': repaint_sign, 'cafe-table': cafe_table,
    'first-recipe-page': first_recipe_page, 'reopening-day': reopening_day,
}

def render(task, fixed):
    c = Canvas(); BUILDERS[task](c, fixed); c.outline()
    # A stable seed: Python's hash() changes between runs.
    return c.img if fixed else dusty(c.img, sum(map(ord, task)))

def sheet(path, tasks, scale=5):
    pad = 10; cell = 32 * scale
    out = Image.new('RGBA', (pad + 2 * (cell + pad) + 190, pad + len(tasks) * (cell + pad)), (32, 36, 44, 255))
    d = ImageDraw.Draw(out)
    for r, task in enumerate(tasks):
        y = pad + r * (cell + pad)
        for col, fixed in enumerate((False, True)):
            x = pad + col * (cell + pad)
            out.paste(Image.new('RGBA', (cell, cell), (251, 233, 201, 255)), (x, y))
            out.alpha_composite(render(task, fixed).resize((cell, cell), Image.NEAREST), (x, y))
        d.text((pad + 2 * (cell + pad), y + cell // 2 - 6), task, fill=(220, 220, 220, 255))
    out.save(path)

if __name__ == '__main__':
    sheet('shop_batch1.png', list(BUILDERS)[:10]); sheet('shop_batch2.png', list(BUILDERS)[10:]); print('ok')
