from pixart import sheet, overlay

jar = [
    '................',
    '....oooooooo....',
    '....oLLLLLLo....',
    '....oooooooo....',
    '...oGGGGGGGGo...',
    '..oBBBBBBBBBBo..',
    '..oBHBBBYYBBBo..',
    '..oBHBBYYBBBBo..',
    '..oBBBYYYYYBBo..',
    '..oBBBBBYYBBBo..',
    '..oBBBBYYBBBBo..',
    '..oBBBBYBBBBDo..',
    '..oBBBBBBBBBDo..',
    '..oBBBBBBBBDDo..',
    '...oooooooooo...',
    '................',
]
JAR = {'B': '#7fc8f8', 'H': '#c6e8fc', 'D': '#4a9fd6', 'Y': '#f7d774',
       'L': '#9a9aa5', 'G': '#d4eef2'}

pouch = [
    '................',
    '................',
    '......o..o......',
    '.....oTooTo.....',
    '......oTTo......',
    '.....oooooo.....',
    '....oPPPPPPo....',
    '...oPPHPPPPPo...',
    '..oPPHPPPPPPPo..',
    '..oPPPPPPPPPPo..',
    '..oPPPPPPPPPDo..',
    '..oPPPPPPPPDDo..',
    '...oPPPPPPDDo...',
    '....oooooooo....',
    '................',
    '................',
]
pouch = overlay(pouch, ['.ooo.', 'oYYYo', 'oYyYo', 'oYYYo', '.ooo.'], 10, 10)
POUCH = {'P': '#b07a45', 'H': '#c98d55', 'D': '#8a5c30', 'T': '#7a2540',
         'Y': '#f2c94c', 'y': '#d9a020'}

whisk = [
    '................',
    '.....oooooo.....',
    '....oGGGGGGo....',
    '...oGo.GG.oGo...',
    '...oG..GG..Go...',
    '...oG..GG..Go...',
    '...oGo.GG.oGo...',
    '....oGo..oGo....',
    '.....oGGGGo.....',
    '......oGGo......',
    '......oHHo......',
    '......oGGo......',
    '......oGDo......',
    '......oGDo......',
    '.......oo.......',
    '................',
]
whisk = overlay(whisk, ['.S.', 'SSS', '.S.'], 12, 1)
whisk = overlay(whisk, ['.S.', 'SSS', '.S.'], 1, 10)
WHISK = {'G': '#f2c94c', 'H': '#fff0b8', 'D': '#d9a020', 'S': '#fff0b8'}

ICONS = [
    ('energy-jar', jar, JAR),
    ('coin-pouch', pouch, POUCH),
    ('golden-whisk', whisk, WHISK),
]

if __name__ == '__main__':
    sheet(ICONS, 'batch6_bonus.png')
    print('ok')
