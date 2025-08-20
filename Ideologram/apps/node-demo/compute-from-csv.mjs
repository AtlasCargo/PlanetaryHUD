import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseGoodreadsCsv, computeIdeologram, SAMPLE_ANCHORS } from '@ideologram/core'

async function main() {
  const [, , csvPath] = process.argv
  if (!csvPath) {
    console.error('Usage: node apps/node-demo/compute-from-csv.mjs <path-to-goodreads-csv>')
    process.exit(1)
  }
  const abs = path.resolve(csvPath)
  const csv = await fs.readFile(abs, 'utf8')
  const books = parseGoodreadsCsv(csv)
  const total = books.length
  const read = books.filter(b => b.isRead || b.readingStatus === 'read' || !!b.dateRead).length
  const rated = books.filter(b => typeof b.rating === 'number').length
  const anchorTitles = new Set(SAMPLE_ANCHORS.map(a => a.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()))
  const anchored = books.filter(b => anchorTitles.has((b.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())).length
  console.error(`Stats: total=${total}, read=${read}, rated=${rated}, anchored=${anchored}`)
  const result = computeIdeologram({
    books,
    anchors: SAMPLE_ANCHORS,
    options: {
      includeUnreadBooks: false,
      fictionPolicy: 'discount',
      fictionBaseWeight: 0.2,
      fictionThresholdCount: 8,
      recencyHalfLifeYears: 5,
    }
  })
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
