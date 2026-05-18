import sharp from "sharp"
import { readFileSync, mkdirSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, "..", "public")
const iconsDir = join(publicDir, "icons")

mkdirSync(iconsDir, { recursive: true })

const svgBuffer = readFileSync(join(publicDir, "icon.svg"))

const sizes = [192, 512]

async function generate() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon-${size}x${size}.png`))
    console.log(`Generated icon-${size}x${size}.png`)
  }

  writeFileSync(join(iconsDir, ".gitkeep"), "")
  console.log("Done!")
}

generate()
