// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { Fragment, type ReactNode } from "react"

// A small Markdown renderer for assistant answers: paragraphs, headings, lists, tables, code blocks,
// **bold**, `code` and http(s) links. It builds React elements (never raw HTML), so model output cannot
// inject markup.

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let n = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyPrefix}-${n++}`
    if (tok.startsWith("**")) {
      out.push(<strong key={key}>{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>
      )
    } else {
      const label = tok.slice(1, tok.indexOf("]"))
      out.push(
        <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-[#70AEFF] underline">
          {label}
        </a>
      )
    }
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l)
const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l)
const cells = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim())

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]
    const key = `b${k++}`

    if (line.trim().startsWith("```")) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++])
      i++
      blocks.push(
        <pre key={key} className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">
          {code.join("\n")}
        </pre>
      )
      continue
    }
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]))
      blocks.push(
        <div key={key} className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {head.map((h, j) => (
                  <th key={j} className="border-b px-2 py-1 text-left font-semibold">
                    {inline(h, `${key}h${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="odd:bg-muted/40">
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-1 align-top">
                      {inline(c, `${key}r${ri}c${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push(
        <p key={key} className="font-semibold">
          {inline(heading[2], key)}
        </p>
      )
      i++
      continue
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""))
        i++
      }
      const List = ordered ? "ol" : "ul"
      blocks.push(
        <List key={key} className={`${ordered ? "list-decimal" : "list-disc"} space-y-0.5 pl-5`}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${key}-${j}`)}</li>
          ))}
        </List>
      )
      continue
    }
    if (line.trim() === "") {
      i++
      continue
    }
    // A paragraph always takes the current line, so the loop advances even on lines no other block
    // accepted (e.g. a table row whose separator has not streamed in yet).
    const para: string[] = [lines[i++]]
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
      !isTableRow(lines[i])
    ) {
      para.push(lines[i++])
    }
    blocks.push(
      <p key={key}>
        {para.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(p, `${key}-${j}`)}
          </Fragment>
        ))}
      </p>
    )
  }
  return <div className="space-y-2 break-words">{blocks}</div>
}
