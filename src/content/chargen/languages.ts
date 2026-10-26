/** Languages: spoken tongues with the scripts they are written in, and the scripts. Names are kept as in the source; `en` is the English form. */
export interface Spoken {
  sv: string;
  en: string;
  scripts: string[];
  where: string;
}

export const SPOKEN: Spoken[] = [
  { sv: 'Adask', en: 'Adask', scripts: [], where: 'Adasians' },
  { sv: 'Ashariska', en: 'Asharian', scripts: ['Jargisk skrift'], where: 'The Asharina peninsula' },
  { sv: 'Coloniska', en: 'Colonian', scripts: ['Colonisk skrift'], where: 'Nearly dead; scholars' },
  { sv: 'Eirov', en: 'Eirov', scripts: ['Anitna'], where: 'Taups' },
  { sv: 'Faliska', en: 'Falian', scripts: ['Falisk skrift'], where: 'Cirefalians' },
  { sv: 'Felya alarina', en: 'Felya alarina', scripts: ['Felya-nai', 'Thalaskisk skrift'], where: 'Alarinn, Léaram elves' },
  { sv: 'Felya nari', en: 'Felya nari', scripts: [], where: 'Henéa elves' },
  { sv: 'Felya sanari', en: 'Felya sanari', scripts: ['Felya-nai'], where: 'Elves of the Sanari alliance' },
  { sv: 'Forianska', en: 'Forian', scripts: ['Foriansk skrift'], where: 'Forion' },
  { sv: 'Genvero', en: 'Genvero', scripts: [], where: 'Genvers' },
  { sv: 'Jahanniska', en: 'Jahannish', scripts: [], where: 'Jahanns' },
  { sv: 'Kamorianska', en: 'Kamorian', scripts: [], where: 'Kamor' },
  { sv: 'Kejserlig jargiska', en: 'Imperial Jargian', scripts: ['Jargisk skrift'], where: 'Priests, officials and nobles of the empire' },
  { sv: "La'itha", en: "La'itha", scripts: [], where: 'Misslor' },
  { sv: 'Linga cena', en: 'Linga cena', scripts: ['Logayam'], where: 'The mage order, mystics' },
  { sv: 'Linga ignotam', en: 'Linga ignotam', scripts: ['Logayam'], where: 'An enchanted tongue: scholars, primal beings' },
  { sv: 'Linga lomena', en: 'Linga lomena', scripts: ['Logayam'], where: 'Ebhron' },
  { sv: 'Lohemiska', en: 'Lohemian', scripts: ['Umingo', 'Tengrim', 'Orongohongo'], where: 'The Great Archipelago' },
  { sv: 'Lägre jargiska', en: 'Low Jargian', scripts: ['Jargisk skrift'], where: 'The Jargian Empire' },
  { sv: 'Momolanska', en: 'Momolan', scripts: ['Tengrim'], where: 'Momolan' },
  { sv: 'Mûhadinska', en: 'Mûhadin', scripts: ['Tengrim'], where: 'Mûhad' },
  { sv: 'Nanaqee', en: 'Nanaqee', scripts: [], where: 'Veddo' },
  { sv: 'Nermadiska', en: 'Nermadian', scripts: ['Thalaskisk skrift'], where: 'Nermada' },
  { sv: 'Ramoriska', en: 'Ramorian', scripts: ['Ramorisk skrift'], where: 'Dead; scholars' },
  { sv: 'Rauniska', en: 'Raunish', scripts: ['Thalaskisk skrift'], where: 'Raunlanders' },
  { sv: 'Rechin', en: 'Rechin', scripts: [], where: 'Kragg-Eyrens' },
  { sv: 'Rukh', en: 'Rukh', scripts: ['Rukh-nekh'], where: 'Dwarves' },
  { sv: 'Sabriska', en: 'Sabrian', scripts: ['Thalaskisk skrift'], where: 'Consaber' },
  { sv: 'Sakhra', en: 'Sakhra', scripts: [], where: 'Tirak (also their sign language)' },
  { sv: 'Souka', en: 'Souka', scripts: ['Anit-runor'], where: 'Taups of the Eino valley' },
  { sv: 'Targatiska', en: 'Targatian', scripts: ['Jargisk skrift'], where: 'Damarien' },
  { sv: 'Tavrit', en: 'Tavrit', scripts: ['Anitna', 'Logayam'], where: 'Ebhronite taups' },
  { sv: 'Tebramad', en: 'Tebramad', scripts: ['Falisk skrift'], where: 'Ancient; Cirefalian scholars' },
  { sv: 'Thalaska', en: 'Thalaskan', scripts: ['Thalaskisk skrift'], where: 'Thalamur' },
  { sv: 'Enariska', en: 'Enarian', scripts: [], where: 'Toshers' },
  { sv: 'Ihn', en: 'Ihn', scripts: [], where: 'Toshers' },
  { sv: 'Niwim', en: 'Niwim', scripts: [], where: 'Toshers' },
  { sv: 'Karak-nas', en: 'Karak-nas', scripts: [], where: 'Toshers' },
  { sv: "Pih'te", en: "Pih'te", scripts: [], where: 'Toshers' },
  { sv: 'Valacha', en: 'Valacha', scripts: ['Felya-nai'], where: 'Wind monks' },
  { sv: 'Vallanboriska', en: 'Vallanborian', scripts: ['Jargisk skrift'], where: 'Northern Damarien' },
  { sv: 'Vannai', en: 'Vannai', scripts: [], where: 'Fedaks (the script is lost)' },
  { sv: 'Äldre coloniska', en: 'Old Colonian', scripts: ['Colonisk skrift'], where: 'Mystics and historians' },
];

export const SCRIPTS: { sv: string; en: string }[] = [
  { sv: 'Anit-runor', en: 'Anit runes' },
  { sv: 'Anitna', en: 'Anitna' },
  { sv: 'Colonisk skrift', en: 'Colonian script' },
  { sv: 'Falisk skrift', en: 'Falian script' },
  { sv: 'Felya-nai', en: 'Felya-nai' },
  { sv: 'Foriansk skrift', en: 'Forian script' },
  { sv: 'Jargisk skrift', en: 'Jargian script' },
  { sv: 'Logayam', en: 'Logayam' },
  { sv: 'Orongohongo', en: 'Orongohongo' },
  { sv: 'Ramorisk skrift', en: 'Ramorian script' },
  { sv: 'Rukh-nekh', en: 'Rukh-nekh' },
  { sv: 'Tengrim', en: 'Tengrim' },
  { sv: 'Thalaskisk skrift', en: 'Thalaskan script' },
  { sv: 'Umingo', en: 'Umingo' },
];

const NAMES = new Map<string, string>([...SPOKEN.map((l) => [l.sv, l.en] as [string, string]), ...SCRIPTS.map((l) => [l.sv, l.en] as [string, string])]);

/** English name for a language or script (unknown names, e.g. typed by the player, pass through). */
export function languageEn(sv: string): string {
  return NAMES.get(sv) ?? sv;
}
