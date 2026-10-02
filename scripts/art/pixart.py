"""Tiny pixel-art helper: 16x16 grids of palette letters -> PNGs and an 8x review sheet."""
from PIL import Image, ImageDraw

INK = '#3a2414'

def hex_rgba(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

def check(name, rows):
    assert len(rows) == 16, f'{name}: {len(rows)} rows'
    for i, r in enumerate(rows):
        assert len(r) == 16, f'{name} row {i}: {len(r)} chars {r!r}'

def to_image(rows, legend):
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == '.':
                continue
            img.putpixel((x, y), hex_rgba(INK if ch == 'o' else legend[ch]))
    return img

def overlay(base, top, dx=0, dy=0):
    """Paint `top` (list of strings, '.' transparent) onto `base` at (dx, dy)."""
    out = [list(r) for r in base]
    for y, r in enumerate(top):
        for x, ch in enumerate(r):
            if ch != '.' and 0 <= y + dy < 16 and 0 <= x + dx < 16:
                out[y + dy][x + dx] = ch
    return [''.join(r) for r in out]

def sheet(icons, path, scale=8):
    """icons: list of (name, rows, legend). Renders them side by side on a dark ground with labels."""
    pad = 16
    w = len(icons) * (16 * scale + pad) + pad
    h = 16 * scale + pad * 2 + 14
    img = Image.new('RGBA', (w, h), (32, 36, 44, 255))
    d = ImageDraw.Draw(img)
    for i, (name, rows, legend) in enumerate(icons):
        check(name, rows)
        tile = to_image(rows, legend).resize((16 * scale, 16 * scale), Image.NEAREST)
        x = pad + i * (16 * scale + pad)
        img.alpha_composite(tile, (x, pad))
        d.text((x, pad + 16 * scale + 4), name, fill=(220, 220, 220, 255))
    img.save(path)

def save_pngs(icons, art_dir):
    for name, rows, legend in icons:
        check(name, rows)
        to_image(rows, legend).save(f'{art_dir}/{name}.png')
