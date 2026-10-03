"""Phase 8 event art: five event generators and their products, 16x16 (1 px ink outline, highlight top-left)."""
import os
from PIL import Image, ImageDraw
from pixart import INK, hex_rgba

class Icon:
    def __init__(self):
        self.img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
    def rect(self, x0, y0, x1, y1, c): self.d.rectangle((x0, y0, x1, y1), fill=hex_rgba(c))
    def ell(self, x0, y0, x1, y1, c): self.d.ellipse((x0, y0, x1, y1), fill=hex_rgba(c))
    def px(self, pts, c):
        for x, y in pts:
            if 0 <= x < 16 and 0 <= y < 16: self.img.putpixel((x, y), hex_rgba(c))
    def line(self, pts, c): self.d.line(pts, fill=hex_rgba(c))
    def done(self):
        src = self.img.copy()
        for y in range(16):
            for x in range(16):
                if src.getpixel((x, y))[3]: continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < 16 and 0 <= ny < 16 and src.getpixel((nx, ny))[3]:
                        self.img.putpixel((x, y), hex_rgba(INK)); break
        return self.img

PINK, PINK_L, PINK_D = '#e0457b', '#f58aae', '#b02e5c'
BLUE, BLUE_L, BLUE_D = '#2f9fc9', '#7fd0ee', '#1f7a9c'
PURP, PURP_L, PURP_D = '#7b4fc4', '#a98ae6', '#5a3796'
GOLD, GOLD_L, GOLD_D = '#c9a24a', '#e8cd85', '#9a7a2e'
GREEN, GREEN_L, GREEN_D = '#3fae6a', '#8edba6', '#2b8450'
CREAM, WOOD, WOOD_D, WOOD_L = '#fff4d6', '#a8703a', '#7a4f26', '#c99a55'
SPONGE, SPONGE_D = '#f0cf8a', '#cfa75a'
WHITE, GREY = '#ffffff', '#c8ccd2'

# ─── Event generators ──────────────────────────────────────────────────────
def contest_mixer():
    i = Icon()
    i.rect(5, 2, 12, 5, PINK); i.rect(5, 2, 8, 3, PINK_L)       # mixer head
    i.rect(12, 3, 13, 4, PINK_D)
    i.rect(8, 6, 9, 9, GREY)                                     # beater
    i.px([(7, 9), (10, 9), (7, 10), (10, 10)], GREY)
    i.ell(3, 8, 13, 14, CREAM); i.rect(4, 8, 12, 9, CREAM)       # bowl
    i.px([(4, 10), (4, 11), (5, 12)], WHITE); i.rect(5, 13, 11, 13, SPONGE_D)
    i.rect(3, 14, 13, 14, PINK_D)                                # base
    return i.done()

def fair_cart():
    i = Icon()
    for k, x in enumerate(range(2, 14, 2)):                       # striped awning
        i.rect(x, 2, x + 1, 5, BLUE if k % 2 == 0 else WHITE)
    i.rect(2, 2, 3, 3, BLUE_L)
    i.px([(2, 6), (4, 6), (6, 6), (8, 6), (10, 6), (12, 6)], BLUE_D)
    i.rect(3, 7, 12, 11, WOOD); i.rect(3, 7, 12, 8, WOOD_L)       # counter
    i.rect(3, 11, 12, 11, WOOD_D)
    i.px([(5, 6), (9, 6)], WOOD_D)
    i.ell(2, 11, 6, 15, GREY); i.ell(9, 11, 13, 15, GREY)         # wheels
    i.px([(4, 13), (11, 13)], WOOD_D)
    return i.done()

def taste_table():
    i = Icon()
    i.ell(3, 2, 12, 9, GREY); i.rect(4, 3, 7, 4, WHITE)           # cloche dome
    i.px([(7, 1), (8, 1)], GREY)
    i.rect(2, 9, 13, 10, PURP); i.rect(2, 9, 6, 9, PURP_L)        # cloth top
    i.rect(3, 11, 12, 12, PURP_D)                                 # hanging cloth
    i.px([(4, 12), (7, 12), (10, 12)], PURP)
    i.rect(3, 13, 4, 14, WOOD_D); i.rect(11, 13, 12, 14, WOOD_D)  # legs
    return i.done()

def stash():
    i = Icon()
    i.rect(2, 7, 13, 14, WOOD); i.rect(2, 7, 13, 8, WOOD_L)       # chest body
    i.rect(2, 12, 13, 14, WOOD_D)
    i.ell(2, 3, 13, 9, WOOD_L); i.rect(2, 6, 13, 7, WOOD)         # lid
    i.rect(2, 7, 13, 7, GOLD_D)
    i.rect(7, 8, 8, 10, GOLD); i.px([(7, 9), (8, 9)], GOLD_D)     # lock
    i.px([(4, 2), (5, 1), (6, 2)], CREAM)                         # a puff of flour from the lid
    return i.done()

