import { CLOTH, FOLK, type FolkSpec, HAIR, SKIN } from '../../art/folk';

/**
 * The village people, as drawn (the cast of the old Reedwater map; the 3D world walks them as cards).
 * The first few reuse the art's starter cast; the rest are new combinations.
 */
export const PEOPLE: Record<string, FolkSpec> = {
  farmer: FOLK.farmer,
  baker: FOLK.baker,
  smith: FOLK.smith,
  elder: FOLK.elder,
  guard: FOLK.guard,
  wife: FOLK.wife,
  child: FOLK.child,
  traveller: FOLK.traveller,

  fisher: {
    seed: 21, build: 'avg', skin: SKIN.ruddy, hair: HAIR.grey, style: 'hat', head: CLOTH.brown, beard: 'full',
    garment: 'shirt', top: CLOTH.bluegrey, legs: CLOTH.brown, vest: CLOTH.leather, sleeves: 'rolled', right: 'stick',
  },
  fisherYoung: {
    seed: 22, build: 'lean', skin: SKIN.tan, hair: HAIR.blond, style: 'short',
    garment: 'shirt', top: CLOTH.linen, legs: CLOTH.grey, sleeves: 'rolled', right: 'bucket',
  },
  fishwife: {
    seed: 23, build: 'stout', skin: SKIN.ruddy, hair: HAIR.brown, style: 'kerchief', head: CLOTH.bluegrey,
    garment: 'dress', top: CLOTH.rust, legs: CLOTH.rust, apron: CLOTH.linen, sleeves: 'rolled', left: 'basket',
  },
  innkeeper: {
    seed: 24, build: 'stout', skin: SKIN.fair, hair: HAIR.red, style: 'short', beard: 'full',
    garment: 'shirt', top: CLOTH.linen, legs: CLOTH.brown, apron: CLOTH.white, vest: CLOTH.wine, sleeves: 'rolled', right: 'none',
  },
  herbalist: {
    seed: 25, build: 'lean', skin: SKIN.brown, hair: HAIR.black, style: 'hood', head: CLOTH.moss,
    garment: 'dress', top: CLOTH.moss, legs: CLOTH.moss, apron: CLOTH.linen, sleeves: 'long', left: 'basket',
  },
  weaver: {
    seed: 26, build: 'lean', skin: SKIN.fair, hair: HAIR.grey, style: 'bun',
    garment: 'dress', top: CLOTH.wine, legs: CLOTH.wine, apron: CLOTH.grey, sleeves: 'long',
  },
  trader: {
    seed: 27, build: 'avg', skin: SKIN.tan, hair: HAIR.brown, style: 'hat', head: CLOTH.mustard, beard: 'stubble',
    garment: 'tunic', top: CLOTH.mustard, legs: CLOTH.brown, vest: CLOTH.leather, belt: true, sleeves: 'long', right: 'none',
  },
  boy: {
    seed: 28, build: 'child', skin: SKIN.tan, hair: HAIR.brown, style: 'short',
    garment: 'tunic', top: CLOTH.moss, legs: CLOTH.brown, sleeves: 'short', right: 'stick',
  },
  girl: {
    seed: 29, build: 'child', skin: SKIN.fair, hair: HAIR.red, style: 'bun',
    garment: 'dress', top: CLOTH.bluegrey, legs: CLOTH.bluegrey, sleeves: 'short', left: 'basket',
  },
  granny: {
    seed: 30, build: 'lean', skin: SKIN.fair, hair: HAIR.grey, style: 'kerchief', head: CLOTH.grey,
    garment: 'dress', top: CLOTH.brown, legs: CLOTH.brown, apron: CLOTH.linen, sleeves: 'long', right: 'staff',
  },
  washer: {
    seed: 31, build: 'avg', skin: SKIN.brown, hair: HAIR.black, style: 'kerchief', head: CLOTH.rust,
    garment: 'dress', top: CLOTH.linen, legs: CLOTH.bluegrey, sleeves: 'rolled', right: 'bucket',
  },
  woodsman: {
    seed: 32, build: 'stout', skin: SKIN.ruddy, hair: HAIR.brown, style: 'hat', head: CLOTH.leather, beard: 'full',
    garment: 'tunic', top: CLOTH.moss, legs: CLOTH.brown, vest: CLOTH.leather, belt: true, sleeves: 'rolled', right: 'staff',
  },
  watchman: {
    seed: 33, build: 'avg', skin: SKIN.tan, hair: HAIR.black, style: 'helm', beard: 'stubble',
    garment: 'tunic', top: CLOTH.wine, legs: CLOTH.grey, vest: CLOTH.steel, sleeves: 'long', right: 'spear',
  },
  drunk: {
    seed: 34, build: 'stout', skin: SKIN.ruddy, hair: HAIR.blond, style: 'short', beard: 'stubble',
    garment: 'shirt', top: CLOTH.rust, legs: CLOTH.grey, sleeves: 'long', right: 'none',
  },
  peddler: {
    seed: 35, build: 'lean', skin: SKIN.brown, hair: HAIR.black, style: 'hood', head: CLOTH.rust,
    garment: 'tunic', top: CLOTH.rust, legs: CLOTH.brown, cloak: CLOTH.brown, left: 'basket', right: 'staff',
  },
  cooper: {
    seed: 36, build: 'stout', skin: SKIN.tan, hair: HAIR.grey, style: 'bald', beard: 'full',
    garment: 'shirt', top: CLOTH.linen, legs: CLOTH.brown, apron: CLOTH.leather, sleeves: 'short', right: 'hammer',
  },
  mother: {
    seed: 37, build: 'avg', skin: SKIN.tan, hair: HAIR.brown, style: 'long',
    garment: 'dress', top: CLOTH.mustard, legs: CLOTH.mustard, apron: CLOTH.linen, sleeves: 'long', right: 'bucket',
  },
};
