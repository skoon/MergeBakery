"""Chapter 5 chocolate line: brownies (4 tiers) and bonbons (3), 16x16."""
import os
from PIL import Image, ImageDraw
from batch7_events import Icon, WOOD, WOOD_D, WOOD_L, CREAM, WHITE, GREY, GOLD, GOLD_D, GOLD_L, SPONGE, PINK, PINK_L

CHOC, CHOC_L, CHOC_D = '#6b3a24', '#8a5238', '#4a2616'
PLUM, PLUM_L, PLUM_D = '#8a3a6a', '#b05a90', '#5a2444'

def brownie(tier):
    i = Icon()
    if tier == 1:
        i.rect(3, 6, 12, 12, CHOC); i.rect(3, 6, 12, 7, CHOC_L); i.rect(3, 11, 12, 12, CHOC_D)
        i.px([(5, 9), (8, 8), (10, 10)], CHOC_L); i.px([(4, 5), (11, 5)], WHITE)
    elif tier == 2:
        i.rect(1, 10, 14, 14, GREY); i.rect(1, 10, 14, 10, WHITE); i.rect(1, 14, 14, 14, '#9aa0a8')
        for x in (3, 7, 11): i.rect(x - 1, 5, x + 2, 9, CHOC); i.rect(x - 1, 5, x + 2, 5, CHOC_L)
    elif tier == 3:
        i.rect(2, 8, 13, 14, CHOC); i.rect(2, 8, 13, 9, CHOC_L); i.rect(2, 13, 13, 14, CHOC_D)
        i.rect(4, 4, 11, 7, CHOC_L); i.rect(4, 4, 11, 4, '#a86a4a')
        i.px([(5, 10), (8, 11), (11, 10)], CREAM); i.ell(6, 1, 9, 4, '#c0392b')
    else:
        i.rect(2, 11, 13, 14, CHOC_D); i.rect(3, 7, 12, 10, CHOC); i.rect(5, 3, 10, 6, CHOC_L)
        i.px([(7, 0), (8, 0), (7, 1), (8, 1), (7, 2), (8, 2)], GOLD)
        i.px([(4, 9), (11, 9), (6, 5), (9, 5), (3, 12), (12, 12)], GOLD_L); i.rect(2, 11, 13, 11, GOLD_D)
    return i.done()

def bonbon(tier):
    i = Icon()
    if tier == 1:
        i.ell(3, 5, 12, 13, PLUM); i.ell(4, 5, 8, 9, PLUM_L); i.px([(11, 4), (12, 4), (11, 14), (12, 14)], PLUM_D); i.px([(2, 8), (13, 9)], PLUM_D)
    elif tier == 2:
        i.rect(2, 7, 13, 14, PLUM); i.rect(2, 7, 13, 8, PLUM_L); i.rect(2, 13, 13, 14, PLUM_D)
        i.rect(7, 7, 8, 14, GOLD); i.rect(2, 10, 13, 10, GOLD); i.px([(5, 5), (6, 5), (9, 5), (10, 5), (6, 6), (9, 6)], GOLD)
    else:
        i.ell(1, 4, 14, 14, GOLD); i.rect(1, 9, 14, 12, GOLD); i.rect(1, 6, 14, 7, GOLD_L)
        i.rect(2, 12, 13, 14, GOLD_D); i.px([(5, 9), (8, 10), (11, 9)], PLUM); i.ell(6, 1, 9, 4, PLUM_L); i.px([(7, 2)], WHITE)
    return i.done()

ICONS = {'brownie': lambda: brownie(1), 'brownie-tray': lambda: brownie(2), 'chocolate-cake': lambda: brownie(3), 'chocolate-tower': lambda: brownie(4),
         'bonbon': lambda: bonbon(1), 'bonbon-box': lambda: bonbon(2), 'bonbon-tin': lambda: bonbon(3)}

if __name__ == '__main__':
    here = os.path.dirname(__file__)
    art = os.path.join(here, '..', '..', 'public', 'art')
    for name, fn in ICONS.items(): fn().save(os.path.join(art, f'{name}.png'))
    pad, scale = 12, 8
    out = Image.new('RGBA', (len(ICONS) * (16 * scale + pad) + pad, 16 * scale + pad * 2 + 14), (32, 36, 44, 255)); d = ImageDraw.Draw(out)
    for n, (name, fn) in enumerate(ICONS.items()):
        x = pad + n * (16 * scale + pad)
        out.alpha_composite(fn().resize((16 * scale, 16 * scale), Image.NEAREST), (x, pad)); d.text((x, pad + 16 * scale + 2), name, fill=(220, 220, 220, 255))
    out.save(os.path.join(here, 'choc_sheet.png')); print('ok')
