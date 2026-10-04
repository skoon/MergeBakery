"""Board overlays: cobweb (over a stuck item), crate and flour-sack locks, 16x16."""
import os, math
from PIL import Image
from pixart import hex_rgba, INK

def web():
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    W, G = hex_rgba('#ffffff'), hex_rgba('#b8c0cc')
    c = 7.5
    for k in range(8):  # spokes
        a = k * math.pi / 4
        for r in range(0, 9):
            x, y = round(c + r * math.cos(a)), round(c + r * math.sin(a))
            if 0 <= x < 16 and 0 <= y < 16: img.putpixel((x, y), W)
    for r in (2.6, 5.2, 7.6):  # rings, sagging between spokes
        for k in range(8):
            a0, a1 = k * math.pi / 4, (k + 1) * math.pi / 4
            for t in range(7):
                a = a0 + (a1 - a0) * t / 6
                rr = r * (1 - 0.12 * math.sin(math.pi * t / 6))
                x, y = round(c + rr * math.cos(a)), round(c + rr * math.sin(a))
                if 0 <= x < 16 and 0 <= y < 16 and img.getpixel((x, y))[3] == 0: img.putpixel((x, y), G)
    return img

LEG = {'o': INK, 'w': '#c98a4b', 'l': '#e0a869', 'd': '#8a5a2c', 'n': '#d8d8d8',
       's': '#e9d9a8', 't': '#c9b27a', 'r': '#c0392b', 'k': '#fff6e6'}

def grid(rows):
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        assert len(r) == 16, (y, r)
        for x, ch in enumerate(r):
            if ch != '.': img.putpixel((x, y), hex_rgba(LEG[ch]))
    return img

CRATE = grid([
    '................',
    '.oooooooooooooo.',
    '.olllllllllllllo'[:16],
    '.owwwwwwwwwwwwo.',
    '.odwwwwwwwwwwdo.',
    '.ooooooooooooo..'[:16],
    '.onwlllllllwnwo.'[:16],
    '.owdwwwwwwdwwwo.'[:16],
    '.owwdwwwwdwwwwo.'[:16],
    '.owwwdwwdwwwwwo.'[:16],
    '.owwwwddwwwwwwo.'[:16],
    '.owwwdwwdwwwwwo.'[:16],
    '.owwdwwwwdwwwwo.'[:16],
    '.odwwwwwwwwwwdo.'[:16],
    '.oooooooooooooo.',
    '................',
])

SACK = grid([
    '................',
    '.....oo..oo.....',
    '......oooo......',
    '.....orrrro.....',
    '....oottttoo....',
    '...ossssssttoo..',
    '..osskkkkkkstto.',
    '..osskkkkkkstto.',
    '..osskkkkkkstto.',
    '..osssskkksstto.',
    '..ossssssssstto.',
    '..ossssssssstto.',
    '..ottsssssstto..',
    '...ottttttttoo..',
    '....oooooooooo..',
    '................',
])

ICONS = {'cobweb': web(), 'lock-crate': CRATE, 'lock-sack': SACK}
if __name__ == '__main__':
    art = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'art')
    for n, im in ICONS.items(): im.save(os.path.join(art, f'{n}.png'))
    sheet = Image.new('RGBA', (3 * 136 + 8, 144), (110, 80, 50, 255))
    for i, im in enumerate(ICONS.values()): sheet.alpha_composite(im.resize((128, 128), Image.NEAREST), (8 + i * 136, 8))
    sheet.save(os.path.join(os.path.dirname(__file__), 'locks_sheet.png')); print('ok')
