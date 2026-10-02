"""The Corner Shop backdrop (96 x 128), and a preview of the Bakery screen."""
import json
from PIL import Image, ImageDraw
from portraits import rgba
from shop import render

def corner_shop():
    img = Image.new('RGBA', (96, 128), rgba('#fbe9c9'))
    d = ImageDraw.Draw(img)
    for x in range(4, 96, 8):                      # wallpaper stripes
        d.line([(x, 10), (x, 84)], fill=rgba('#f3dcb4'))
    for x in range(8, 96, 16):                     # small wallpaper flowers
        for y in range(20, 80, 16):
            d.point((x + (y // 16) % 2 * 8, y), fill=rgba('#f2b8c4'))
    d.rectangle((0, 0, 95, 7), fill=rgba('#9c5b2e'))   # ceiling beam
    d.rectangle((0, 8, 95, 9), fill=rgba('#6d3d1d'))
    for x in (14, 46, 78):                          # beam ends
        d.rectangle((x, 0, x + 3, 9), fill=rgba('#6d3d1d'))
    d.rectangle((0, 76, 95, 89), fill=rgba('#c98d55'))  # wainscot
    d.line([(0, 76), (95, 76)], fill=rgba('#9c5b2e'))
    for x in range(6, 96, 18):
        d.rectangle((x, 79, x + 12, 86), outline=rgba('#b07a45'))
    d.rectangle((0, 90, 95, 127), fill=rgba('#b07a45'))  # floorboards
    for y in range(94, 128, 6):
        d.line([(0, y), (95, y)], fill=rgba('#9c6a3a'))
    for i, y in enumerate(range(90, 128, 6)):
        for x in range((i % 2) * 12 + 6, 96, 24):
            d.line([(x, y), (x, y + 5)], fill=rgba('#9c6a3a'))
    return img

def preview(path, fixed, scale=4):
    chapter = json.load(open('/mnt/d/source/MergeBakery/src/data/chapter1.json'))
    w, h = 96 * scale, 128 * scale
    base = Image.new('RGBA', (w, h), rgba('#fff6e6'))
    faded = corner_shop().resize((w, h), Image.NEAREST)
    faded.putalpha(int(255 * 0.35))                 # the view draws the scene at 35%
    base.alpha_composite(faded)
    size = round(w * 0.22)
    for task in chapter['tasks']:
        sprite = render(task['id'], fixed).resize((size, size), Image.NEAREST)
        x = round(task['spot']['x'] * w - size / 2); y = round(task['spot']['y'] * h - size / 2)
        base.alpha_composite(sprite, (max(0, x), max(0, y)))
    base.save(path)

if __name__ == '__main__':
    corner_shop().resize((96 * 4, 128 * 4), Image.NEAREST).save('scene_full.png')
    preview('bakery_before.png', False); preview('bakery_after.png', True)
    a, b, s = Image.open('bakery_before.png'), Image.open('bakery_after.png'), Image.open('scene_full.png')
    out = Image.new('RGBA', (s.width * 3 + 40, s.height + 20), (32, 36, 44, 255))
    for i, im in enumerate((s, a, b)):
        out.alpha_composite(im, (10 + i * (s.width + 10), 10))
    out.save('bakery_preview.png'); print('ok')