def sale_table():
    i = Icon()
    i.rect(2, 1, 13, 4, GREEN); i.rect(2, 1, 5, 2, GREEN_L)       # banner
    i.px([(4, 3), (7, 3), (10, 3)], WHITE)
    i.rect(1, 7, 14, 8, WOOD_L); i.rect(1, 8, 14, 8, WOOD)        # tabletop
    i.rect(3, 9, 4, 14, WOOD_D); i.rect(11, 9, 12, 14, WOOD_D)    # legs
    i.rect(5, 5, 7, 7, GREEN_D); i.px([(5, 5), (6, 5)], GREEN_L)  # jar
    i.ell(9, 4, 12, 7, SPONGE); i.px([(10, 5)], WHITE)            # bun
    return i.done()

# ─── Showpiece cake (Bake-Off) ─────────────────────────────────────────────
def sprinkles():
    i = Icon()
    i.rect(4, 4, 11, 13, CREAM); i.rect(4, 4, 5, 13, WHITE)       # jar
    i.rect(4, 2, 11, 3, PINK_D)                                   # lid
    for p, c in [((6, 8), PINK), ((8, 7), BLUE), ((9, 10), '#f2c94c'), ((6, 11), GREEN), ((10, 8), PINK_L), ((7, 9), PURP)]:
        i.px([p], c)
    return i.done()

def frosting_swirl():
    i = Icon()
    i.ell(4, 10, 11, 14, PINK); i.ell(5, 7, 10, 11, PINK_L)
    i.ell(6, 4, 9, 8, PINK); i.px([(7, 2), (8, 3), (7, 3)], PINK_L)
    i.px([(5, 12), (7, 13)], PINK_D)
    i.rect(2, 14, 13, 14, CREAM)
    return i.done()

def sponge_layer():
    i = Icon()
    i.ell(1, 5, 14, 13, SPONGE); i.rect(1, 9, 14, 9, SPONGE)
    i.ell(1, 4, 14, 8, '#f9e3b0')                                 # top
    i.rect(2, 9, 13, 12, SPONGE); i.rect(3, 12, 12, 13, SPONGE_D)
    i.px([(5, 7), (9, 6), (11, 8)], SPONGE_D)
    return i.done()

def tiered_cake():
    i = Icon()
    i.rect(2, 9, 13, 14, PINK); i.rect(2, 9, 13, 10, PINK_L); i.rect(2, 13, 13, 14, PINK_D)
    i.rect(4, 4, 11, 8, PINK); i.rect(4, 4, 11, 5, PINK_L); i.rect(4, 7, 11, 8, PINK_D)
    i.px([(3, 11), (6, 12), (9, 11), (12, 12)], WHITE)
    i.px([(5, 6), (8, 6)], WHITE)
    i.rect(7, 2, 8, 3, '#c0392b')                                  # cherry
    return i.done()

def showstopper_cake():
    i = Icon()
    i.rect(1, 10, 14, 14, PINK); i.rect(1, 10, 14, 11, PINK_L); i.rect(1, 13, 14, 14, PINK_D)
    i.rect(3, 6, 12, 9, '#f58aae'); i.rect(3, 6, 12, 7, '#ffc0d6'); i.rect(3, 8, 12, 9, PINK)
    i.rect(5, 3, 10, 5, PINK); i.rect(5, 3, 10, 3, PINK_L)
    i.px([(2, 12), (5, 12), (8, 12), (11, 12), (13, 12), (4, 8), (7, 8), (10, 8)], WHITE)
    i.px([(7, 0), (8, 0), (6, 1), (7, 1), (8, 1), (9, 1), (7, 2), (8, 2)], '#f2c94c')  # star topper
    return i.done()

# ─── Fair goods (Street Fair) ──────────────────────────────────────────────
def fair_flyer():
    i = Icon()
    i.rect(4, 2, 11, 13, WHITE); i.rect(4, 2, 5, 13, '#eef6fa')
    i.rect(5, 4, 10, 5, BLUE); i.rect(5, 7, 10, 7, GREY); i.rect(5, 9, 9, 9, GREY); i.rect(5, 11, 8, 11, GREY)
    i.px([(10, 12), (11, 13)], BLUE_D)
    return i.done()

