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
  'lcd-v1': {
    hero: [
      ['3f9a1c7e5b208d46', '71e1fc2fd6e3dfab043b535caee2c392ca71377ae4e3a461fb706adb8f9347c6'],
      ['b27d0e4a91c6f358', '5f3296a056e4543cae72a8e569c4accb4c8eacae01b031d54c5ef13b6bdda1d8'],
      ['0c58e1d3a79f4b62', '1f1c19734f7a28b603609fd9c19fbb51c7f289d89cc6cdb56900f05a9ded5797'],
      ['e913b6f0482ca7d5', 'e4c3cb8a13cb83f1dc284da663eab46ddac9416b271805f7c7443ea9e78126ac'],
      ['5a07c9e2d1f84b36', '75cc41be1ca5110861ba4199d2288cf642427539718d833f936cb43f06bcd26f'],
    ],
    corpus: '33fcab8d3a123a8767f72969b1c99dbe5cc52f7781de87b33edc62e0299a289d',
    odd: [
      '3791b495c45cf90e034fdb36648e27dc19a9af8c5e32a23a80305b9e61643494',
      'da76531e257a0d4fa534197c186458bb14eb41fd1e78b4b8cff80f1d320dc781',
    ],
  },
  'memphis-v1': {
    hero: [
      ['3f9a1c7e5b208d46', 'afb5cb1f223bed198ad50d82f0952601a70085f56a6bf2ff607f1138114896e6'],
      ['b27d0e4a91c6f358', 'af4c256f1a96a8c43241f667ce2593c1987c60f25266a166daa0a8697b00f229'],
      ['0c58e1d3a79f4b62', '7f6cd4628ad87759595fbcf4826a68c1b9cabb57d589f6446e31692bb85e816c'],
      ['e913b6f0482ca7d5', 'f8f622e1aca3e5c190e217b05a09a4343aea8ffdae885a61a87e74370c8a6cbb'],
      ['5a07c9e2d1f84b36', '391ca5844c617db3474ab0258554fa3f9cde57751a14c6a841ad9d99d163fe0d'],
    ],
    corpus: '2ea34bf8cc10fecc9466a7caa3018251211db7e0f26b2fc7d3dfe13cc5145211',
    odd: [
      'd444f4982d28dcf46c68777d2e74259c79573d6af773d0ecbfffff9412e87b1a',
      '161deca00fa97f6ab9c7019e5f60877783e356ed7d5997d11d0ac841f8e803c8',
    ],
  },
  'blueprint-v1': {
    hero: [
      ['3f9a1c7e5b208d46', '42edae5c3986f5bd29c7c37fe1bc6db07060237a7b03a23afd785dd2f59952c8'],
      ['b27d0e4a91c6f358', '47403589e8567fff3d8d5daed10de5ce1bb1c1a9faac28a8c7cf03774aa89807'],
      ['0c58e1d3a79f4b62', '393a0c3e209520072e570f18818f7931151e8cf0762a33f9d60df3c2b036ba5c'],
      ['e913b6f0482ca7d5', '730d907e43aae5009107377c858d4ade6c8c85eebdc89602789e97cce1432950'],
      ['5a07c9e2d1f84b36', '34be3f194b6a9ad86cb87474a6eb3f0e5cb35e344ff8a99ad6fcc376a623555f'],
    ],
    corpus: 'ead313e0610f77ce2ac784ba22b69cbde70ee488d9646047204a1dbd6cc47085',
    odd: [
      '7b1107c6c8d553d78f4460098aa1a2b7a7688dc16aee57c797c7fd69aea10a40',
      'e36ed7c7f61933da68b4d069e8b63c3d227c6197c9447e229c8cfc67d27a94bb',
    ],
  },
};
export const SPRITES = '3bd0982771652d57e8f8c603bd73bacb2594f2e3ddf1229d5820ba40c714bab4';

