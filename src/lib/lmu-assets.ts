import path from "path"
import fs from "fs"

const ASSETS = path.join(process.cwd(), "public", "lmu-assets")

// Track slug → LMU UI background/logo filename (without extension)
const TRACK_SLUG_MAP: Record<string, string> = {
  // WEC circuits
  "sebring-international-raceway": "sebringwec",
  "sebring":                        "sebringwec",
  "circuit-de-spa-francorchamps":   "spawec",
  "spa-francorchamps":              "spawec",
  "spa":                            "spawec",
  "circuit-de-la-sarthe":           "lemanswec",
  "le-mans":                        "lemanswec",
  "fuji-speedway":                  "fujiwec",
  "fuji":                           "fujiwec",
  "autodromo-nazionale-monza":      "monzawec",
  "monza":                          "monzawec",
  "autodromo-enzo-e-dino-ferrari":  "imolawec",
  "imola":                          "imolawec",
  "bahrain-international-circuit":  "bahrainwec",
  "bahrain":                        "bahrainwec",
  "circuit-of-the-americas":        "cotawec",
  "cota":                           "cotawec",
  "autodromo-jose-carlos-pace":     "interlagoswec",
  "interlagos":                     "interlagoswec",
  "autodromo-internacional-do-algarve": "portimaowec",
  "portimao":                       "portimaowec",
  "lusail-international-circuit":   "qatarwec",
  "qatar":                          "qatarwec",
  // ELMS circuits
  "circuit-de-barcelona-catalunya": "barcelonaelms",
  "barcelona":                      "barcelonaelms",
  "circuit-paul-ricard":            "paulricardelms",
  "paul-ricard":                    "paulricardelms",
  "silverstone-circuit":            "silverstoneelms",
  "silverstone":                    "silverstoneelms",
}

// Car name keyword → manufacturer logo SVG filename (in public/lmu-assets/manufacturer/)
const MANUFACTURER_MAP: Array<[string[], string]> = [
  [["peugeot"],                      "Brand=Peugeot.svg"],
  [["ferrari"],                      "Brand=Ferrari.svg"],
  [["toyota"],                       "Brand=Toyota.svg"],
  [["porsche"],                      "Brand=Porsche.svg"],
  [["cadillac"],                     "Brand=Cadillac.svg"],
  [["bmw"],                          "Brand=BMW.svg"],
  [["alpine"],                       "Brand=Alpine.svg"],
  [["lamborghini"],                  "Brand=Lamborghini.svg"],
  [["isotta", "fraschini"],          "Brand=Isotta Fraschini.svg"],
  [["vanwall"],                      "Brand=Vanwall.svg"],
  [["ford"],                         "Brand=Ford.svg"],
  [["aston", "martin"],              "Brand=Aston Martin.svg"],
  [["mclaren"],                      "Brand=McLaren.svg"],
  [["chevrolet", "corvette"],        "Brand=Corvette.svg"],
  [["genesis"],                      "Brand=Genesis.svg"],
  [["glickenhaus"],                  "Brand=Glickenhaus.svg"],
  [["mercedes"],                     "Brand=Mercedes-AMG.svg"],
  [["lexus"],                        "Brand=Lexus.svg"],
  [["ligier"],                       "Brand=Ligier.svg"],
  [["oreca"],                        "Brand=Oreca.svg"],
  [["ginetta"],                      "Brand=Ginetta.svg"],
]

function readAsBase64(filePath: string): string | null {
  try {
    const buf = fs.readFileSync(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const mime =
      ext === "png"  ? "image/png"  :
      ext === "svg"  ? "image/svg+xml" :
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      "application/octet-stream"
    return `data:${mime};base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}

export function getTrackBackground(trackSlug: string): string | null {
  const key = TRACK_SLUG_MAP[trackSlug]
  if (!key) return null
  return readAsBase64(path.join(ASSETS, "tracks", "backgrounds", `${key}.jpg`))
}

export function getTrackLogo(trackSlug: string): string | null {
  const key = TRACK_SLUG_MAP[trackSlug]
  if (!key) {
    const defaultPath = path.join(ASSETS, "tracks", "logos", "Circuit=Default.svg")
    return readAsBase64(defaultPath)
  }
  const filePath = path.join(ASSETS, "tracks", "logos", `${key}.svg`)
  if (fs.existsSync(filePath)) return readAsBase64(filePath)
  // Some circuits have both wec/elms variants — try fallbacks
  for (const suffix of ["wec", "elms", ""]) {
    const base = key.replace(/(wec|elms)$/, suffix)
    const p = path.join(ASSETS, "tracks", "logos", suffix ? `${base}.svg` : `${base}.svg`)
    if (fs.existsSync(p)) return readAsBase64(p)
  }
  return readAsBase64(path.join(ASSETS, "tracks", "logos", "Circuit=Default.svg"))
}

export function getManufacturerLogo(carName: string): string | null {
  const lower = carName.toLowerCase()
  for (const [keywords, filename] of MANUFACTURER_MAP) {
    if (keywords.every(k => lower.includes(k))) {
      return readAsBase64(path.join(ASSETS, "manufacturer", filename))
    }
  }
  return readAsBase64(path.join(ASSETS, "manufacturer", "Brand=Default.svg"))
}

export function getUrApexLogo(): string | null {
  return readAsBase64(path.join(process.cwd(), "public", "urapex-logo.png"))
}

export function getLmuLogo(): string | null {
  return readAsBase64(path.join(ASSETS, "lmu-logo.svg"))
}

export function loadFont(name: string): Buffer | null {
  try {
    return fs.readFileSync(path.join(ASSETS, "fonts", name))
  } catch {
    return null
  }
}
