from pixart import sheet, overlay

EMPTY = ['.' * 16] * 16

DISC = [
    '..oooooooooooo..',
    '.oCHCKCCCCKCCCo.',
    '.oCCCCCKCCCCKCo.',
    '.oDDDDDDDDDDDDo.',
    '..oooooooooooo..',
]
stack = EMPTY
for dx, dy in [(0, 10), (1, 7), (-1, 3)]:
    stack = overlay(stack, DISC, dx, dy)
COOKIE = {'C': '#c98d55', 'H': '#e0a870', 'D': '#b07a45', 'K': '#4a2c17'}

tin = [
    '................',
    '................',
    '................',
    '...oooooooooo...',
    '..oLLLLLLLLLLo..',
    '.oLHLLLLLLLLLLo.',
    '.oooooooooooooo.',
    '.oTTTTTTTTTTTTo.',
    '.oTYYYYYYYYYYTo.',
    '.oTTTTCCTTTTTTo.',
    '.oTTTCkCCTTTTTo.',
    '.oTTTTCCTTTTTKo.',
    '.oYYYYYYYYYYYYo.',
    '.oTTTTTTTTTTKKo.',
    '.oooooooooooooo.',
    '................',
]
TIN = {'T': '#4a7fb0', 'K': '#2f5a82', 'L': '#5a92c4', 'H': '#8fb8dd',
       'Y': '#f2c94c', 'C': '#c98d55', 'k': '#4a2c17'}

hamper = [
    '................',
    '...oo...........',
    '..oGGo..........',
    '..oGGo...oooo...',
    '..oBBo..oCKCCo..',
    '.oBBBBooCCCCKCo.',
    '.oBHBBooKCCCCCo.',
    '.oBBBBo.oCCKCo..',
    'oooooooooooooooo',
    'oWwWwWRRRWwWwWwo',
    '.oWWWWRoRWWWWWo.',
    '.owWwWwWwWwWwWo.',
    '.oWWWWWWWWWWWKo.',
    '..owWwWwWwWwKo..',
    '..oooooooooooo..',
    '................',
]
HAMPER = {'G': '#f2c94c', 'B': '#7a2540', 'H': '#a83c3c', 'C': '#c98d55',
          'K': '#4a2c17', 'W': '#c9a57a', 'w': '#a8845a', 'R': '#e05a5a'}
HAMPER_EDGE = dict(HAMPER)

pain = [
    '................',
    '................',
    '................',
    '................',
    '...oooooooooo...',
    '..oLkCLkCLkCCo..',
    '.ooCCCCCCCCCCoo.',
    'oKoLLCLLCLLCCoKo',
    'oKoCCCCCCCCCCoKo',
    'oKoCCCCCCCCCDoKo',
    '.ooDDDDDDDDDDoo.',
    '..oooooooooooo..',
    '................',
    '................',
    '................',
    '................',
]
PASTRY = {'C': '#e0a458', 'L': '#f2c98a', 'D': '#b07a45', 'K': '#7a4a2a', 'k': '#8f5530'}

BUN = [
    '.oooo.',
    'oLLCCo',
    'oLCCCo',
    'oCCCDo',
    '.oooo.',
]
platter = EMPTY
for x, y in [(3, 3), (7, 3), (0, 6), (5, 6), (10, 6)]:
    platter = overlay(platter, BUN, x, y)
platter = overlay(platter, [
    '.oooooooooooooo.',
    'oWWWWWWWWWWWWWWo',
    '.owwwwwwwwwwwwo.',
    '..oooooooooooo..',
], 0, 10)
PLATTER = dict(PASTRY, W='#f4fbff', w='#c9d6de')

slice_ = [
    '................',
    '............oo..',
    '...........oRRo.',
    '..........ooooo.',
    '........ooFFFFo.',
    '......ooFFFFFFo.',
    '....ooFFFFFFFFo.',
    '..ooFFFFFFFFFFo.',
    '.oSSSSSSSSSSSSo.',
    '.oSSSSSSSSSSSSo.',
    '.oPPPPPPPPPPPPo.',
    '.oSSSSSSSSSSSSo.',
    '.oSSSSSSSSSSSDo.',
    '.oooooooooooooo.',
    '................',
    '................',
]
CAKE = {'F': '#f5a3c0', 'S': '#f2dcb0', 'P': '#ffc8dc', 'D': '#d9b98a',
        'R': '#e05a5a', 'H': '#ffc8dc', 'W': '#f4fbff'}

layer = [
    '................',
    '......oRRo......',
    '....oooooooo....',
    '..ooFFFFFFFFoo..',
    '.oFHFFFFFFFFFFo.',
    '.oFFFFFFFFFFFFo.',
    '.oFSFFSFFSFFSFo.',
    '.oSSSSSSSSSSSSo.',
    '.oPPPPPPPPPPPPo.',
    '.oSSSSSSSSSSSSo.',
    '.oPPPPPPPPPPPPo.',
    '.oSSSSSSSSSSSDo.',
    'oooooooooooooooo',
    'oWWWWWWWWWWWWWWo',
    '.oooooooooooooo.',
    '................',
]

wedding = [
    '.......oo.......',
    '......oRRo......',
    '.......oo.......',
    '.....oooooo.....',
    '.....oWWWWo.....',
    '.....oPPPPo.....',
    '...oooooooooo...',
    '...oWWWWWWWWo...',
    '...oWHWWWWWWo...',
    '...oPPPPPPPPo...',
    '.oooooooooooooo.',
    '.oWWWWWWWWWWWWo.',
    '.oWHWWWWWWWWWWo.',
    '.oPPPPPPPPPPPPo.',
    '.oWWWWWWWWWWWKo.',
    '.oooooooooooooo.',
]
WEDDING = {'W': '#fffaf5', 'H': '#ffffff', 'P': '#f5a3c0', 'K': '#d9c9c0', 'R': '#e05a5a'}

ICONS = [
    ('cookie-stack', stack, COOKIE),
    ('cookie-tin', tin, TIN),
    ('gift-hamper', hamper, HAMPER),
    ('pain-au-chocolat', pain, PASTRY),
    ('pastry-platter', platter, PLATTER),
    ('cake-slice', slice_, CAKE),
    ('layer-cake', layer, CAKE),
    ('wedding-cake', wedding, WEDDING),
]

if __name__ == '__main__':
    sheet(ICONS, 'batch4_baked.png')
    print('ok')
