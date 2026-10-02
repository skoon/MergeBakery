from pixart import sheet, overlay

def sub(rows, row, text, col):
    """Replace part of one row."""
    r = list(rows[row]); r[col:col + len(text)] = text
    out = list(rows); out[row] = ''.join(r); return out

MILL = [
    '.S...........S..',
    '..S.........S...',
    '...S.......S....',
    '....S.....S.....',
    '.....S...S......',
    '......ooo.......',
    '.....oKKKo......',
    '....S.ooo.S.....',
    '...S.oMMMo.S....',
    '..S..oMMMo..S...',
    '.S...oMMMo...S..',
    '....oMMMMMo.....',
    '...oMMMMMMMo....',
    '...oDDDDDDDo....',
    '...ooooooooo....',
    '................',
]
MILL1 = {'S': '#9c5b2e', 'M': '#c99a55', 'D': '#9c5b2e', 'K': '#6d3d1d'}
mill2 = sub(sub(MILL, 9, 'w', 7), 12, 'o', 7)  # a window and a door
MILL2 = dict(MILL1, S='#f2dcb0', K='#a83c3c', w='#fff4d6')
mill3 = overlay(mill2, ['o', 'oGG', 'oG', 'o'], 7, 1)  # a gold flag on the roof
mill3 = sub(mill3, 13, 'GGGGGGG', 4)  # gold trim along the base
MILL3 = dict(MILL2, G='#f2c94c')

FRIDGE = [
    '................',
    '...oooooooooo...',
    '...oLLLLLLLLo...',
    '...oLFFFFFFLo...',
    '...oLFFFFHFLo...',
    '...oLFFFFHFLo...',
    '...oooooooooo...',
    '...oLFFFFFFLo...',
    '...oLFFFFHFLo...',
    '...oLFFFFHFLo...',
    '...oLFFFFFFLo...',
    '...oLFFFFFFLo...',
    '...oLKKKKKKLo...',
    '...oooooooooo...',
    '....o......o....',
    '................',
]
FRIDGE1 = {'F': '#9ed9c3', 'L': '#d4f1e6', 'K': '#6fae9b', 'H': '#f4fbff'}
fridge2 = [
    '................',
    '.oooooooooooooo.',
    '.oLLLLLLLLLLLLo.',
    '.oLFFFFHoHFFFLo.',
    '.oLFFFFHoHFFFLo.',
    '.oLFFFFFoFFFFLo.',
    '.oLFFFFFoFFFFLo.',
    '.oLFFFFFoFFFFLo.',
    '.oLFFFFFoFFFFLo.',
    '.oLFFFFHoHFFFLo.',
    '.oLFFFFHoHFFFLo.',
    '.oLFFFFFoFFFFLo.',
    '.oLKKKKKoKKKKLo.',
    '.oooooooooooooo.',
    '..oo........oo..',
    '................',
]
FRIDGE2 = dict(FRIDGE1)
fridge3 = sub(sub(fridge2, 1, 'GGGGGGGGGGGG', 2), 13, 'GGGGGGGGGGGG', 2)
fridge3 = sub(sub(fridge3, 1, 'o', 1), 1, 'o', 14)
FRIDGE3 = dict(FRIDGE2, G='#f2c94c')

COOP = [
    '................',
    '.......oo.......',
    '......oRRo......',
    '.....oRHRRo.....',
    '....oRHRRRRo....',
    '...oRRRRRRRRo...',
    '..oooooooooooo..',
    '...oWWWWWWWWo...',
    '...oWWWooWWWo...',
    '...oWWoDDoWWo...',
    '...oWWoDDoWWo...',
    '...oWWoDDoWKo...',
    '...oooooooooo...',
    '..oYYYYYYYYYYo..',
    '..oooooooooooo..',
    '................',
]
COOP1 = {'R': '#a83c3c', 'H': '#e05a5a', 'W': '#d9a05c', 'K': '#9d6420',
         'D': '#6d3d1d', 'Y': '#f7d774'}
# Tier 2: a hen peeks out of the door, and the coop gets a round window.
coop2 = sub(sub(COOP, 9, 'cc', 7), 10, 'hb', 7)
coop2 = sub(coop2, 7, 'o', 5)
COOP2 = dict(COOP1, h='#ffffff', c='#e05a5a', b='#f2c94c')
# Tier 3: a gold weathervane and a gold ridge.
coop3 = overlay(coop2, ['.G.', 'GGG', '.o.'], 6, 0)
coop3 = sub(coop3, 6, 'GGGGGGGGGGGG', 2)
COOP3 = dict(COOP2, G='#f2c94c')

TIN = [
    '................',
    '................',
    '.......oo.......',
    '......oKKo......',
    '...oooooooooo...',
    '..oLLLLLLLLLLo..',
    '..oooooooooooo..',
    '...oPPPPPPPPo...',
    '...oPHPPPPPPo...',
    '...oWWWWWWWWo...',
    '...oWsWsWsWWo...',
    '...oPPPPPPPPo...',
    '...oPPPPPPPDo...',
    '...oPPPPPPDDo...',
    '...oooooooooo...',
    '................',
]
TIN1 = {'P': '#c9557c', 'H': '#f27ba0', 'D': '#8d1940', 'L': '#e8e8ee',
        'K': '#9a9aa5', 'W': '#fff0f5', 's': '#c9557c'}
# Tier 2: a scoop handle pokes out from under the lid.
tin2 = overlay(TIN, ['...oo', '..oSo', '.oSo.', 'oSo..'], 10, 0)
TIN2 = dict(TIN1, S='#c9a57a')
# Tier 3: a gold lid and knob, and a sparkle.
tin3 = overlay(tin2, ['.L.', 'LLL', '.L.'], 1, 1)
TIN3 = dict(TIN2, L='#f2c94c', K='#d9a020')

ICONS = [
    ('flour-mill-2', mill2, MILL2),
    ('flour-mill-3', mill3, MILL3),
    ('dairy-fridge-2', fridge2, FRIDGE2),
    ('dairy-fridge-3', fridge3, FRIDGE3),
    ('hen-coop-1', COOP, COOP1),
    ('hen-coop-2', coop2, COOP2),
    ('hen-coop-3', coop3, COOP3),
    ('sugar-tin-1', TIN, TIN1),
    ('sugar-tin-2', tin2, TIN2),
    ('sugar-tin-3', tin3, TIN3),
]

if __name__ == '__main__':
    sheet(ICONS, 'batch5_generators.png')
    print('ok')
