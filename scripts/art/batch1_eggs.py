from pixart import sheet, overlay

EMPTY = ['.' * 16] * 16
EGG = [
    '..oooo..',
    '.oHSSSo.',
    'oHSSSSSo',
    'oSSSSSSo',
    'oSSSSSSo',
    'oSSSSDDo',
    'oSSSDDDo',
    '.oSDDDo.',
    '..oooo..',
]
SHELL = {'S': '#fff4d6', 'D': '#e8cfa0', 'H': '#ffffff'}

egg_pair = overlay(overlay(EMPTY, EGG, 1, 3), EGG, 7, 5)

egg_carton = [
    '................',
    '................',
    '................',
    '................',
    '...oo..oo..oo...',
    '..oHSooHSooHSo..',
    '..oSDooSDooSDo..',
    '.oooooooooooooo.',
    '.oCCCCCCCCCCCCo.',
    '.oCcCCcCCcCCcCo.',
    '.oCcCCcCCcCCcCo.',
    '.oCCCCCCCCCCCCo.',
    '.oKKKKKKKKKKKKo.',
    '.oooooooooooooo.',
    '................',
    '................',
]
CARTON = dict(SHELL, C='#c9a57a', c='#a8845a', K='#8a6a45')

whisked = [
    '................',
    '...........oo...',
    '..........oGGo..',
    '.........oMMo...',
    '........oMMo....',
    '...oooooMMooo...',
    '..oYYYoMMoYYYo..',
    '.oYHYYYMYYYHYYo.',
    'oooooooooooooooo',
    'oBBBBBBBBBBBBBBo',
    '.oBBBBBBBBBBBBo.',
    '.oBBBBBBBBBBBKo.',
    '..oKBBBBBBBBKo..',
    '...oKKKKKKKKo...',
    '....oooooooo....',
    '................',
]
WHISK = {'G': '#9c5b2e', 'M': '#c9cdd1', 'Y': '#f7d774', 'H': '#fff0b8',
         'B': '#a8d8f0', 'K': '#6fa9c9'}

custard = [
    '................',
    '................',
    '................',
    '................',
    '...oooooooooo...',
    '..oYYYYYYYYYYo..',
    '.oYHHYYYYYYYYYo.',
    '.oYYYYYYYYYYDYo.',
    '.oooooooooooooo.',
    '.oWwWwWwWwWwWwo.',
    '.oWwWwWwWwWwWwo.',
    '.oWwWwWwWwWwKwo.',
    '..oWwWwWwWwKKo..',
    '..oooooooooooo..',
    '................',
    '................',
]
RAMEKIN = {'W': '#f4fbff', 'w': '#d4e3ea', 'K': '#9fb3bf'}
CUSTARD = dict(RAMEKIN, Y='#f7d774', H='#fff0b8', D='#d9a83c')

brulee = [
    '................',
    '............L...',
    '...........LLL..',
    '............L...',
    '................',
    '..oooooooooooo..',
    '.oCCCCCCCCCCCCo.',
    'oCLLCCCCoCCCCCCo',
    'oCCCCCCoCCCCCCDo',
    'oooooooooooooooo',
    'oWwWwWwWwWwWwWwo',
    'oWwWwWwWwWwWwKwo',
    '.oWwWwWwWwWwKKo.',
    '..oooooooooooo..',
    '................',
    '................',
]
BRULEE = dict(RAMEKIN, C='#c47a2c', L='#f2c26b', D='#8a4f1a')

ICONS = [
    ('egg-pair', egg_pair, SHELL),
    ('egg-carton', egg_carton, CARTON),
    ('whisked-eggs', whisked, WHISK),
    ('custard-cup', custard, CUSTARD),
    ('creme-brulee', brulee, BRULEE),
]

if __name__ == '__main__':
    # The finished tier-1 egg alongside, for comparison.
    sheet(ICONS, 'batch1_eggs.png')
    print('ok')
