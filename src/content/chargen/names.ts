/**
 * Name suggestions per naming culture (a small selection, not the full lists),
 * with our own one-line summary of how each culture names people.
 * f = women's names, m = men's names, n = gender-neutral names.
 */

export interface NameCulture {
  en: string;
  custom: string;
  f?: string[];
  m?: string[];
  n?: string[];
  /** Family, house or clan names to add, where the culture uses them. */
  family?: string[];
}

const L = (s: string) => s.split(', ');

export const NAME_CULTURES: Record<string, NameCulture> = {
  adasier: { en: 'Adasian', custom: 'One personal name, always new or reshaped: you don\'t live on your ancestors\' fame.', f: L('Aria, Cazena, Giranni, Ivai, Keza, Nivei, Rosti, Zaari'), m: L('Aanaz, Cadas, Erom, Kazar, Lazazel, Raan, Telken, Zavier') },
  arkipelagier: { en: 'Archipelagian', custom: 'Names are added through life as honours; family names often start with "dor" (from).', f: L('Amylla, Balata, Eshune, Juna, Londora, Ona, Ranya, Yvanna'), m: L('Aricandor, Domonya, Gamba, Kanda-Aku, Morikor, Parantor, Shamake, Tomtora') },
  asharier: { en: 'Asharian', custom: 'A first name plus a surname, father\'s name, trade or epithet; many borrow foreign names.', f: L('Alida, Belana, Clivia, Felisa, Isalona, Lisetta, Rosanna, Viola'), m: L('Abram, Coran, Danyl, Gart, Herkel, Jerras, Rufus, Vikram'), n: L('Alix, Kay, Lawa, Morgan, Shen') },
  cirefalier: { en: 'Cirefalian', custom: 'No surnames: a title or honour, then "of house prince so-and-so\'s family".', f: L('Azita, Chenta, Darjha, Gannima, Izna, Meleka, Pelita, Torza'), m: L('Azit, Cerec, Durzmal, Gordaz, Jhor, Mzian, Sycorin, Tzilan') },
  damarier: { en: 'Damarian', custom: 'Commoners add home, trade or a nickname; free farmers use their farm; high nobles carry old bloody family names.', f: L('Adela, Carmilla, Darella, Elzbieta, Laena, Mircalla, Selima, Viorica'), m: L('Adriel, Bors, Doriel, Grim, Igor, Marok, Tarsin, Xander') },
  ebhroniter: { en: 'Ebhronite', custom: 'A melting pot: a first name plus the father\'s family name.', f: L('Apashara, Chayani, Devadhara, Himayi, Khia, Madalasa, Rājni, Vasandra'), m: L('Arthan, Dasin, Ganishka, Kastis, Neos, Simha, Varis, Zor'), n: L('Athis, Harxal, Mirinal, Umang, Xaxi') },
  fedaker: { en: 'Fedak', custom: 'A personal name, the father\'s name (+a for sons, +ina for daughters) and the extended family\'s name.', f: L('Anesh, Aysel, Eliso, Leyla, Maral, Parvana, Tamar, Zabel'), m: L('Anar, Armen, Garen, Isidor, Jiran, Levon, Sevan, Vardan') },
  forianer: { en: 'Forian', custom: 'A double name: the father\'s (for men) or mother\'s (for women) name, then your own.', f: L('Aymana, Chineye, Funa, Lawa, Maya, Ngozi, Saraya, Yana'), m: L('Azuka, Chalad, Dhanjo, Eze, Hamud, Kinte, Okang, Zan') },
  genver: { en: 'Genver', custom: 'A name read from a sacrifice\'s entrails at birth, later a byname; many take a Jargian name abroad.', f: L('Amavil, Estal, Gorthu, Ipna, Lothrui, Naltal, Sethra, Varui'), m: L('Arruns, Escil, Fernet, Gromiu, Lammert, Noltrus, Tholk, Vekranth') },
  jahanner: { en: 'Jahann', custom: 'Like the Jargians: a first name and a byname from trade, father or home; saints\' names are common.', f: L('Amoa, Azira, Bellona, Elishia, Kalizha, Mariâl, Nadira, Zinda'), m: L('Benishen, Doralam, Farâz, Khabi, Madjed, Narjan, Sabil, Zabin') },
  jargier: { en: 'Jargian', custom: 'A personal name and often a second one; the devout take a saint\'s name, and most names have set nicknames.', f: L('Belicia, Cornelia, Decima, Felicie, Ione, Petra, Selina, Valentina'), m: L('Antonius, Boethius, Derados, Felix, Marius, Quentin, Tatian, Zenos') },
  kamorianer: { en: 'Kamorian', custom: 'Named after a night sound the pregnant mother heard, plus a byname like Ironbearer or Wolfkin.', n: L('Akk\'a, Ba-vir, Dh\'ki, F\'ss, H\'ss, Ke-kou, N\'yah, Ri\'jik, Ss\'ka, Wrr') },
  'kragg-eyrener': { en: 'Kragg-Eyren', custom: 'A byname telling your deeds or role in the tribe; the neutral names are chosen by the seyur themselves.', f: L('Argynd, Aya, Demira, Fura, Jenda, Katra, Narjin, Tekla'), m: L('Adham, Bolk, Fjal, Harn, Krole, Njalar, Skolgar, Zoran'), n: L('Ale, Berend, Fern, Hress, Kels, Morn, Sonna, Venn') },
  muhadiner: { en: 'Mûhadin', custom: 'A traditional first name, then "Ben" (son of) or "Bet" (daughter of) and the father\'s name.', f: L('Amila, Hâla, Khalima, Leile, Mahmia, Sharzad, Telle, Zhana'), m: L('Amin, Erzhan, Hamze, Isam, Matrik, Namur, Radi, Ûzan') },
  raunlanningar: { en: 'Raunlander', custom: 'A personal name with horde and family, and your role in the horde.', f: L('Anasi, Berea, Emari, Kara, Mira, Reva, Shera, Zeynet'), m: L('Akurshul, Dov, Garnad, Ikan, Karan, Nevas, Sodor, Tarin') },
  sabrier: { en: 'Sabrian', custom: 'A name with -daughter or -son of the father, and a byname; nobles add a family name and coat of arms.', f: L('Beatriz, Clarine, Fiony, Guendolyn, Megain, Nia, Rianon, Tiana'), m: L('Albagor, Conner, Faulk, Geredan, Lestat, Nadian, Rogier, Yrwen') },
  soldier: { en: 'Soldian', custom: 'A personal name and the father\'s (sometimes the mother\'s) name; crafters take names from their trade.', f: L('Blenda, Ebeline, Kira, Mika, Naima, Othella, Tyrne, Ursula'), m: L('Bardo, Cronlan, Essik, Haquin, Johar, Otho, Segart, Zorián'), n: L('Alyx, Dao, Kie, Renniel, Saulera') },
  tauper: { en: 'Taup', custom: 'No single custom: an epithet in some places, family names in others; couples keep the more famous one.', f: L('Aodev, Asis, Emelis, Ides, Melpome, Odarys, Urhanis, Ysmanes'), m: L('Apostus, Edurav, Italos, Oados, Uranov, Yicov, Ymar, Zolok'), n: L('Eresai, Haizea, Iens, Laida, Veos') },
  thalasker: { en: 'Thalask', custom: 'Three names: personal, the father\'s (+ir or +ira) and a family name; citizens add their house.', f: L('Amida, Fatia, Idala, Jesana, Kalina, Myriyam, Revana, Ziana'), m: L('Amir, Daoud, Efram, Jehan, Kalim, Nadir, Reubin, Takhim'), family: L('Abhixia, Cartika, Harim, Myrdinor, Sala, Vaganda') },
  tosher: { en: 'Tosher', custom: 'A one-syllable child name until a trance rite gives your soul name; great deeds add a byname.', f: L('Ahida, Binte, Danga, Inanda, Koloku, Sukina, Tululu, Unni'), m: L('Agolo, Badara, Djeri, Galandi, Hambo, Mokele, Omoro, Zewon') },
  veddo: { en: 'Veddo', custom: 'No family names; your true name is kept from strangers, who get a nickname instead.', f: L('Aala, Ina, Miani, Nalangi, Pangiq, Sangi, Uja, Vala'), m: L('Avu, Jaan, Kujaq, Lugut, Minu, Qaraq, Salat, Ujaq'), n: L('Frostbite, Half-moon, Northern Light, Fresh Snow, Foxtail, Storm, the Seal, Spring Wind') },
  vastmarkare: { en: 'Västmarker', custom: 'A name and an epithet (trade, home or nickname); finer folk add a house named for an ancestor.', f: L('Carminha, Dauva, Ilona, Leona, Nella, Safira, Tara, Zirel'), m: L('Adrien, Cornel, Feldan, Kamand, Lars, Pelgrin, Tibor, Yegor'), n: L('Indigo, Lucca, Maro, Noa, Yrvin') },
  henea: { en: 'Henéa elf', custom: 'Names are chosen for their meaning and always translated; all are gender-neutral.', n: L('Bear-slayer, Dances-in-fire, Hawk Wind, Honey, Moon, Summer, Laughs-in-battle, Eagle Wing, Wind Listener, Black Arrow') },
  learam: { en: 'Léaram elf', custom: 'Personal, family and clan name ("sìol"), and proudly the famous ancestors ("t\'an", blood).', f: L('Alya, Brithei, Erianni, Kiyona, Liara, Morana, Sasanni, Tilessa'), m: L('Aidin, Cinneach, Farinn, Korben, Naranech, Reamhar, Taralin, Uter'), n: L('Avani, Cailean, Fian, Lasai, Oro, Seska, Taki'), family: L('Acarran sìol Nan\'sela, Boreth sìol Sod\'orin, Felenni sìol Geasa, Inori sìol Cuiroth') },
  pyar: { en: 'Pyar elf', custom: 'The alliance\'s names, or local ones with an elvish ending; the house ("eli") only on formal occasions.', f: L('Catelini, Daradel, Illona, Leandiel, Luniel, Meriel, Selifia, Xandira'), m: L('Begalan, Conneril, Damilian, Ivion, Larenion, Minuviel, Sebulon, Yvlys'), n: L('Athidan, Elyien, Feliel, Harinal, Zanira'), family: L('Torani eli Atana, Shilia eli Hahna, Vicohea eli Salusta') },
  sanari: { en: 'Sanari alliance', custom: 'A personal name and a family name, tied to a line ("fin" among the sanari).', f: L('Alurindel, Avaliel, Coriolin, Elasaid, Kelmone, Lyvani, Nyneve, Tilia'), m: L('Aralion, Belion, Denelian, Edarion, Isanion, Kirion, Lunerian, Vilian'), n: L('Anidel, Larani, Liusad, Niare, Sennira, Vaira'), family: L('Arnáili fin Tanisol, Celendor fin Emori\'elin, Dunisel fin Valaina, Enera fin Visha') },
  thism: { en: 'Thism elf', custom: 'A personal name and a family name, tied to a house ("vhic").', f: L('Ceranidel, Derani, Fialari, Halenara, Letesse, Oromiri, Saseki, Ulennara'), m: L('Alean, Charadan, Faranion, Hadon, Nilian, Rakalon, Senian, Varidon'), n: L('Conorian, Duniniel, Renniel, Takian, Yenetai'), family: L('Ashtarian vhic Tanyi\'ena, Esterial vhic Avale, Morana vhic Bereida, Rumon vhic Viliandore') },
  kiriya: { en: 'Kiriya elf', custom: 'A personal name and a family name, tied to a household ("sholi").', f: L('Dunia, Evinal, Inuveni, Kiy\'ara, Micalane, Sadeine, Shoni, Yviol'), m: L('Cailean, Ecranan, Fianve, Isir, Katsanion, Layan, Ovadon, Rumon'), n: L('Halenaro, Hen\'aiyel, Liunera, Shaulera, Viryunni'), family: L('Alay sholi Keley, Fenet sholi Su\'nai\'sennive, Lessani sholi Sailenié, Varakin sholi Keley') },
  dvarg: { en: 'Dwarven', custom: 'A long string (trade, rank, name, clan, house, family, byname, ancestors), shortened to name and family or byname. All names are gender-neutral.', n: L('Arghan, Borh, Codher, Dhirkh, Genar, Haral, Khammer, Lyrakh, Mernol, Ninor, Rolvi, Torgar, Ulsher, Zurtahn') },
  tirak: { en: 'Tirak', custom: 'The mother picks the name; men\'s often end in a consonant, women\'s in a vowel. Bynames matter more than family names.', f: L('Akka, Azra, Brakka, Dûra, Ezka, Loka, Reza, Zekka'), m: L('Arog, Bomz, Drugg, Frekk, Gragg, Korr, Maak, Xakk') },
  missla: { en: 'Missla', custom: 'Three names: a public one (translated for big folk), a private one for kin and friends, and a secret one.', n: L('Strongarm, Baker, River-quick, Joy, Cat-eye, Brave, Summer, Herb-wise, Big-ear, Rose-cheek') },
};

/** Dwarven house names per clan. */
export const DWARF_HOUSES: Record<string, string[]> = {
  drezin: L('Annu, Bokor, Khornan, Myrzik, Sharva, Varthak'),
  ghor: L('Bzonim, Drafal, Hornbor, Marakh, Thuman, Zummer'),
  roghan: L('Cherkath, Durra, Gharan, Khunder, Lashkor, Tyndar'),
  zolod: L('Borlesh, Jakarh, Kvannath, Menner, Ramiz, Sommak'),
};

/** The naming culture for a people id. */
export function nameCultureOf(peopleId: string | undefined, family: string | undefined): NameCulture | undefined {
  if (!peopleId) return undefined;
  if (NAME_CULTURES[peopleId]) return NAME_CULTURES[peopleId];
  if (family && NAME_CULTURES[family]) return NAME_CULTURES[family];
  return undefined;
}
