"""Tray buttons: three 16x16 nine-slice plates (cream, butter, strawberry) and the Pantry icon."""
import os
from PIL import Image
from pixart import hex_rgba, INK

def plate(fill, light, shade):
    """Rounded plate: ink outline, light top-left bevel, shade bottom-right. Corners 4px, so slice = 4."""
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    f, l, s, o = hex_rgba(fill), hex_rgba(light), hex_rgba(shade), hex_rgba(INK)
    for y in range(16):
        for x in range(16):
            cx, cy = min(x, 15 - x), min(y, 15 - y)  # distance to the nearest edge
            if cx < 2 and cy < 2 and cx + cy < 1:
                continue  # clipped corner pixel
            edge = min(cx, cy)
            if edge == 0 or (cx + cy <= 1 and (cx < 2 and cy < 2)):
                img.putpixel((x, y), o)
            elif edge == 1:
                img.putpixel((x, y), l if (x < 8 and y < 8) or x < 2 and y < 14 or y < 2 and x < 14 else s)
            else:
                img.putpixel((x, y), f)
    return img

LEG = {'o': INK, 'w': '#c98a4b', 'l': '#e0a869', 'd': '#8a5a2c',
       'r': '#c0392b', 'b': '#7fb8d8', 'y': '#f7d774', 'g': '#9ed9c3', 'p': '#f27ba0'}
PANTRY = [
    '................',
    '..oooooooooooo..',
    '..olllllllllllo.'[:16],
    '..owwwwwwwwwwwo.'[:16],
    '..owobbowyyowo..'[:16],
    '..owobbowyyowo..'[:16],
    '..owooooooooow..'[:16],
    '..owwwwwwwwwwwo.'[:16],
    '..owgggowpppowo.'[:16],
    '..owgggowpppowo.'[:16],
    '..owooooooooow..'[:16],
    '..owwwwwwwwwwwo.'[:16],
    '..odwwwwwwwwwdo.'[:16],
    '..oooooooooooo..',
    '..od........do..',
    '................',
]
def grid(rows):
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        assert len(r) == 16, (y, r)
        for x, ch in enumerate(r):
            if ch != '.': img.putpixel((x, y), hex_rgba(LEG[ch]))
    return img

ICONS = {
    'button-plate': plate('#fff6e6', '#ffffff', '#e8d4b0'),
    'button-plate-butter': plate('#f7d774', '#fff0a8', '#d9b24c'),
    'button-plate-red': plate('#f27ba0', '#ffa8c4', '#c85a80'),
    'btn-pantry': grid(PANTRY),
}
if __name__ == '__main__':
    here = os.path.dirname(__file__); art = os.path.join(here, '..', '..', 'public', 'art')
    for n, im in ICONS.items(): im.save(os.path.join(art, f'{n}.png'))
    names = list(ICONS) + ['brick-oven', 'coin-pouch']
    sheet = Image.new('RGBA', (len(names) * 136 + 8, 144), (110, 80, 50, 255))
    for i, n in enumerate(names):
        im = ICONS.get(n) or Image.open(os.path.join(art, n + '.png')).convert('RGBA')
        sheet.alpha_composite(im.resize((128, 128), Image.NEAREST), (8 + i * 136, 8))
    sheet.save(os.path.join(here, 'buttons_sheet.png')); print('ok')
