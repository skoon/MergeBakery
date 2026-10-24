"""Every item: original 16x16 beside the 32x32 redraw, same display size, labeled. Writes out/review-all.png."""
import json
from PIL import Image, ImageDraw
keys = [i['spriteKey'] for i in json.load(open('src/data/items.json'))['items']]
S, P, C, L = 96, 10, 6, 14
cw = 2 * S + P * 3
rows = (len(keys) + C - 1) // C
img = Image.new('RGBA', (C * cw + P, rows * (S + L + P) + P), (40, 44, 52, 255))
d = ImageDraw.Draw(img)
for n, k in enumerate(keys):
    x, y = P + (n % C) * cw, P + (n // C) * (S + L + P)
    for j, path in enumerate([f'public/art/{k}.png', f'scripts/art/hd/out/sprites/{k}.png']):
        img.alpha_composite(Image.open(path).convert('RGBA').resize((S, S), Image.NEAREST), (x + j * (S + P // 2), y))
    d.text((x, y + S + 1), k, fill=(220, 220, 220, 255))
img.save('scripts/art/hd/out/review-all.png')
