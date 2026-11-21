import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = dirname(fileURLToPath(import.meta.url))
const srcDir = join(root, 'email-icons')
const outDir = join(root, '..', 'public', 'email')

const sizes = {
  'icon-phone.png': { file: 'icon-phone.svg', w: 48, h: 48 },
  'icon-email.png': { file: 'icon-email.svg', w: 48, h: 48 },
  'icon-web.png': { file: 'icon-web.svg', w: 48, h: 48 },
  'icon-telegram.png': { file: 'icon-telegram.svg', w: 48, h: 48 },
  'icon-whatsapp.png': { file: 'icon-whatsapp.svg', w: 48, h: 48 },
  'sig-divider.png': { file: 'sig-divider.svg', w: 12, h: 160 },
}

for (const [outName, spec] of Object.entries(sizes)) {
  const svg = readFileSync(join(srcDir, spec.file), 'utf8')
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: spec.w },
    background: 'transparent',
  })
  const png = resvg.render().asPng()
  writeFileSync(join(outDir, outName), png)
  console.log('wrote', outName, spec.w, 'x', spec.h)
}
