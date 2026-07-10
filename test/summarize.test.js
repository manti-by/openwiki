import { test } from "node:test"
import assert from "node:assert/strict"

import { buildWikiAgentPrompt, transcriptFromMessages, parseAgentJson } from "../src/lib/summarize.js"

test("transcriptFromMessages joins text parts by role, dropping empty messages", () => {
  const messages = [
    { info: { role: "user" }, parts: [{ type: "text", text: "hello" }] },
    { info: { role: "assistant" }, parts: [{ type: "text", text: "hi there" }] },
    { info: { role: "assistant" }, parts: [{ type: "tool" }] }, // no text part
  ]
  const transcript = transcriptFromMessages(messages)
  assert.match(transcript, /### user\nhello/)
  assert.match(transcript, /### assistant\nhi there/)
  assert.equal(transcript.split("###").length - 1, 2)
})

test("transcriptFromMessages falls back to top-level role when info is absent", () => {
  const messages = [{ role: "user", parts: [{ type: "text", text: "hi" }] }]
  assert.match(transcriptFromMessages(messages), /### user\nhi/)
})

test("parseAgentJson parses a bare JSON object", () => {
  assert.deepEqual(parseAgentJson('{"skip": true}'), { skip: true })
})

test("parseAgentJson strips markdown fences", () => {
  const reply = "```json\n{\"skip\": false, \"title\": \"x\"}\n```"
  assert.deepEqual(parseAgentJson(reply), { skip: false, title: "x" })
})

test("parseAgentJson tolerates stray prose around the object", () => {
  const reply = "Sure, here you go:\n{\"skip\": true}\nLet me know if you need anything else."
  assert.deepEqual(parseAgentJson(reply), { skip: true })
})

test("parseAgentJson throws when no JSON object is present", () => {
  assert.throws(() => parseAgentJson("no json here"))
})

test("buildWikiAgentPrompt embeds transcript, session id, and today's date", () => {
  const prompt = buildWikiAgentPrompt({
    readme: "README CONTENT",
    template: "TEMPLATE CONTENT",
    transcript: "### user\nhello",
    sessionId: "sess-1",
    today: "2026-07-10",
    existingPage: null,
  })
  assert.match(prompt, /session id: sess-1/)
  assert.match(prompt, /Today's date is 2026-07-10/)
  assert.match(prompt, /README CONTENT/)
  assert.match(prompt, /TEMPLATE CONTENT/)
  assert.match(prompt, /hello/)
  assert.match(prompt, /has no wiki page yet/)
})

test("buildWikiAgentPrompt asks for the existing filename to be reused when a page already exists", () => {
  const prompt = buildWikiAgentPrompt({
    readme: "README",
    template: "TEMPLATE",
    transcript: "t",
    sessionId: "sess-1",
    today: "2026-07-10",
    existingPage: { filename: "2026-07-09-old.md", content: "OLD CONTENT" },
  })
  assert.match(prompt, /UPDATE it in place/)
  assert.match(prompt, /OLD CONTENT/)
  assert.match(prompt, /"filename": "2026-07-09-old.md"/)
})
