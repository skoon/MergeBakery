// Fruit tart and scone chains, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  m: "#ffffff", e: "#fff4d6", E: "#f2e2c0",
  a: "#f8b0b0", r: "#f08a8a", R: "#d94b4b", d: "#a83c3c",
  s: "#f8d8a8", S: "#f0c48a", c: "#d9a05c", C: "#a8703a", D: "#7a4f26", k: "#c99a55",
  I: "#c8ccd2", i: "#e2e5e9", j: "#9aa0a8",
  g: "#6fbb68", G: "#4f9b4a", u: "#a85a9a", U: "#7a2f6e", y: "#c9a24a",
  t: "#9ed9c3", T: "#6fae9b",
})
ramps("dRra", "DCcSs", "jIi", "GgG", "UuU", "TtT")

const HD = { w: 30, h: 30, outline: "o" }

// tart: red fruit dome in a crimped pastry shell; reused small on the tray
const tart = (c, x, y, w) => {
  const h = Math.round(w * 0.5)
  c.ellipse(x + w / 2, y + h / 2, w / 2 - 1, h / 2, "R")
  c.rect(x, y + h / 2, w, Math.round(h * 0.6), "c")
  for (let i = x + 1; i < x + w; i += 3) c.px(i, y + h / 2, "S")
  c.rect(x + 1, y + h / 2 + Math.round(h * 0.6) - 1, w - 2, 1, "C")
  c.px(x + w / 2 - 2, y + 1, "a"); c.px(x + w / 2 - 3, y + 2, "r")
}

sprite("fruit-tart", HD, (c) => {
  c.ellipse(15, 15, 12, 6, "R"); c.rect(3, 15, 25, 3, "R")
  c.recolor({ R: "d" }, (x, y) => x > 20 && y > 13)
  for (const [x, y] of [[9, 12], [15, 11], [20, 14], [12, 16], [6, 15]]) { c.rect(x, y, 2, 2, "r"); c.px(x, y, "a") }
  c.poly([1, 17, 29, 17, 26, 25, 4, 25], "c")
  for (let x = 2; x < 28; x += 3) c.vline(x, 18, 6, "S")
  c.rect(1, 17, 28, 1, "S"); c.hline(4, 24, 22, "C")
})

sprite("tart-tray", HD, (c) => {
  for (const x of [0, 10, 20]) {
    c.ellipse(x + 4.5, 12, 4, 3, "R"); c.px(x + 3, 10, "a"); c.px(x + 5, 11, "r")
    c.rect(x, 13, 10, 5, "c"); for (let i = x + 1; i < x + 10; i += 3) c.vline(i, 13, 4, "S")
    c.vline(x + 9, 10, 8, "o")
  }
  c.rect(0, 18, 30, 1, "o")
  c.rect(0, 19, 30, 7, "I"); c.hline(0, 19, 30, "i"); c.rect(0, 25, 30, 2, "j")
})

sprite("fruit-gateau", HD, (c) => {
  for (const x of [5, 11, 17]) { c.circ(x, 3, 2, "R"); c.px(x - 1, 2, "a") }
  c.rect(3, 5, 20, 5, "R"); c.hline(3, 5, 20, "r")
  c.rect(3, 10, 22, 2, "m"); for (const x of [5, 10, 15, 20]) c.px(x, 10, "R")
  c.rect(3, 12, 22, 6, "e")
  c.rect(1, 18, 28, 4, "S"); c.hline(1, 18, 28, "s")
  c.rect(1, 22, 28, 3, "c"); c.rect(1, 25, 28, 3, "C")
})

sprite("harvest-showcase", HD, (c) => {
  // grapes and leaves crowning a tall cake
  c.ellipse(9, 3, 3, 2, "G"); c.ellipse(21, 3, 3, 2, "G"); c.px(8, 2, "g"); c.px(20, 2, "g")
  for (const [x, y] of [[13, 3], [17, 3], [15, 6], [13, 6], [17, 6]]) { c.circ(x, y, 1, "u"); c.px(x + 1, y, "U") }
  c.rect(5, 8, 20, 2, "r"); c.hline(5, 8, 20, "a")
  c.rect(5, 10, 20, 3, "R")
  c.rect(2, 13, 26, 2, "S")
  c.rect(2, 15, 26, 7, "c"); for (const x of [5, 13, 21]) c.rect(x, 17, 2, 2, "y")
  c.rect(0, 22, 30, 6, "C"); c.hline(0, 22, 30, "k")
})

sprite("scone", HD, (c) => {
  c.ellipse(14, 13, 10, 8, "S"); c.ellipse(11, 10, 5, 3, "s")
  c.recolor({ S: "c" }, (x, y) => x + y > 30)
  for (const [x, y] of [[10, 13], [17, 16], [14, 19], [20, 12]]) c.rect(x, y, 2, 1, "e")
  c.rect(5, 21, 19, 5, "C"); c.hline(5, 21, 19, "c")
})

sprite("scone-basket", HD, (c) => {
  const scone = (x, y, r) => {
    c.circ(x, y, r + 1, "o"); c.circ(x, y, r, "S"); c.px(x - 2, y - 2, "s"); c.px(x - 1, y - 2, "s")
    c.recolor({ S: "c" }, (px, py) => px - x + py - y > r - 1 && (px - x) ** 2 + (py - y) ** 2 <= r * r)
    c.rect(x - 1, y, 2, 1, "e")
  }
  scone(8, 9, 5); scone(21, 9, 5); scone(14, 13, 5)
  c.rect(0, 15, 30, 1, "o")
  c.rect(0, 16, 30, 2, "k")
  c.poly([0, 18, 30, 18, 30, 21, 25, 28, 5, 28, 0, 21], "C")
  c.recolor({ C: "D" }, (x, y) => y > 18 && ((x >> 1) + ((y - 18) >> 1)) % 2 === 0)
})

sprite("cream-tea", HD, (c) => {
  // teacup with cream on the left, jam-topped scone on the right, on a silver tray
  c.ellipse(3, 16, 3, 3, "m"); c.ellipse(3, 16, 1, 1, "_")                 // handle
  c.poly([4, 11, 17, 11, 17, 18, 14, 22, 7, 22, 4, 18], "m")
  c.hline(6, 12, 10, "D"); c.hline(7, 13, 8, "C")                      // tea
  c.rect(5, 15, 12, 2, "T"); c.hline(5, 15, 12, "t"); c.vline(16, 12, 9, "i")
  c.ellipse(23, 13, 6, 3, "R"); c.px(21, 11, "a")
  c.rect(17, 15, 12, 7, "c"); c.ellipse(22, 15, 5, 1, "S")
  c.vline(17, 12, 10, "o")
  c.rect(0, 22, 30, 1, "o")
  c.rect(0, 23, 30, 3, "I"); c.hline(0, 23, 30, "i"); c.rect(0, 26, 30, 2, "j")
})

sheet("hd-tea", ["fruit-tart", "tart-tray", "fruit-gateau", "harvest-showcase", "scone", "scone-basket", "cream-tea"], { pad: 2 })
