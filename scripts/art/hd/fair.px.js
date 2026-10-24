// Fair and tasting event items, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  m: "#ffffff", w: "#eef6fa", I: "#c8ccd2", j: "#9aa0a8", J: "#767c85", i: "#e2e5e9",
  t: "#a8e2f6", T: "#7fd0ee", b: "#2f9fc9", B: "#1f7a9c",
  k: "#dcb06a", K: "#c99a55", d: "#a8703a", D: "#7a4f26",
  c: "#f0cf8a", p: "#f58aae", P: "#e0457b", e: "#e8cd85", f: "#8edba6",
  v: "#c4aef0", V: "#a98ae6", u: "#7b4fc4", U: "#5a3796",
  y: "#e8cd85", Y: "#c9a24a",
})
ramps("JjIim", "BbTt", "DdKk", "UuVv", "Yy")

const HD = { w: 30, h: 30, outline: "o" }

sprite("fair-cart-1", HD, (c) => {
  // striped awning with a scalloped hem
  c.rect(1, 1, 28, 9, "m")
  for (let x = 1; x < 29; x += 8) c.rect(x + 4, 1, 4, 9, "b")
  c.rect(1, 1, 4, 9, "T"); c.hline(1, 1, 28, "w")
  for (let x = 1; x < 29; x += 4) c.ellipse(x + 1, 10, 1, 1, x % 8 === 1 ? "T" : x % 8 === 5 ? "b" : "m")
  c.rect(2, 12, 26, 1, "o")
  c.rect(3, 13, 24, 4, "K"); c.hline(3, 13, 24, "k")
  c.rect(3, 17, 24, 4, "d"); c.hline(3, 20, 24, "D")
  c.rect(3, 21, 24, 1, "o")
  for (const x of [7, 22]) { c.circ(x, 25, 4, "o"); c.circ(x, 25, 3, "I"); c.circ(x, 25, 1, "D"); c.px(x - 2, 23, "m") }
})

sprite("fair-flyer", HD, (c) => {
  c.rect(6, 1, 18, 27, "m"); c.vline(6, 1, 27, "w"); c.vline(7, 1, 27, "w")
  c.rect(8, 5, 13, 4, "b"); c.hline(8, 5, 13, "T")
  for (const [y, w] of [[12, 12], [16, 11], [20, 9]]) c.rect(9, y, w, 2, "I")
  c.poly([18, 28, 24, 22, 24, 28], "I"); c.line(18, 27, 23, 22, "j")          // folded corner
})

sprite("fair-sample", HD, (c) => {
  // toothpick flags
  for (const x of [5, 13, 21]) { c.vline(x, 3, 7, "k"); c.rect(x + 1, 3, 3, 2, "T") }
  c.rect(1, 9, 28, 1, "o")
  const cube = (x, k, hi) => { c.rect(x, 10, 6, 6, k); c.hline(x, 10, 6, hi); c.vline(x + 5, 11, 5, "o") }
  cube(1, "c", "m"); cube(8, "P", "p"); cube(15, "e", "m"); cube(22, "f", "m")
  c.rect(0, 16, 30, 1, "o")
  c.rect(0, 17, 30, 2, "m")
  c.rect(0, 19, 30, 4, "I"); c.rect(0, 23, 30, 2, "j")
})

sprite("fair-banner", HD, (c) => {
  // two posts with a sagging line of swallow-tail pennants
  c.rect(0, 4, 3, 4, "D"); c.rect(27, 4, 3, 4, "D")
  c.wire(2, 6, 27, 6, 4, "D")
  for (const [x, k, hi] of [[3, "b", "T"], [10, "m", "w"], [17, "b", "T"], [24, "m", "w"]]) {
    const top = 7 + Math.round(4 * Math.sin(Math.PI * (x + 2 - 2) / 25))
    c.poly([x, top, x + 4, top, x + 4, top + 11, x + 2, top + 8, x, top + 11], k)
    c.vline(x, top, 10, hi)
  }
})

