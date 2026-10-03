"""Wren, the MegaBun spy who secretly loves the bakery's scones (Phase 8)."""
import os
from PIL import Image
from portraits import Canvas, rgba, shaded_head, face, EXPRESSIONS

def wren(expression):
    c = Canvas()
    c.ellipse((3, 23, 28, 42), '#7a6a52')              # trench coat
    c.px([(15, 25), (15, 26), (16, 27), (15, 28), (16, 29), (15, 30)], '#5c4e3a')  # coat seam
    c.rect((13, 19, 18, 24), '#d9a878')
    c.px([(12, 24), (13, 25), (18, 25), (19, 24)], '#e8873a')  # a MegaBun-orange lanyard peeking out
    c.px([(14, 26), (17, 26), (15, 27), (16, 27)], '#e8873a')
    shaded_head(c, '#f0c8a0', '#d9a878')
    c.ellipse((6, 3, 25, 9), '#4a4a52')                # fedora crown
    c.rect((4, 8, 27, 9), '#33333a')                   # brim
    c.rect((7, 6, 24, 7), '#c0392b')                   # hat band
    face(c, expression, None)
    c.rect((10, 11, 21, 13), '#2a2a30')                # sunglasses, over the eyes
    c.px([(15, 12), (16, 12)], '#2a2a30')
    c.outline(); return c.img

CHARACTERS = {'wren': wren}

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'art')
    for name, fn in CHARACTERS.items():
        for e in EXPRESSIONS:
            fn(e).save(os.path.join(out, f'portrait-{name}-{e}.png'))
    print('ok')