def fair_sample():
    i = Icon()
    i.rect(1, 9, 14, 12, GREY); i.rect(1, 9, 14, 9, WHITE); i.rect(1, 12, 14, 12, '#9aa0a8')
    for x, c in [(3, SPONGE), (6, PINK), (9, GOLD_L), (12, GREEN_L)]:
        i.rect(x - 1, 6, x + 1, 8, c); i.px([(x - 1, 6)], WHITE)
    i.px([(3, 4), (6, 3), (9, 4)], BLUE_L)                         # steam of freshness
    return i.done()

def fair_banner():
    i = Icon()
    i.line([(0, 3), (7, 6), (15, 3)], '#7a4f26')
    for x, c in [(2, BLUE), (5, WHITE), (8, BLUE), (11, WHITE), (13, BLUE)]:
        i.px([(x, 5), (x + 1, 5), (x, 6), (x + 1, 6), (x, 7), (x + 1, 7), (x, 8), (x + 1, 8)], c)
        i.px([(x, 8)], c)
    i.px([(8, 9), (9, 9), (8, 10)], BLUE)
    return i.done()

def fair_stall():
    i = Icon()
    i.rect(2, 2, 13, 8, BLUE); i.rect(2, 2, 13, 3, BLUE_L); i.rect(2, 7, 13, 8, BLUE_D)
    i.rect(4, 4, 11, 6, WHITE); i.px([(5, 5), (7, 5), (9, 5)], BLUE_D)
    i.rect(7, 9, 8, 14, WOOD_D)                                    # post
    i.rect(5, 14, 10, 14, WOOD)
    return i.done()

# ─── Tasting plates (Blind Taste Test) ─────────────────────────────────────
def taster_spoon():
    i = Icon()
    i.ell(3, 3, 9, 8, GREY); i.px([(4, 4), (5, 4)], WHITE)
    i.ell(4, 4, 8, 7, PURP_L)                                      # a dab of cream
    i.line([(8, 8), (13, 13)], GREY); i.line([(9, 8), (14, 13)], '#9aa0a8')
    return i.done()

def taster_plate():
    i = Icon()
    i.ell(1, 6, 14, 13, WHITE); i.ell(3, 7, 12, 11, '#eef2f6')
    i.ell(5, 7, 10, 10, PURP); i.px([(6, 7), (7, 7)], PURP_L)
    i.px([(10, 9), (11, 9)], GOLD)
    return i.done()

def taster_flight():
    i = Icon()
    for x, c in [(1, PURP), (6, PINK), (11, GOLD)]:
        i.rect(x, 4, x + 3, 11, GREY); i.rect(x + 1, 6, x + 2, 10, c)
        i.px([(x, 4), (x, 5)], WHITE)
    i.rect(0, 12, 15, 14, WOOD); i.rect(0, 12, 15, 12, WOOD_L)
    return i.done()

def judges_platter():
    i = Icon()
    i.ell(2, 2, 13, 11, GREY); i.rect(2, 7, 13, 11, GREY)
    i.ell(3, 3, 7, 6, WHITE)
    i.rect(1, 11, 14, 13, '#9aa0a8'); i.rect(1, 11, 14, 11, WHITE)
    i.px([(7, 1), (8, 1)], GOLD); i.px([(6, 12), (7, 12), (8, 12), (9, 12)], PURP)   # ribbon
    i.px([(7, 13), (8, 14)], PURP_D)
    return i.done()

# ─── Stash goods (Flour Shortage) ──────────────────────────────────────────
def stash_flour():
    i = Icon()
    i.rect(5, 5, 10, 13, CREAM); i.rect(5, 5, 6, 13, WHITE); i.rect(9, 5, 10, 13, '#e6d9b0')
    i.rect(5, 3, 10, 4, GOLD); i.px([(6, 2), (9, 2)], GOLD_D)
    i.rect(6, 8, 9, 9, GOLD_D)
    return i.done()

def stash_sack():
    i = Icon()
    i.ell(2, 4, 13, 14, CREAM); i.rect(3, 4, 12, 7, CREAM)
    i.ell(3, 5, 6, 9, WHITE)
    i.rect(5, 2, 10, 4, GOLD); i.px([(4, 3), (11, 3)], GOLD_D)
    i.px([(7, 8), (8, 8), (7, 9), (8, 9), (7, 10), (8, 10)], GOLD_D)
    return i.done()

def stash_crate():
    i = Icon()
    i.rect(1, 3, 14, 13, WOOD); i.rect(1, 3, 14, 4, WOOD_L); i.rect(1, 12, 14, 13, WOOD_D)
    i.rect(1, 7, 14, 8, WOOD_D)
    i.px([(2, 5), (13, 5), (2, 11), (13, 11)], GOLD)
    i.rect(5, 1, 10, 3, CREAM)                                     # flour heaped on top
    return i.done()