sprite("fair-stall", HD, (c) => {
  c.rect(1, 1, 28, 4, "T"); c.hline(1, 1, 28, "t")
  c.rect(1, 5, 28, 8, "b")
  c.rect(5, 6, 20, 6, "m")
  for (const x of [8, 12, 16, 20]) c.rect(x, 8, 2, 2, "B")
  c.rect(1, 12, 28, 4, "B")
  c.rect(1, 16, 28, 1, "o")
  c.rect(13, 17, 4, 9, "D"); c.vline(13, 17, 9, "d")
  c.rect(9, 26, 12, 3, "d"); c.hline(9, 26, 12, "K")
})

sprite("taste-table-1", HD, (c) => {
  // cloche on a purple-draped table
  c.rect(14, 0, 2, 2, "I")
  c.ellipse(15, 11, 11, 9, "I"); c.rect(4, 11, 23, 6, "I")
  c.ellipse(10, 7, 4, 3, "m"); c.recolor({ I: "j" }, (x, y) => x > 21 && y > 6)
  c.rect(2, 16, 26, 1, "o")
  c.rect(1, 17, 28, 5, "u"); c.rect(1, 17, 12, 2, "V"); c.hline(1, 17, 28, "V")
  c.rect(3, 22, 24, 3, "U"); for (let x = 5; x < 26; x += 4) c.px(x, 22, "u")
  c.rect(3, 25, 3, 4, "D"); c.rect(24, 25, 3, 4, "D")
})

sprite("taster-spoon", HD, (c) => {
  c.line(14, 15, 27, 28, "I", 3); c.line(13, 15, 26, 28, "m")
  c.ellipse(10, 10, 7, 6, "I"); c.ellipse(10, 10, 5, 4, "V")
  c.ellipse(8, 8, 2, 1, "v"); c.recolor({ V: "u" }, (x, y) => x + y > 23)
  c.px(4, 7, "m"); c.px(5, 5, "m")
})

sprite("taster-plate", HD, (c) => {
  c.ellipse(15, 21, 14, 7, "m"); c.ellipse(15, 21, 10, 4, "w")
  c.recolor({ m: "I" }, (x, y) => y > 25)
  c.ellipse(14, 18, 6, 4, "u"); c.ellipse(13, 16, 3, 2, "V"); c.px(12, 15, "v")
  c.rect(19, 18, 3, 2, "Y"); c.px(19, 18, "y")
})

sprite("taster-flight", HD, (c) => {
  for (const [i, k, hi] of [[0, "u", "V"], [1, "P", "p"], [2, "Y", "y"]]) {
    const x = 1 + i * 10
    c.rect(x, 6, 8, 16, "i"); c.vline(x, 6, 16, "m")
    c.rect(x + 1, 11, 6, 10, k); c.hline(x + 1, 11, 6, hi)
    c.rect(x + 8, 6, 2, 16, "o")
  }
  c.rect(0, 22, 30, 1, "o")
  c.rect(0, 23, 30, 2, "K"); c.rect(0, 25, 30, 3, "d")
})

sprite("judges-platter", HD, (c) => {
  c.rect(13, 0, 4, 3, "Y"); c.hline(13, 0, 4, "y")
  c.ellipse(15, 14, 13, 11, "I"); c.rect(2, 14, 27, 7, "I")
  c.ellipse(9, 9, 5, 4, "m"); c.recolor({ I: "j" }, (x, y) => x > 22 && y > 8)
  c.rect(0, 21, 30, 1, "o")
  c.rect(0, 22, 30, 2, "m")
  c.rect(1, 24, 28, 4, "j"); c.rect(11, 24, 8, 4, "u"); c.hline(11, 24, 8, "V")
  c.poly([13, 28, 15, 28, 14, 30], "U"); c.poly([15, 28, 17, 28, 16, 30], "U")   // ribbon tails
})

sheet("hd-fair", ["fair-cart-1", "fair-flyer", "fair-sample", "fair-banner", "fair-stall", "taste-table-1", "taster-spoon", "taster-plate", "taster-flight", "judges-platter"], { pad: 2 })
