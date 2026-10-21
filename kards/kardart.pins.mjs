// kardart.pins.mjs - the PUBLISHED record of what each theme draws: sha256 of the hero cards (384 x 560), of a 36-card corpus
// (192 x 280) and of odd sizes, and of 2,000 creatures. A published theme is never changed, so these never change: a red pin
// means a published theme was edited, and the fix is a NEW theme id (synthwave-v2), not a new pin here. New themes are added
// with node tools/kards-pins.mjs <themeId>.
export const PINS = {
  'synthwave-v1': {
    hero: [
      ['3f9a1c7e5b208d46', 'd6541ece318a0c961e244e5a791df68a42e0a9ae8a20851bf1c1adce3060c1fa'],
      ['b27d0e4a91c6f358', '83a965a665a30febe3d657c514fbc866de9debcc50e917f6b1b2bf4f98caa505'],
      ['0c58e1d3a79f4b62', '8a56af8c29d2933ed67d183fa0543b6a41bf76afd380932f81ffa37f82d8feb3'],
      ['e913b6f0482ca7d5', 'a295b12329a59084bbab83aa59ea1d12318d49bf422713fab654a442dbb1ad0f'],
      ['5a07c9e2d1f84b36', 'de2bb030240f101838c1557445424554364b7ffa6a9a5896a9dd7e9a4d00bc9b'],
    ],
    corpus: '701760ce3486731833fe24a27dba6765756def4afbf41d37ddb7cfa08509b23a',
    odd: [
      '485963c5236e9a9f2352ac2d9823184034d9718543ce243e2a598043a92ada90',
      'bdd94bc5258d65d1d259c0bfef7c7aa90546efa1ec9a244eaed03849c018a814',
    ],
  },
  'blockcraft-v1': {
    hero: [
      ['3f9a1c7e5b208d46', 'aaadb4fc108dc8075ab816f67c8fa7d55839541f99c4410a6a4a18f4c1fcb68e'],
      ['b27d0e4a91c6f358', '286902521d059d63d765b264166eca21f21d656e525fdfab44f7f6a03eeb91b3'],
      ['0c58e1d3a79f4b62', 'c838710b664fa226cdc75459ab68a2fd8843e97ecf740dc853d5bb01e0b1a30d'],
      ['e913b6f0482ca7d5', '5e2d9198454f1d61f3307180271a503eee7aa167ac1bb11e8fd7e0ffcb360c1c'],
      ['5a07c9e2d1f84b36', '9b2ace924cfef590591e86c412a94c9fd442e30469c7dcba76ec25e31c442b1b'],
    ],
    corpus: 'f1073a43476c5e0e4813851afcbb9e39417112000cec7155bfa55d2043552d21',
    odd: [
      '977061755e1cbe8660d0c98567d5adcf8a73efb9290426e4c59e0f802b5ab7aa',
      '0b6ae6ec2c1c8f8b5429cee1a9a7feb723fe9010af11049c5654a2982b81f222',
    ],
  },
};
export const SPRITES = '3bd0982771652d57e8f8c603bd73bacb2594f2e3ddf1229d5820ba40c714bab4';

