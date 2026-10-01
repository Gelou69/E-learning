/** CSV generation + download helper, with UTF-8 BOM for Excel compatibility. */

function escapeCell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function toCsv(rows) {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

export function downloadCsv(filename, rows) {
  const csv = toCsv(rows)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Download a multi-sheet Excel-readable workbook (HTML table format, no extra deps). */
export function downloadSpreadsheet(filename, sheets) {
  const parts = []
  for (const { name, rows } of sheets) {
    parts.push(`<h2>${escapeCell(name)}</h2><table border="1"><tbody>${rows
      .map((row, i) => `<tr>${row.map((cell) => `<${i === 0 ? 'th' : 'td'}>${escapeCell(cell)}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`)
      .join('')}</tbody></table>`)
  }
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${parts.join('<br>')}</body></html>`
  downloadText(filename.endsWith('.xls') ? filename : `${filename}.xls`, html, 'application/vnd.ms-excel')
}
