from pixart import sheet, overlay

EMPTY = ['.' * 16] * 16
RED = {'R': '#e05a5a', 'H': '#f08a8a', 'D': '#a83c3c', 'G': '#5aa85a', 's': '#fff0b8'}

berry = [
    '................',
    '................',
    '................',
    '......o..o......',
    '.....oGooGo.....',
    '....oGGGGGGo....',
    '...oRRoGGoRRo...',
    '...oRHRRRRsRo...',
    '...oHRsRRRRDo...',
    '...oRRRRsRRDo...',
    '....oRsRRRDo....',
    '....oRRRRDDo....',
    '.....oRRDDo.....',
    '......oDDo......',
    '.......oo.......',
    '................',
]

BALL = [
    '.ooo.',
    'oHRRo',
    'oRRRo',
    'oRRDo',
    '.ooo.',
]
LEAVES = [
    '..oo..oo..',
    '.oGGooGGo.',
    'oGGGGGGGGo',
    '.oooooooo.',
]
bunch = overlay(EMPTY, LEAVES, 3, 1)
for x, y in [(2, 6), (9, 6), (5, 4), (3, 9), (8, 9), (6, 7), (5, 11)]:
    bunch = overlay(bunch, BALL, x, y)

APPLE = [
    '..o..',
    '.ooo.',
    'oHRRo',
    'oRRRo',
    'oRRDo',
    'oRRDo',
]
basket = EMPTY
for x, y in [(1, 3), (10, 3), (5, 1)]:
    basket = overlay(basket, APPLE, x, y)
basket = overlay(basket, [
    'oooooooooooooooo',
    'oWwWwWwWwWwWwWwo',
    '.oWWWWWWWWWWWWo.',
    '.owWwWwWwWwWwWo.',
    '.oWWWWWWWWWWWKo.',
    '..owWwWwWwWwKo..',
    '..oooooooooooo..',
], 0, 8)
BASKET = dict(RED, W='#c9a57a', w='#a8845a', K='#8a6a45')

jam = [
    '................',
    '..oooooooooooo..',
    '.oRWRWRWRWRWRWo.',
    '.oWRWRWRWRWRWRo.',
    '..oooooooooooo..',
    '...oGGGGGGGGo...',
    '..oJJJJJJJJJJo..',
    '.oJHJJJJJJJJJJo.',
    '.oJHJLLLLLLJJJo.',
    '.oJJJLLLLLLJJJo.',
    '.oJJJJJJJJJJJDo.',
    '.oJJJJJJJJJJDDo.',
    '..oJJJJJJJJDDo..',
    '...oooooooooo...',
    '................',
    '................',
]
JAM = {'R': '#e05a5a', 'W': '#ffffff', 'G': '#d4eef2', 'J': '#a83c3c',
       'H': '#e05a5a', 'D': '#7a2525', 'L': '#fff4d6'}

tart = [
    '................',
    '................',
    '................',
    '.....oooooo.....',
    '...ooRRHRRAoo...',
    '..oRRHRAARRRRo..',
    '.oRARRRRRRBARRo.',
    '.oRRRBARRRRRRDo.',
    'oPPPPPPPPPPPPPPo',
    'oPpPpPpPpPpPpPpo',
    '.oPpPpPpPpPpPpo.',
    '..oPPPPPPPPPPo..',
    '...oooooooooo...',
    '................',
    '................',
    '................',
]
TART = {'R': '#e05a5a', 'H': '#f08a8a', 'A': '#f7e08a', 'B': '#7a2540',
        'D': '#a83c3c', 'P': '#e0a458', 'p': '#b07a45'}

ICONS = [
    ('berry', berry, RED),
    ('berry-bunch', bunch, RED),
    ('apple-basket', basket, BASKET),
    ('jam-jar', jam, JAM),
    ('fruit-tart-filling', tart, TART),
]

if __name__ == '__main__':
    sheet(ICONS, 'batch3_fruit.png')
    print('ok')
