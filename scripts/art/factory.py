"""Rise & Shine Factory renovation art (Chapter 5): the 96 x 128 backdrop and 20 objects,
each drawn once with a `fixed` flag like the other chapters. Slugs match chapter5.json."""
import json, os
from PIL import Image, ImageDraw
from portraits import Canvas, rgba
from shop import WOOD, WOOD_L, WOOD_D, CREAM, BUTTER, RED, GREY, GREY_D, GLASS, BRASS, line, dusty

STEEL, STEEL_L, STEEL_D = '#b8c4d0', '#dce6ee', '#7a8896'
BRICK, BRICK_D = '#a85a48', '#7a3a2e'
CHOC, CHOC_L, CHOC_D = '#6b3a24', '#8a5238', '#4a2616'
HAZ, GREEN, BLUE, ORANGE = '#f2c94c', '#4f9b4a', '#3a78b8', '#f2a03a'

# ─── Backdrop ──────────────────────────────────────────────────────────────

def factory():
    img = Image.new('RGBA', (96, 128), rgba('#cfd8e0'))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 95, 50), fill=rgba(BRICK))                      # brick wall
    for y in range(0, 51, 4):
        d.line([(0, y), (95, y)], fill=rgba(BRICK_D))
        for x in range((y // 4 % 2) * 5, 96, 10):
            d.line([(x, y), (x, y + 3)], fill=rgba(BRICK_D))
    for x in (8, 38, 68):                                              # tall factory windows
        d.rectangle((x, 8, x + 17, 34), fill=rgba('#6a7a88'))
        d.rectangle((x + 1, 9, x + 16, 33), fill=rgba('#bfe0ec'))
        d.line([(x + 8, 9), (x + 8, 33)], fill=rgba('#6a7a88')); d.line([(x + 1, 21), (x + 16, 21)], fill=rgba('#6a7a88'))
    d.rectangle((0, 0, 95, 5), fill=rgba('#5a6672'))                   # roof girders
    for x in range(0, 96, 16):
        d.line([(x, 5), (x + 8, 12)], fill=rgba('#7a8896')); d.line([(x + 16, 5), (x + 8, 12)], fill=rgba('#7a8896'))
    d.rectangle((0, 51, 95, 54), fill=rgba(STEEL_D))
    d.rectangle((0, 55, 95, 127), fill=rgba('#9aa4ae'))                # concrete floor
    for y in range(55, 128, 12):
        d.line([(0, y), (95, y)], fill=rgba('#8a949e'))
    for x in range(0, 96, 24):
        d.line([(x, 55), (x, 127)], fill=rgba('#8a949e'))
    for x in range(0, 96, 8):                                          # hazard stripe at the back of the floor
        d.polygon([(x, 55), (x + 4, 55), (x + 2, 59), (x - 2, 59)], fill=rgba(HAZ))
    d.rectangle((0, 120, 95, 127), fill=rgba('#8a949e'))
    return img

# ─── The 20 objects ────────────────────────────────────────────────────────

def clear_hall(c, fixed):
    if fixed:   # a swept floor, a push broom
        line(c, [(20, 3), (12, 24)], WOOD, 2); c.rect((5, 24, 20, 27), BUTTER); c.px([(6, 25), (10, 25), (14, 25)], '#d9b04c')
        c.px([(24, 8), (25, 9), (24, 10), (23, 9)], '#ffffff')
    else:       # rubble, a pigeon's nest, an old crate
        c.rect((3, 18, 14, 26), '#6a5a46'); c.ellipse((16, 20, 28, 27), '#8a7a62'); c.ellipse((5, 8, 14, 14), '#a8946a'); c.px([(8, 10), (11, 11)], '#e8e8e0')

def power_up(c, fixed):
    c.rect((6, 4, 25, 28), STEEL_D); c.rect((8, 6, 23, 26), '#4a5a68' if fixed else '#3a3a3a')
    if fixed:
        c.rect((11, 9, 20, 13), '#1f3358'); c.px([(12, 11), (14, 11), (16, 11)], '#9ed9c3')
        c.rect((12, 16, 13, 24), RED); c.rect((16, 16, 19, 22), GREEN); c.px([(17, 24), (18, 24)], HAZ)
    else:
        c.rect((11, 9, 20, 13), '#222222'); line(c, [(7, 5), (24, 27)], '#2a2a2a'); c.px([(14, 18), (18, 22)], '#6a4a2a')

def conveyor(c, fixed):
    c.rect((2, 17, 29, 21), '#4a4a52'); c.rect((2, 17, 29, 18), '#6a6a72')
    c.rect((4, 21, 6, 28), STEEL_D); c.rect((25, 21, 27, 28), STEEL_D)
    for x in range(4, 29, 5): c.px([(x, 19)], '#8a8a92')
    if fixed:
        for x in (5, 13, 21): c.rect((x, 11, x + 5, 16), CHOC); c.rect((x, 11, x + 5, 12), CHOC_L)
    else:
        c.rect((2, 16, 12, 21), '#2a2a30'); line(c, [(12, 16), (18, 24)], '#3a3a34'); c.rect((19, 17, 29, 21), '#4a4a52'); c.px([(8, 14), (23, 14)], '#6a4a2a')

def mixers(c, fixed):
    c.rect((6, 6, 25, 10), STEEL if fixed else '#7a7a72'); c.rect((14, 10, 17, 18), STEEL_D)
    c.ellipse((3, 16, 28, 29), STEEL if fixed else '#6a6a62'); c.rect((3, 20, 28, 24), STEEL if fixed else '#6a6a62')
    if fixed:
        c.ellipse((7, 17, 24, 22), CHOC); c.px([(10, 18), (15, 19), (20, 18)], CHOC_L); c.rect((26, 7, 28, 9), RED)
    else:
        c.ellipse((7, 17, 24, 22), '#3a342c'); line(c, [(5, 22), (12, 27)], '#2a2a28')

def tempering_tanks(c, fixed):
    for x in (3, 17):
        c.rect((x, 6, x + 11, 24), STEEL if fixed else '#7a7a72'); c.rect((x, 6, x + 11, 8), STEEL_L if fixed else '#8a8a82')
        c.ellipse((x, 22, x + 11, 28), STEEL_D if fixed else '#5a5a52')
        c.rect((x + 3, 12, x + 8, 16), '#2f9fc9' if fixed else '#4a5a60')
        if fixed: c.px([(x + 4, 13), (x + 6, 14)], '#d4eef2')
    c.rect((14, 14, 17, 15), STEEL_D)
    if not fixed: line(c, [(4, 7), (11, 24)], '#4a4a44')

def foreman_office(c, fixed):
    c.rect((3, 6, 28, 28), WOOD_D); c.rect((5, 8, 26, 26), '#e8f0f4' if fixed else '#b0b8bc')
    c.rect((9, 12, 22, 22), '#6a7a88' if fixed else '#4a525a')
    if fixed:
        c.rect((10, 13, 21, 16), '#bfe0ec'); c.rect((10, 17, 21, 21), WOOD); c.px([(14, 19), (17, 19)], '#fffaf0'); c.rect((14, 4, 17, 7), HAZ)
    else:
        c.rect((10, 13, 21, 21), '#3a3a3a'); line(c, [(10, 13), (21, 21)], '#5a5a5a')

def safety_rails(c, fixed):
    col = HAZ if fixed else '#8a8472'
    c.rect((2, 10, 29, 12), col); c.rect((2, 19, 29, 21), col)
    for x in (4, 14, 25): c.rect((x, 8, x + 1, 27), col)
    if fixed:
        for x in range(4, 28, 6): c.px([(x, 11), (x + 1, 11)], '#3a3a44'); c.px([(x, 20), (x + 1, 20)], '#3a3a44')
    else:
        c.rect((12, 19, 17, 21), '#2a2a2a'); line(c, [(18, 10), (24, 14)], '#6a6a5a'); c.px([(6, 24)], '#6a4a2a')

def robot_arm(c, fixed):
    base = ORANGE if fixed else '#8a8472'
    c.rect((5, 24, 18, 28), STEEL_D); c.rect((9, 14, 13, 24), base)
    line(c, [(11, 14), (21, 8)], base, 3); line(c, [(21, 8), (26, 15)], base, 2)
    c.ellipse((8, 22, 14, 26), STEEL if fixed else '#6a6a62'); c.ellipse((19, 6, 24, 11), STEEL if fixed else '#6a6a62')
    if fixed:
        c.rect((24, 15, 28, 19), '#fffaf0'); c.px([(25, 17)], RED); c.rect((25, 20, 29, 23), CHOC)
    else:
        c.px([(26, 15), (27, 16)], '#3a3a34'); line(c, [(26, 15), (22, 24)], '#4a4a44')

def press_room(c, fixed):
    c.rect((3, 12, 28, 28), WOOD if fixed else '#6a5a46'); c.rect((3, 12, 28, 14), WOOD_L if fixed else '#7a6a56')
    if fixed:
        c.rect((7, 5, 14, 11), '#fffaf0'); c.px([(8, 7), (10, 7), (12, 7), (9, 9)], '#3a3a44'); c.rect((16, 6, 24, 11), RED); c.px([(18, 8), (20, 8)], '#fffaf0')
        c.rect((8, 17, 20, 24), '#2a2a34'); c.rect((9, 18, 19, 23), '#bfe0ec')
    else:
        c.rect((7, 6, 13, 11), '#b0aa9a'); line(c, [(8, 18), (22, 25)], '#4a4034')

def wrapping_line(c, fixed):
    c.rect((2, 18, 29, 21), '#4a4a52'); c.rect((4, 21, 6, 28), STEEL_D); c.rect((25, 21, 27, 28), STEEL_D)
    c.rect((10, 6, 21, 17), STEEL if fixed else '#7a7a72'); c.rect((10, 6, 21, 8), STEEL_L if fixed else '#8a8a82')
    c.rect((13, 12, 18, 17), '#2a2a34')
    if fixed:
        for x in (3, 22): c.rect((x, 12, x + 5, 17), '#d9a05c'); c.rect((x, 12, x + 5, 13), '#f0c48a'); c.px([(x + 2, 15)], '#fffaf0')
        c.px([(15, 9), (16, 9)], GREEN)
    else:
        c.rect((3, 12, 8, 17), '#8a6a3a'); line(c, [(14, 10), (20, 15)], '#3a3a34')

def control_room(c, fixed):
    c.rect((2, 8, 29, 26), '#3a4450' if fixed else '#4a4a4a')
    for x, y in [(5, 11), (14, 11), (22, 11)]:
        c.rect((x, y, x + 6, y + 6), '#1f3358' if fixed else '#2a2a2a')
        if fixed: c.px([(x + 1, y + 2), (x + 3, y + 4), (x + 5, y + 3)], '#9ed9c3')
    c.rect((2, 20, 29, 22), STEEL if fixed else '#6a6a62')
    for x in range(5, 28, 4):
        c.px([(x, 24)], [RED, GREEN, HAZ, BLUE, RED, GREEN][(x // 4) % 6] if fixed else '#4a4a4a')
    if not fixed: line(c, [(2, 8), (29, 26)], '#2a2a2a')

def cooling_tunnel(c, fixed):
    c.rect((2, 8, 29, 24), STEEL if fixed else '#7a7a72'); c.rect((2, 8, 29, 10), STEEL_L if fixed else '#8a8a82')
    c.rect((4, 13, 27, 22), '#1f3358' if fixed else '#2a2a2a')
    if fixed:
        for x in range(6, 26, 5): c.px([(x, 15), (x + 2, 18), (x + 1, 20)], '#d4eef2')
        for x in (7, 15, 22): c.rect((x, 19, x + 3, 22), CHOC)
    else:
        c.px([(10, 16), (20, 19)], '#6a4a2a')
    c.rect((4, 24, 6, 28), STEEL_D); c.rect((25, 24, 27, 28), STEEL_D)

def loading_dock(c, fixed):
    c.rect((2, 20, 29, 28), '#6a6a72'); c.rect((2, 20, 29, 21), '#8a8a92')
    if fixed:
        for x in range(3, 29, 6): c.rect((x, 24, x + 2, 24), HAZ)
        c.rect((5, 5, 26, 19), STEEL); c.rect((7, 7, 24, 17), STEEL_L)
        for y in (9, 12, 15): c.rect((7, y, 24, y), STEEL)
        c.rect((13, 4, 18, 5), GREEN)
    else:
        c.rect((5, 5, 26, 19), '#6a6a62'); c.rect((7, 12, 24, 17), '#2a2a30'); c.px([(10, 8), (20, 9)], '#4a4a44'); line(c, [(5, 5), (26, 19)], '#3a3a34')

def sample_lab(c, fixed):
    c.rect((3, 18, 28, 28), WOOD if fixed else '#6a5a46'); c.rect((3, 18, 28, 20), '#fffaf0' if fixed else '#b0aa9a')
    if fixed:
        for x, col in [(6, '#e05a5a'), (11, '#f7d774'), (16, '#7fc8f8'), (21, '#9ed9c3')]:
            c.rect((x, 9, x + 3, 17), '#d4eef2'); c.rect((x + 1, 12, x + 2, 16), col); c.rect((x, 8, x + 3, 9), STEEL_D)
        c.px([(25, 12), (26, 13), (25, 14)], '#ffffff')
    else:
        c.rect((7, 12, 10, 17), '#8a8478'); line(c, [(14, 10), (20, 16)], '#4a4a44')

def chocolate_fountain(c, fixed):
    c.rect((6, 24, 25, 28), STEEL_D if fixed else '#5a5a52'); c.rect((8, 20, 23, 24), STEEL if fixed else '#6a6a62')
    c.rect((14, 8, 17, 20), STEEL if fixed else '#6a6a62')
    for x, y, w in [(8, 18, 15), (10, 13, 11), (12, 8, 7)]:
        c.rect((x, y, x + w, y + 2), STEEL_L if fixed else '#7a7a72')
        if fixed: c.rect((x + 1, y + 2, x + w - 1, y + 4), CHOC)
    if fixed: c.px([(15, 5), (16, 6), (15, 7), (16, 3)], CHOC_L)
    else: c.rect((9, 21, 22, 23), '#3a2a22'); line(c, [(8, 18), (22, 24)], '#3a3a34')

def visitor_gallery(c, fixed):
    c.rect((2, 18, 29, 21), STEEL_D if fixed else '#6a6a62')
    for x in range(3, 29, 5): c.rect((x, 9, x, 18), STEEL)
    c.rect((2, 9, 29, 10), STEEL)
    if fixed:
        c.rect((4, 11, 27, 17), '#bfe0ec')
        for x, col in [(8, '#c0392b'), (14, '#3a78b8'), (20, '#f2c94c')]:
            c.ellipse((x, 12, x + 4, 15), '#f0c8a0'); c.rect((x, 15, x + 4, 17), col)
    else:
        c.rect((4, 11, 27, 17), '#4a525a'); line(c, [(6, 12), (24, 16)], '#2a2a2a')
    c.rect((4, 21, 6, 28), STEEL_D); c.rect((25, 21, 27, 28), STEEL_D)

def fifth_recipe_page(c, fixed):
    c.rect((3, 4, 28, 27), '#8a6a4a' if fixed else '#6a5a46')
    if fixed:
        c.rect((5, 6, 14, 25), '#f2dcb0'); c.rect((17, 6, 26, 25), '#f2dcb0'); c.rect((15, 6, 16, 25), '#d9b07a')
        for y in (9, 12, 15): line(c, [(7, y), (13, y)], '#a8845a')
        c.ellipse((19, 10, 24, 15), '#f2c94c'); c.px([(21, 12), (22, 13)], '#d9a83c'); line(c, [(19, 19), (24, 19)], '#a8845a'); line(c, [(19, 22), (23, 22)], '#a8845a')
    else:
        c.rect((5, 6, 26, 25), '#7a6a52'); c.rect((9, 11, 22, 21), '#4a3a2a'); c.px([(12, 14), (18, 17)], '#6a5a46')

def grand_tour(c, fixed):
    c.rect((3, 5, 4, 28), WOOD_D); c.rect((27, 5, 28, 28), WOOD_D)
    if fixed:
        c.rect((5, 8, 26, 16), RED); c.rect((5, 8, 26, 9), '#e05a5a')
        for x in range(8, 24, 4): c.rect((x, 11, x + 2, 13), '#fffaf0')
        c.rect((12, 20, 19, 27), '#f2c94c'); c.px([(14, 22), (17, 22)], '#3a3a44'); c.px([(15, 24), (16, 25)], '#3a3a44')
    else:
        c.rect((5, 10, 12, 14), '#8a7a62'); line(c, [(12, 12), (20, 17)], '#7a6a52', 2); c.rect((20, 17, 26, 20), '#8a7a62')

def buyout_offer(c, fixed):
    c.rect((5, 4, 26, 28), '#fffaf0' if fixed else '#c8c2b4'); c.rect((5, 4, 26, 6), '#e8873a' if fixed else '#8a7a62')
    for y, w in [(9, 16), (12, 14), (15, 16), (18, 10)]: line(c, [(8, y), (8 + w, y)], '#3a3a44' if fixed else '#8a8478')
    if fixed:
        c.ellipse((16, 19, 24, 27), '#c0392b'); c.px([(19, 22), (20, 23), (21, 22)], '#fffaf0'); line(c, [(8, 24), (14, 24)], '#3a3a44')
    else:
        line(c, [(10, 22), (20, 26)], '#8a8478')

def final_answer(c, fixed):
    c.rect((3, 20, 28, 28), '#6a6a72'); c.rect((3, 20, 28, 21), '#8a8a92')
    if fixed:
        c.rect((10, 6, 21, 19), STEEL); c.rect((12, 8, 19, 15), '#1f3358'); c.px([(14, 11), (17, 11)], '#9ed9c3'); c.px([(14, 13), (15, 14), (16, 14), (17, 13)], '#9ed9c3')
        c.px([(6, 12), (7, 13), (6, 14), (25, 12), (26, 13), (25, 14)], HAZ)
        c.px([(5, 4), (5, 8), (26, 4), (26, 8)], '#e05a5a'); c.px([(12, 3), (19, 3)], '#f7d774')
    else:
        c.rect((10, 8, 21, 19), '#6a6a62'); c.rect((12, 10, 19, 15), '#222222'); line(c, [(10, 8), (21, 19)], '#3a3a34')

BUILDERS = {
    'clear-hall': clear_hall, 'power-up': power_up, 'conveyor': conveyor, 'mixers': mixers,
    'tempering-tanks': tempering_tanks, 'foreman-office': foreman_office, 'safety-rails': safety_rails,
    'robot-arm': robot_arm, 'press-room': press_room, 'wrapping-line': wrapping_line,
    'control-room': control_room, 'cooling-tunnel': cooling_tunnel, 'loading-dock': loading_dock,
    'sample-lab': sample_lab, 'chocolate-fountain': chocolate_fountain, 'visitor-gallery': visitor_gallery,
    'fifth-recipe-page': fifth_recipe_page, 'grand-tour': grand_tour, 'buyout-offer': buyout_offer,
    'final-answer': final_answer,
}

def render(slug, fixed):
    c = Canvas(); BUILDERS[slug](c, fixed); c.outline()
    return c.img if fixed else dusty(c.img, sum(map(ord, slug)))

def sheet(path, scale=4):
    pad = 8; cell = 32 * scale; cols = 5
    rows = (len(BUILDERS) + cols - 1) // cols
    out = Image.new('RGBA', (pad + cols * (2 * cell + pad * 2), pad + rows * (cell + 16)), (32, 36, 44, 255))
    d = ImageDraw.Draw(out)
    for n, slug in enumerate(BUILDERS):
        bx = pad + (n % cols) * (2 * cell + pad * 2); by = pad + (n // cols) * (cell + 16)
        for k, fixed in enumerate((False, True)):
            x = bx + k * cell
            out.paste(Image.new('RGBA', (cell, cell), (154, 164, 174, 255)), (x, by))
            out.alpha_composite(render(slug, fixed).resize((cell, cell), Image.NEAREST), (x, by))
        d.text((bx, by + cell + 2), slug, fill=(220, 220, 220, 255))
    out.save(path)

def scene_preview(path, fixed, scale=4):
    chapter = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'chapter5.json'), encoding='utf-8'))
    w, h = 96 * scale, 128 * scale
    base = Image.new('RGBA', (w, h), rgba('#fff6e6'))
    faded = factory().resize((w, h), Image.NEAREST); faded.putalpha(int(255 * 0.35))
    base.alpha_composite(faded)
    size = round(w * 0.22)
    for task in chapter['tasks']:
        slug = task['id'].removeprefix('factory-')
        sprite = render(slug, fixed).resize((size, size), Image.NEAREST)
        x = round(task['spot']['x'] * w - size / 2); y = round(task['spot']['y'] * h - size / 2)
        base.alpha_composite(sprite, (max(0, x), max(0, y)))
    base.save(path)

if __name__ == '__main__':
    here = os.path.dirname(__file__)
    art = os.path.join(here, '..', '..', 'public', 'art')
    factory().save(os.path.join(art, 'factory.png'))
    for slug in BUILDERS:
        for fixed, tag in ((False, 'before'), (True, 'after')):
            render(slug, fixed).save(os.path.join(art, f'factory-{slug}-{tag}.png'))
    sheet(os.path.join(here, 'factory_sheet.png'))
    scene_preview(os.path.join(here, 'factory_after.png'), True)
    print('ok', len(BUILDERS) * 2 + 1)
