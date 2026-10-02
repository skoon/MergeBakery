from pixart import sheet

toaster = [
    '................',
    '................',
    '................',
    '................',
    '.oooooooooooooo.',
    '.oMMMMMMMMMMMMo.',
    '.oMooooooooMMMo.',
    '.oMoWWWWWWoMdMo.',
    '.oMoWYYYYWoMMMo.',
    '.oMoWWWWWWoMdMo.',
    '.oMooooooooMMMo.',
    '.oKKKKKKKKKKKKo.',
    '.oooooooooooooo.',
    '..oo........oo..',
    '................',
    '................',
]
TOASTER = {'M': '#9ed9c3', 'K': '#6fae9b', 'W': '#f2a040', 'Y': '#f7d774', 'd': '#ffffff'}

brick = [
    '................',
    '.....oooooo.....',
    '...ooBBbBBBoo...',
    '..oBbBBBBbBBBo..',
    '.oBBBBbBBBBbBBo.',
    '.obBBBBBBbBBBBo.',
    '.oBBBooooooBBbo.',
    '.oBBoFFFFFFoBBo.',
    '.obBoFYYYYFoBBo.',
    '.oBBoFYrrYFobBo.',
    '.oBBoFFFFFFoBBo.',
    'oooooooooooooooo',
    'oSSSSSSSSSSSSSSo',
    'oKKKKKKKKKKKKKKo',
    'oooooooooooooooo',
    '................',
]
BRICK = {'B': '#b85a4a', 'b': '#8a3a2a', 'F': '#c0392b', 'Y': '#f7d774', 'r': '#f2a040',
         'S': '#9a9aa5', 'K': '#6a6a74'}

deck = [
    '..........oo....',
    '..........oGo...',
    '.oooooooooooooo.',
    '.oSSSSSSSSSSSSo.',
    '.oSoooooooodSSo.',
    '.oSoWWYYWWoSSSo.',
    '.oSoWWWWWWodSSo.',
    '.oSoooooooooSSo.',
    '.oSSSSSSSSSSSSo.',
    '.oSoooooooodSSo.',
    '.oSoWWYYWWoSSSo.',
    '.oSoWWWWWWodSSo.',
    '.oSoooooooooSSo.',
    '.oKKKKKKKKKKKKo.',
    '.oooooooooooooo.',
    '..oo........oo..',
]
DECK = {'S': '#c9cdd1', 'K': '#9a9aa5', 'W': '#f2a040', 'Y': '#f7d774', 'd': '#e05a5a', 'G': '#9a9aa5'}

ICONS = [('toaster-oven', toaster, TOASTER), ('brick-oven', brick, BRICK), ('deck-oven', deck, DECK)]

if __name__ == '__main__':
    sheet(ICONS, 'ovens.png'); print('ok')
