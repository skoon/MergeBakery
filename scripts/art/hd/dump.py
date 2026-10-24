"""Print original 16x16 icons as letter grids with a hex legend ('#' = ink, '.' = clear)."""
import sys
from PIL import Image
for n in sys.argv[1:]:
    im = Image.open(f'public/art/{n}.png').convert('RGBA')
    keys, rows = {}, []
    for y in range(16):
        r = ''
        for x in range(16):
            p = im.getpixel((x, y))
            h = '#%02x%02x%02x' % p[:3]
            r += '.' if not p[3] else '#' if h == '#3a2414' else keys.setdefault(h, 'abcdefghijklmnop'[len(keys)])
        rows.append(r)
    print(n, ' '.join(f'{k}={h}' for h, k in keys.items()))
    print('\n'.join(rows))
