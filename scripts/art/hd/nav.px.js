// Bottom nav bar tab icons, 32x32, in the same style as the item icons.
pal({
  o: "#3a2414",
  m: "#ffffff", e: "#fff4d6", E: "#f2e2c0", F: "#e0cfa8",
  b: "#f8d8a8", B: "#f0c48a", c: "#d9a05c", C: "#a8703a",
  k: "#dcb06a", K: "#c99a55", d: "#a8703a", D: "#7a4f26",
  y: "#ffe08a", Y: "#f2c94c",
  r: "#e05a50", R: "#c0392b", P: "#e0457b",
  t: "#c9eef4", T: "#8fcfdc",
  I: "#c8ccd2", i: "#e2e5e9", j: "#9aa0a8",
})
ramps("CcBb", "DdKk", "jIi", "FEe", "RrP", "Yy", "Tt")

const HD = { w: 30, h: 30, outline: "o" }

sprite("_bun", { w: 9, h: 7, outline: "o" }, (c) => {
  c.ellipse(4, 3.5, 4, 3.5, "B"); c.recolor({ B: "c" }, (x, y) => x + y > 8)
  c.ellipse(3, 2, 2, 1, "b")
})

sprite("nav-board", HD, (c) => {
  // a baking tray of buns
  c.rect(0, 17, 30, 9, "I"); c.hline(0, 17, 30, "i"); c.rect(0, 24, 30, 2, "j")
  c.rect(2, 19, 26, 4, "i"); c.rect(2, 19, 26, 1, "j")
  for (const [x, y] of [[1, 12], [10, 10], [19, 12]]) c.stamp("_bun", x, y)
})

sprite("nav-recipes", HD, (c) => {
  // an open recipe book with a ribbon
  c.poly([0, 7, 14, 9, 16, 9, 30, 7, 30, 26, 16, 28, 14, 28, 0, 26], "R")
  c.poly([2, 5, 14, 8, 14, 25, 2, 23], "e"); c.poly([16, 8, 28, 5, 28, 23, 16, 25], "E")
  for (let y = 10; y < 22; y += 3) { c.line(4, y - 1, 11, y + 1, "F"); c.line(19, y + 1, 26, y - 1, "F") }
  c.vline(15, 8, 19, "o")
  c.poly([20, 6, 23, 5, 23, 14, 21, 12, 20, 14], "P")
})

sprite("nav-bakery", HD, (c) => {
  // a chef's hat
  for (const [x, y, r] of [[8, 11, 6], [15, 8, 8], [22, 11, 6]]) c.circ(x, y, r, "m")
  c.rect(6, 12, 18, 6, "m")
  c.recolor({ m: "E" }, (x, y) => (x - 12) ** 2 + (y - 6) ** 2 > 150 && y < 19)
  c.line(11, 9, 11, 17, "E"); c.line(19, 9, 19, 17, "E")
  c.rect(7, 19, 16, 8, "e"); c.hline(7, 19, 16, "E"); c.rect(18, 19, 5, 8, "E")
  for (const x of [10, 14, 18]) c.vline(x, 21, 5, "F")
})

sprite("nav-shop", HD, (c) => {
  // a little store with a SHOP sign
  c.rect(5, 0, 20, 7, "Y"); c.hline(5, 0, 20, "y"); c.text(8, 1, "SHOP", "o")
  c.vline(9, 7, 2, "D"); c.vline(20, 7, 2, "D")
  c.rect(1, 9, 28, 4, "m")
  for (let x = 1; x < 29; x += 6) c.rect(x, 9, 3, 4, "r")
  for (let x = 1; x < 29; x += 3) c.ellipse(x + 1, 13, 1, 1, (x - 1) % 6 === 0 ? "r" : "m")
  c.rect(2, 15, 26, 13, "e"); c.rect(23, 15, 5, 13, "E")
  c.rect(12, 18, 6, 10, "d"); c.vline(12, 18, 10, "K"); c.px(16, 23, "Y")
  for (const x of [4, 20]) { c.rect(x, 18, 6, 5, "T"); c.rect(x, 18, 2, 2, "t"); c.hline(x, 23, 6, "D") }
})

sprite("nav-settings", HD, (c) => {
  // a gear
  const gear = (x, y) => {
    const r = Math.hypot(x - 15, y - 15), a = Math.atan2(y - 15, x - 15)
    return r <= 10.5 || (r <= 14 && Math.cos(8 * a) > 0.35)
  }
  c.rect(0, 0, 30, 30, "I"); c.recolor({ I: "_" }, (x, y) => !gear(x + 0.5, y + 0.5))
  c.recolor({ I: "j" }, (x, y) => x + y > 33)
  c.recolor({ I: "i" }, (x, y) => x + y < 20)
  c.circ(15, 15, 6, "j"); c.circ(15, 15, 4, "_")
})

sheet("hd-nav", ["nav-*"], { pad: 2 })
