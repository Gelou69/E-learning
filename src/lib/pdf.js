/**
 * Minimal, dependency-free PDF writer.
 * Produces valid A4 multi-page documents from plain text lines so the
 * e-Learning Hub can ship readable sample lessons without binary assets.
 */

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 56
const TOP = 792
const BOTTOM = 56
const LEADING = 15

const FONTS = {
  regular: { name: 'F1', base: 'Helvetica' },
  bold: { name: 'F2', base: 'Helvetica-Bold' },
  oblique: { name: 'F3', base: 'Helvetica-Oblique' },
}

const FONTS_DICT = [
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>',
]

const FONTS_RES = [
  '/F1 12 Tf 0 g',
  '/F2 12 Tf 0 g',
  '/F3 12 Tf 0 g',
]

function escapePdfText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapLine(text, font, size, maxWidth) {
  const charWidth = font === 'bold' ? size * 0.58 : font === 'oblique' ? size * 0.5 : size * 0.5
  const maxChars = Math.max(8, Math.floor(maxWidth / charWidth))
  const words = String(text).split(/\s+/)
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function buildContentStream(blocks) {
  const ops = []
  let cursor = TOP

  for (const block of blocks) {
    const size = block.size ?? 11
    const style = block.style ?? 'regular'
    const gapBefore = block.gapBefore ?? 0
    const gapAfter = block.gapAfter ?? 8
    cursor -= gapBefore

    if (block.rule) {
      ops.push('0.6 w 0.72 0.78 0.80 RG', 'q', `${MARGIN_X} ${cursor + 4} m ${PAGE_WIDTH - MARGIN_X} ${cursor + 4} l S`, 'Q')
      cursor -= 6
      continue
    }

    const lines = block.text === undefined ? [''] : wrapLine(block.text, style, size, PAGE_WIDTH - MARGIN_X * 2 - 24)

    if (cursor - lines.length * LEADING < BOTTOM) {
      ops.push('ET')
      return { ops, overflow: true }
    }

    for (let i = 0; i < lines.length; i += 1) {
      cursor -= size * 1.15
      const x = MARGIN_X + (block.indent ?? 0)
      ops.push(
        'BT',
        `/${FONTS[style].name} ${size} Tf`,
        block.color ? `${block.color}` : '0.13 0.16 0.20 rg',
        `${x} ${cursor.toFixed(2)} Td`,
        `(${escapePdfText(lines[i])}) Tj`,
        'ET',
      )
    }
    cursor -= gapAfter
  }
  return { ops, overflow: false }
}

function toStream(ops) {
  return ops.join('\n')
}

/**
 * Build a PDF Blob from a document descriptor.
 * @param {{title:string, subtitle?:string, meta?:string[], sections:Array<{heading?:string, body?:string|string[], bullets?:string[], rule?:boolean}>}} doc
 */
export function buildPdf(doc) {
  const pages = []
  let blocks = []

  const flush = () => {
    if (!blocks.length) return
    pages.push(blocks)
    blocks = []
  }

  const push = (block) => {
    const { overflow } = buildContentStream([block])
    if (overflow) {
      flush()
      blocks.push(block)
    } else {
      blocks.push(block)
    }
  };

  blocks.push({ text: doc.title, style: 'bold', size: 20, gapAfter: 4 })
  if (doc.subtitle) blocks.push({ text: doc.subtitle, style: 'oblique', size: 12, color: '0.29 0.33 0.38', gapAfter: 6 })
  if (doc.meta?.length) {
    blocks.push({ text: doc.meta.join('   |   '), size: 9, color: '0.35 0.40 0.45', gapAfter: 6 })
  }
  blocks.push({ rule: true })

  for (const section of doc.sections ?? []) {
    if (section.heading) push({ text: section.heading, style: 'bold', size: 13, color: '0.05 0.46 0.43', gapBefore: 6, gapAfter: 5 })
    if (section.body) {
      const bodies = Array.isArray(section.body) ? section.body : [section.body]
      for (const b of bodies) push({ text: b, size: 10.5, gapAfter: 6 })
    }
    if (section.bullets?.length) {
      for (const bullet of section.bullets) push({ text: `•  ${bullet}`, size: 10.5, indent: 10, gapAfter: 3 })
      push({ text: '', size: 4, gapAfter: 4 })
    }
  }

  flush()
  if (!pages.length) pages.push([{ text: '(empty document)', size: 11 }])

  const objects = []
  const addObject = (body) => {
    objects.push(body)
    return objects.length
  }

  const catalogId = 1
  const pagesId = 2
  objects.push(null, null)

  const fontIds = FONTS_DICT.map((dict) => addObject(dict))
  const pageIds = []

  pages.forEach((pageBlocks, pageIndex) => {
    const { ops } = buildContentStream(pageBlocks)
    const pageNo = `Page ${pageIndex + 1} of ${pages.length}`
    const footer = [
      '0.55 w 0.85 0.88 0.90 RG',
      `q ${MARGIN_X} ${BOTTOM - 8} m ${PAGE_WIDTH - MARGIN_X} ${BOTTOM - 8} l S Q`,
      '0.45 0.50 0.55 rg',
      `BT /F1 8 Tf ${MARGIN_X} ${BOTTOM - 20} Td (${escapePdfText(doc.title)}) Tj ET`,
      `BT /F1 8 Tf ${PAGE_WIDTH - MARGIN_X - 90} ${BOTTOM - 20} Td (${escapePdfText(pageNo)}) Tj ET`,
    ]
    const content = toStream(['q 0.13 0.16 0.20 rg', ...ops, 'Q', ...footer])
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << ${FONTS_RES.map((_, i) => `/${FONTS[Object.keys(FONTS)[i]].name} ${fontIds[i]} 0 R`).join(' ')} >> >> ` +
        `/Contents ${contentId} 0 R >>`,
    )
    pageIds.push(pageId)
  })

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff
  return new Blob([bytes], { type: 'application/pdf' })
}

const objectUrls = new Map()

/** Cached object URL for a generated lesson PDF. */
export function lessonPdfUrl(key, doc) {
  if (objectUrls.has(key)) return objectUrls.get(key)
  const url = URL.createObjectURL(buildPdf(doc))
  objectUrls.set(key, url)
  return url
}
