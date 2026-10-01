const TOOL_STYLE = {
  pen: { width: 2, opacity: 1, cap: 'round' },
  marker: { width: 6, opacity: 0.9, cap: 'round' },
  highlight: { width: 16, opacity: 0.28, cap: 'square' },
}

export function exportStrokesPng(strokes, w = 800, h = 500) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  for (const stroke of strokes) {
    if (!stroke.points?.length) continue
    const style = TOOL_STYLE[stroke.tool] ?? TOOL_STYLE.pen
    ctx.globalAlpha = style.opacity
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width ?? style.width
    ctx.lineCap = style.cap
    ctx.lineJoin = 'round'
    ctx.beginPath()
    stroke.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  return canvas.toDataURL('image/png')
}
