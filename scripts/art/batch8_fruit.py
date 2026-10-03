"""Chapter 3 art: the Fruit Crate (3 tiers), fruit tarts (4) and scones (3), 16x16."""
import os
from PIL import Image, ImageDraw
from batch7_events import Icon, WOOD, WOOD_D, WOOD_L, CREAM, WHITE, GREY, GOLD, GOLD_D, GOLD_L, SPONGE, SPONGE_D

RED, RED_L, RED_D = '#d94b4b', '#f08a8a', '#a8323a'
BERRY, BERRY_D = '#7a2f6e', '#5a1f50'
CRUST, CRUST_L, CRUST_D = '#d9a05c', '#f0c48a', '#a8703a'
LEAF = '#4f9b4a'

def crate(tier):
    i = Icon()
    i.rect(1, 6, 14, 14, WOOD); i.rect(1, 6, 14, 7, WOOD_L); i.rect(1, 13, 14, 14, WOOD_D)
    i.rect(1, 9, 14, 9, WOOD_D); i.px([(2, 11), (13, 11)], GOLD_D)
    for x, y in [(3, 4), (6, 3), (9, 4), (12, 4)][: 2 + tier]:
        i.ell(x - 1, y - 1, x + 1, y + 1, RED if tier < 3 else BERRY); i.px([(x - 1, y - 1)], RED_L if tier < 3 else '#b05aa0')
    if tier >= 2: i.px([(5, 5), (8, 5), (11, 5)], LEAF)
    if tier == 3:
        i.rect(5, 1, 6, 2, GOLD); i.px([(10, 2), (11, 2)], GOLD_L)     # gold trim: the best crate
        i.rect(1, 6, 14, 6, GOLD)
    return i.done()

def tart(tier):
    i = Icon()
    if tier == 1:
        i.ell(2, 6, 13, 14, CRUST); i.ell(3, 6, 12, 11, RED)
        i.px([(5, 8), (7, 7), (9, 9), (10, 8), (6, 10)], RED_L); i.rect(3, 12, 12, 13, CRUST_D)
    elif tier == 2:
        i.rect(1, 10, 14, 14, GREY); i.rect(1, 10, 14, 10, WHITE); i.rect(1, 14, 14, 14, '#9aa0a8')
        for x in (3, 7, 11):
            i.ell(x - 2, 5, x + 2, 10, CRUST); i.ell(x - 1, 5, x + 1, 8, RED); i.px([(x - 1, 6)], RED_L)
    elif tier == 3:
        i.rect(2, 9, 13, 14, CRUST); i.rect(2, 9, 13, 10, CRUST_L); i.rect(2, 13, 13, 14, CRUST_D)
        i.rect(3, 5, 12, 8, CREAM); i.rect(3, 5, 12, 5, WHITE)
        for x in (4, 7, 10): i.ell(x - 1, 2, x + 1, 5, RED); i.px([(x - 1, 2)], RED_L)
        i.px([(5, 11), (9, 12)], CRUST_D)
    else:
        i.rect(1, 11, 14, 14, CRUST_D); i.rect(1, 11, 14, 11, CRUST)
        i.rect(2, 7, 13, 10, CRUST); i.rect(2, 7, 13, 7, CRUST_L)
        i.rect(4, 4, 11, 6, RED); i.rect(4, 4, 11, 4, RED_L)
        i.px([(5, 1), (6, 2), (10, 2), (9, 1)], LEAF); i.px([(7, 2), (8, 2), (7, 3), (8, 3)], BERRY)
        i.px([(3, 9), (7, 9), (11, 9)], GOLD)
    return i.done()

def scone(tier):
    i = Icon()
    if tier == 1:
        i.ell(3, 5, 12, 13, CRUST); i.ell(4, 5, 9, 9, CRUST_L); i.rect(4, 12, 11, 13, CRUST_D)
        i.px([(6, 7), (9, 8), (7, 10)], CREAM)
    elif tier == 2:
        i.ell(1, 7, 14, 14, WOOD); i.rect(1, 10, 14, 12, WOOD); i.rect(1, 8, 14, 8, WOOD_L)
        i.ell(3, 3, 7, 8, CRUST); i.ell(8, 4, 12, 8, CRUST); i.px([(4, 4), (9, 5)], CRUST_L)
        i.line([(3, 7), (7, 5), (12, 7)], WOOD_D)
    else:
        i.rect(1, 12, 14, 14, GREY); i.rect(1, 12, 14, 12, WHITE)
        i.rect(2, 8, 6, 11, WHITE); i.rect(7, 9, 9, 12, WHITE); i.px([(3, 9), (4, 9)], '#6fae9b')   # teapot and cup
        i.px([(7, 6), (8, 6), (7, 7)], WHITE); i.px([(1, 9), (1, 10)], WHITE)
        i.ell(10, 7, 14, 11, CRUST); i.px([(11, 8)], CRUST_L); i.px([(11, 7), (12, 7)], RED)
    return i.done()

ICONS = {
    'fruit-crate-1': lambda: crate(1), 'fruit-crate-2': lambda: crate(2), 'fruit-crate-3': lambda: crate(3),
    'fruit-tart': lambda: tart(1), 'tart-tray': lambda: tart(2), 'fruit-gateau': lambda: tart(3), 'harvest-showcase': lambda: tart(4),
    'scone': lambda: scone(1), 'scone-basket': lambda: scone(2), 'cream-tea': lambda: scone(3),
}

def sheet(path, scale=8):
    pad = 12
    w = len(ICONS) * (16 * scale + pad) + pad
    out = Image.new('RGBA', (w, 16 * scale + pad * 2 + 14), (32, 36, 44, 255)); d = ImageDraw.Draw(out)
    for n, (name, fn) in enumerate(ICONS.items()):
        x = pad + n * (16 * scale + pad)
        out.alpha_composite(fn().resize((16 * scale, 16 * scale), Image.NEAREST), (x, pad))
        d.text((x, pad + 16 * scale + 2), name, fill=(220, 220, 220, 255))
    out.save(path)

if __name__ == '__main__':
    here = os.path.dirname(__file__)
    art = os.path.join(here, '..', '..', 'public', 'art')
    for name, fn in ICONS.items():
        fn().save(os.path.join(art, f'{name}.png'))
    sheet(os.path.join(here, 'fruit_sheet.png'))
    print('ok', len(ICONS))
