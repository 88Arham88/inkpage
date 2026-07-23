// InkPage font library
// Each entry: id, display name, css font-family, and a size/weight nudge
// so different fonts (which render at wildly different visual sizes) look
// comparable at the same "Size" slider value.
const FONT_LIBRARY = [
  { id: "kalam",      name: "Kalam (neat)",        family: "'Kalam', cursive",           sizeAdjust: 1.0,  weight: 400 },
  { id: "caveat",     name: "Caveat (casual)",      family: "'Caveat', cursive",          sizeAdjust: 1.15, weight: 500 },
  { id: "patrick",    name: "Patrick Hand (print)", family: "'Patrick Hand', cursive",    sizeAdjust: 1.0,  weight: 400 },
  { id: "homemade",   name: "Homemade Apple (cursive)", family: "'Homemade Apple', cursive", sizeAdjust: 0.85, weight: 400 },
  { id: "shadows",    name: "Shadows Into Light",   family: "'Shadows Into Light', cursive", sizeAdjust: 1.05, weight: 400 },
  { id: "reenie",     name: "Reenie Beanie (fast)", family: "'Reenie Beanie', cursive",   sizeAdjust: 1.3,  weight: 400 },
  { id: "nanum",      name: "Nanum Pen (light)",    family: "'Nanum Pen Script', cursive", sizeAdjust: 1.2, weight: 400 },
  { id: "gochi",      name: "Gochi Hand (bold-ish)", family: "'Gochi Hand', cursive",     sizeAdjust: 1.0,  weight: 400 },
  { id: "marker",     name: "Permanent Marker",     family: "'Permanent Marker', cursive", sizeAdjust: 0.85, weight: 400 },
  { id: "dancing",    name: "Dancing Script (elegant)", family: "'Dancing Script', cursive", sizeAdjust: 1.05, weight: 500 },
  { id: "sacramento", name: "Sacramento (flowing)",  family: "'Sacramento', cursive",       sizeAdjust: 1.3,  weight: 400 },
  { id: "alexbrush",  name: "Alex Brush (signature)", family: "'Alex Brush', cursive",      sizeAdjust: 1.3,  weight: 400 },
  { id: "yellowtail", name: "Yellowtail (bold script)", family: "'Yellowtail', cursive",    sizeAdjust: 1.1,  weight: 400 },
  { id: "satisfy",    name: "Satisfy (relaxed)",     family: "'Satisfy', cursive",          sizeAdjust: 1.1,  weight: 400 },
  { id: "greatvibes", name: "Great Vibes (formal script)", family: "'Great Vibes', cursive", sizeAdjust: 1.4, weight: 400 },
  { id: "marck",      name: "Marck Script (smooth)", family: "'Marck Script', cursive",     sizeAdjust: 1.15, weight: 400 },
  { id: "meaculpa",   name: "Mea Culpa (rough pen)", family: "'Mea Culpa', cursive",        sizeAdjust: 1.2,  weight: 400 },
  { id: "indieflower", name: "Indie Flower (fast, bouncy)", family: "'Indie Flower', cursive",    sizeAdjust: 1.0,  weight: 400 },
  { id: "justhand",   name: "Just Another Hand (fast)", family: "'Just Another Hand', cursive", sizeAdjust: 1.15, weight: 400 },
  { id: "zeyada",     name: "Zeyada (fast scrawl)", family: "'Zeyada', cursive",           sizeAdjust: 1.4,  weight: 400 },
  { id: "rocksalt",   name: "Rock Salt (fast, messy)",     family: "'Rock Salt', cursive",        sizeAdjust: 0.75, weight: 400 },
  { id: "sunrise",    name: "Waiting for Sunrise (fast)", family: "'Waiting for the Sunrise', cursive", sizeAdjust: 1.1, weight: 400 },
  { id: "covered",    name: "Covered By Grace (fast, light)", family: "'Covered By Your Grace', cursive", sizeAdjust: 1.2, weight: 400 },
];

// Custom fonts uploaded by the user get pushed in here at runtime
// via a FontFace + this array, so the rest of the app treats them
// identically to the built-in library.
const CUSTOM_FONTS = [];

function getAllFonts() {
  return [...FONT_LIBRARY, ...CUSTOM_FONTS];
}
