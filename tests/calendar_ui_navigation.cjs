const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class Element {
  constructor(tag = "div") {
    this.tagName = tag;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this.value = "";
    this.textContent = "";
    this.className = "";
  }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren() { this.children = []; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  click() { if (this.listeners.click) this.listeners.click(); }
  querySelector() { return null; }
}

const ids = [
  "sale-type", "sale-count", "calendar-status", "month-title", "month-grid",
  "previous-month", "next-month", "this-month", "copy-feed", "copy-status",
  "feed-url", "month-calendar", "undated"
];
const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
const document = {
  documentElement: { lang: "en" },
  getElementById: id => elements[id],
  querySelectorAll: () => [],
  createElement: tag => new Element(tag)
};

class FixedDate extends Date {
  constructor(...args) {
    if (args.length) super(...args);
    else super("2026-11-13T12:00:00-06:00");
  }
  static now() { return new Date("2026-11-13T18:00:00Z").getTime(); }
}

const source = fs.readFileSync("webapp/js/calendar.js", "utf8");
vm.runInNewContext(source, {
  document,
  Date: FixedDate,
  Intl,
  Set,
  fetch: async () => ({ ok: true, json: async () => ({ days: [] }) }),
  navigator: { clipboard: { writeText: async () => {} } },
  location: { pathname: "/calendar/" },
  localStorage: { getItem: () => "en" }
});

function headings() {
  return elements["month-grid"].children.slice(0, 7).map(el => el.textContent);
}
function firstDateColumn() {
  const cells = elements["month-grid"].children.slice(7);
  return cells.findIndex(el => el.className.startsWith("day-cell"));
}

(async () => {
  // Let fetch().then(...).then(...) finish its asynchronous initialization.
  await new Promise(resolve => setImmediate(resolve));
  const expected = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  assert.deepEqual(headings(), expected, "initial month has seven Sunday-first headings");

  elements["next-month"].click(); // December 2026 starts Tuesday.
  assert.deepEqual(headings(), expected);
  assert.equal(firstDateColumn(), 2, "December 1, 2026 is under Tuesday");

  elements["previous-month"].click(); // Back to November.
  elements["previous-month"].click(); // October 2026 starts Thursday.
  assert.deepEqual(headings(), expected);
  assert.equal(firstDateColumn(), 4, "October 1, 2026 is under Thursday");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