def stash_reserve():
    i = Icon()
    i.ell(2, 1, 13, 14, WOOD); i.rect(2, 4, 13, 11, WOOD)
    i.rect(2, 4, 4, 11, WOOD_L); i.rect(11, 4, 13, 11, WOOD_D)
    i.rect(2, 4, 13, 5, GOLD_D); i.rect(2, 10, 13, 11, GOLD_D)     # hoops
    i.rect(5, 2, 10, 3, CREAM)
    return i.done()

# ─── Sale goods (Charity Bake Sale) ────────────────────────────────────────
def sale_bun():
    i = Icon()
    i.ell(2, 5, 13, 13, SPONGE); i.ell(3, 5, 8, 9, '#f9e3b0')
    i.px([(5, 7), (8, 6), (10, 8), (7, 10)], WHITE)
    i.rect(3, 12, 12, 13, SPONGE_D)
    return i.done()

def sale_box():
    i = Icon()
    i.rect(2, 5, 13, 13, GREEN); i.rect(2, 5, 13, 6, GREEN_L); i.rect(2, 12, 13, 13, GREEN_D)
    i.rect(7, 5, 8, 13, WHITE)                                     # ribbon
    i.px([(5, 3), (6, 3), (6, 4), (9, 3), (10, 3), (9, 4)], WHITE)
    return i.done()

def sale_hamper():
    i = Icon()
    i.ell(1, 6, 14, 14, WOOD); i.rect(1, 9, 14, 12, WOOD)
    i.rect(1, 7, 14, 8, WOOD_L); i.px([(3, 10), (6, 11), (9, 10), (12, 11)], WOOD_D)
    i.line([(3, 6), (7, 1), (12, 6)], '#7a4f26')                    # handle
    i.px([(5, 5), (6, 4)], GREEN); i.px([(9, 5), (10, 5)], PINK)
    return i.done()

def sale_raffle_cake():
    i = Icon()
    i.rect(2, 7, 13, 13, GREEN); i.rect(2, 7, 13, 8, GREEN_L); i.rect(2, 12, 13, 13, GREEN_D)
    i.rect(3, 4, 12, 6, WHITE); i.px([(4, 5), (7, 5), (10, 5)], PINK)
    i.rect(10, 0, 14, 3, '#f2c94c'); i.px([(11, 1), (12, 1), (13, 2)], GOLD_D)   # raffle ticket
    return i.done()

ICONS = {
    'contest-mixer-1': contest_mixer, 'sprinkles': sprinkles, 'frosting-swirl': frosting_swirl,
    'sponge-layer': sponge_layer, 'tiered-cake': tiered_cake, 'showstopper-cake': showstopper_cake,
    'fair-cart-1': fair_cart, 'fair-flyer': fair_flyer, 'fair-sample': fair_sample,
    'fair-banner': fair_banner, 'fair-stall': fair_stall,
    'taste-table-1': taste_table, 'taster-spoon': taster_spoon, 'taster-plate': taster_plate,
    'taster-flight': taster_flight, 'judges-platter': judges_platter,
    'stash-1': stash, 'stash-flour': stash_flour, 'stash-sack': stash_sack,
    'stash-crate': stash_crate, 'stash-reserve': stash_reserve,
    'sale-table-1': sale_table, 'sale-bun': sale_bun, 'sale-box': sale_box,
    'sale-hamper': sale_hamper, 'sale-raffle-cake': sale_raffle_cake,
}

def sheet(path, scale=8):
    pad, cols = 12, 7
    rows = (len(ICONS) + cols - 1) // cols
    w = cols * (16 * scale + pad) + pad
    h = rows * (16 * scale + pad + 14) + pad
    out = Image.new('RGBA', (w, h), (32, 36, 44, 255)); d = ImageDraw.Draw(out)
    for n, (name, fn) in enumerate(ICONS.items()):
        x = pad + (n % cols) * (16 * scale + pad); y = pad + (n // cols) * (16 * scale + pad + 14)
        out.alpha_composite(fn().resize((16 * scale, 16 * scale), Image.NEAREST), (x, y))
        d.text((x, y + 16 * scale + 2), name, fill=(220, 220, 220, 255))
    out.save(path)

if __name__ == '__main__':
    here = os.path.dirname(__file__)
    art = os.path.join(here, '..', '..', 'public', 'art')
    for name, fn in ICONS.items():
        fn().save(os.path.join(art, f'{name}.png'))
    sheet(os.path.join(here, 'events_sheet.png'))
    print('ok', len(ICONS))
