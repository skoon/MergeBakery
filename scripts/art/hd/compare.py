"""Old 16x16 (top) vs new 32x32 (bottom) at the same display size, for review."""
import sys
from PIL import Image
out, names = sys.argv[1], sys.argv[2:]
S, P = 128, 12
img = Image.new('RGBA', (len(names) * (S + P) + P, 2 * S + 3 * P), (40, 44, 52, 255))
for i, n in enumerate(names):
    x = P + i * (S + P)
    for row, path in enumerate([f'public/art/{n}.png', f'scripts/art/hd/out/sprites/{n}.png']):
        img.alpha_composite(Image.open(path).convert('RGBA').resize((S, S), Image.NEAREST), (x, P + row * (S + P)))
img.save(out)
