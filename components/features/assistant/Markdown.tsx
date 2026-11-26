// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { Fragment, useState, type ReactNode } from "react"

// A small Markdown renderer for assistant answers: paragraphs, headings, lists and task lists, tables,
// quotes, rules, code blocks (```markdown ones rendered), **bold**, `code` and http(s) links. It builds React elements (never raw HTML), so model output cannot
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

const FENCE = /^\s*(`{3,}|~{3,})\s*([\w+-]*)/
const HR = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/
const LIST_ITEM = /^\s*([-*+]|\d+\.)\s+/
const TASK = /^\[([ xX])\]\s+/
const HEADING = /^(#{1,6})\s+(.*)$/

/** True for lines that start a block of their own, so a paragraph must stop before them. */
function startsBlock(line: string): boolean {
  return FENCE.test(line) || HEADING.test(line) || LIST_ITEM.test(line) || isTableRow(line) || HR.test(line) || /^\s*>/.test(line)
}

/**
 * A Markdown document the model quoted (```markdown block, e.g. a .md file it read): shown rendered,
 * with a switch to the raw text.
 */
function MarkdownDocument({ text }: { text: string }) {
  const [raw, setRaw] = useState(false)
  return (
    <div className="overflow-hidden rounded-md border bg-muted/20">
      <div className="flex items-center justify-between border-b bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
        <span className="font-mono">markdown</span>
        <button type="button" onClick={() => setRaw((r) => !r)} className="hover:text-foreground">
          {raw ? "Rendered" : "Raw"}
        </button>
      </div>
      {raw ? (
        <pre className="overflow-x-auto p-2 font-mono text-xs">{text}</pre>
      ) : (
        <div className="p-3">
          <Markdown text={text} />
        </div>
      )}
    </div>
  )
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]
    const key = `b${k++}`

    const fence = FENCE.exec(line)
    if (fence) {
      // The closing fence uses the same character, at least as long: a quoted .md file may contain
      // shorter fences of its own.
      const marker = fence[1]
      const lang = fence[2].toLowerCase()
      const closing = new RegExp(`^\\s*${marker[0] === "`" ? "`" : "~"}{${marker.length},}\\s*$`)
      const code: string[] = []
      i++
      while (i < lines.length && !closing.test(lines[i])) code.push(lines[i++])
      i++
      if (lang === "markdown" || lang === "md") {
        blocks.push(<MarkdownDocument key={key} text={code.join("\n")} />)
      } else {
        blocks.push(
          <pre key={key} className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">
            {code.join("\n")}
          </pre>
        )
      }
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
    const heading = HEADING.exec(line)
    if (heading) {
      const level = heading[1].length
      const size = level === 1 ? "text-base font-bold" : level === 2 ? "text-[0.95rem] font-semibold" : "font-semibold"
      blocks.push(
        <p key={key} className={`${size} ${level <= 2 ? "pt-1" : ""}`}>
          {inline(heading[2], key)}
        </p>
      )
      i++
      continue
    }
    if (HR.test(line)) {
      blocks.push(<hr key={key} className="border-border" />)
      i++
      continue
    }
    if (/^\s*>/.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) quoted.push(lines[i++].replace(/^\s*>\s?/, ""))
      blocks.push(
        <blockquote key={key} className="border-l-2 border-[#70AEFF]/60 pl-3 text-muted-foreground">
          <Markdown text={quoted.join("\n")} />
        </blockquote>
      )
      continue
    }
    if (LIST_ITEM.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: string[] = []
      while (i < lines.length && LIST_ITEM.test(lines[i])) {
        items.push(lines[i].replace(LIST_ITEM, ""))
        i++
      }
      const tasks = items.every((it) => TASK.test(it))
      const List = ordered ? "ol" : "ul"
      blocks.push(
        <List
          key={key}
          className={tasks ? "space-y-1" : `${ordered ? "list-decimal" : "list-disc"} space-y-0.5 pl-5`}
        >
          {items.map((it, j) => {
            const task = TASK.exec(it)
            if (tasks && task) {
              const done = task[1].toLowerCase() === "x"
              return (
                <li key={j} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border text-[10px] leading-none ${
                      done ? "border-[#70AEFF] bg-[#70AEFF] text-black" : "border-muted-foreground/60"
                    }`}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span className={done ? "text-muted-foreground line-through" : ""}>
                    {inline(it.replace(TASK, ""), `${key}-${j}`)}
                  </span>
                </li>
              )
            }
            return <li key={j}>{inline(it, `${key}-${j}`)}</li>
          })}
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
    while (i < lines.length && lines[i].trim() !== "" && !startsBlock(lines[i])) {
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
