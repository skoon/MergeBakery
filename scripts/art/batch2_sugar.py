from pixart import sheet

sugar_cube = [
    '................',
    '................',
    '.......oo.......',
    '.....ooHHoo.....',
    '...ooHHHHHHoo...',
    '.ooHHHHHHHHHHoo.',
    '.oWWHHHHHHHHPPo.',
    '.oWWWWHHHHPPPPo.',
    '.oWWWWWWPPPPPPo.',
    '.oWWWWWWPPPPPPo.',
    '.oWWWWWWPPPPPPo.',
    '.oWWWWWWPPPPPPo.',
    '.ooWWWWWPPPPPoo.',
    '...ooWWWPPPoo...',
    '.....ooWPoo.....',
    '.......oo.......',
]
CUBE = {'H': '#ffffff', 'W': '#fff0f5', 'P': '#f9b8cd'}

syrup = [
    '................',
    '......oooo......',
    '......oCCo......',
    '......oCCo......',
    '.....oooooo.....',
    '......oGGo......',
    '.....oGGGGo.....',
    '....oRRRRRRo....',
    '...oRRHRRRRRo...',
    '...oRHRLLLLRo...',
    '...oRRRLLLLRo...',
    '...oRRRRRRRKo...',
    '...oRRRRRRKKo...',
    '...oKKKKKKKKo...',
    '....oooooooo....',
    '................',
]
SYRUP = {'C': '#c9a57a', 'G': '#d4eef2', 'R': '#f27ba0', 'H': '#f9b8cd',
         'L': '#fff4d6', 'K': '#c9557c'}

caramel = [
    '................',
    '................',
    '................',
    '................',
    '.....oooooo.....',
    '....oCHHHCCo....',
    'oo.oCHHCCCCCo.oo',
    'oWooCHCCCCCCooWo',
    'oWWoCCCCCCCCoWWo',
    'oWooCCCCCCCDooWo',
    'oo.oCCCCCCDDo.oo',
    '....oCCCCDDo....',
    '.....oooooo.....',
    '................',
    '................',
    '................',
]
CARAMEL = {'W': '#f9b8cd', 'C': '#c47a2c', 'H': '#e8a85a', 'D': '#8a4f1a'}

cocoa = [
    '................',
    '........o.......',
    '.......oGo......',
    '.....oooooo.....',
    '....oBBbBBBo....',
    '...oBHBbBBBBo...',
    '...oBHBbBBBBo...',
    '..oBHBBbBBBBBo..',
    '..oBBBBbBBBBDo..',
    '..oBBBBbBBBBDo..',
    '..oBBBBbBBBDDo..',
    '...oBBBbBBDDo...',
    '...oBBBbBDDDo...',
    '....oBBbDDDo....',
    '.....oooooo.....',
    '................',
]
COCOA = {'B': '#a8642e', 'H': '#c98550', 'b': '#7d4620', 'D': '#6a3a1a', 'G': '#5aa85a'}

chocolate = [
    '................',
    '.oooooooooooooo.',
    '.oHHCdHHCdHHCdo.',
    '.oHCCdHCCdHCCdo.',
    '.oddddddddddddo.',
    '.oHHCdHHCdHHCdo.',
    '.oHCCdHCCdHCCdo.',
    '.oddddddddddddo.',
    'oooooooooooooooo',
    'oFFSFFFFFFFFFFFo',
    'oPPPPPPPPPPPPPPo',
    'oPPwwwwwwwwwwPPo',
    'oPPPPPPPPPPPPPPo',
    'oFFFFFFFFFFFFFKo',
    'oooooooooooooooo',
    '................',
]
CHOC = {'H': '#8f5530', 'C': '#6a3a1a', 'd': '#4a2812', 'F': '#d9d9e0', 'S': '#ffffff',
        'K': '#9a9aa5', 'P': '#f27ba0', 'w': '#fff0f5'}

truffles = [
    '................',
    '....oo....oo....',
    '...oRRo..oRRo...',
    '...oRRRooRRRo...',
    '....ooRRRRoo....',
    '.oooooooooooooo.',
    '.oPPPPPRRPPPPPo.',
    '.oPHPPPRRPPPPPo.',
    '.oRRRRRRRRRRRRo.',
    '.oPPPPPRRPPPPPo.',
    '.oPPPPPRRPPPPPo.',
    '.oPPPPPRRPPPPKo.',
    '.oPPPPPRRPPPKKo.',
    '.oooooooooooooo.',
    '................',
    '................',
]
TRUFFLE = {'P': '#c9557c', 'H': '#f27ba0', 'K': '#8d1940', 'R': '#f2c94c'}

ICONS = [
    ('sugar-cube', sugar_cube, CUBE),
    ('syrup-bottle', syrup, SYRUP),
    ('caramel', caramel, CARAMEL),
    ('cocoa-bean', cocoa, COCOA),
    ('chocolate-bar', chocolate, CHOC),
    ('truffle-box', truffles, TRUFFLE),
]

if __name__ == '__main__':
    sheet(ICONS, 'batch2_sugar.png')
    print('ok')
