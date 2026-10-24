// Bonus items and the contest event chain, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  m: "#ffffff", j: "#9a9aa5", i: "#d0d0d8", I: "#c8ccd2", J: "#7a7a85",
  g: "#eef9fb", G: "#d4eef2", l: "#c6e8fc", L: "#7fc8f8", c: "#4a9fd6", C: "#2f7ab0",
  h: "#fff0b8", y: "#ffe08a", Y: "#f2c94c", z: "#d9a020", Z: "#a8780e",
  B: "#7a2540", k: "#d9a066", K: "#c98d55", u: "#b07a45", U: "#8a5a30",
  p: "#ffc0d6", P: "#f58aae", q: "#e0457b", Q: "#b02e5c", X: "#7d1e40", r: "#c0392b",
  e: "#fff4d6", E: "#f0e0c0", s: "#cfa75a", S: "#a8843e",
  f: "#f9e3b0", F: "#f0cf8a",
  d: "#2f9fc9", v: "#7b4fc4", n: "#3fae6a",
})
ramps("JjIim", "CcLlg", "ZzYyh", "UuKk", "XQqPp", "SsFf", "SsEe")

const HD = { w: 30, h: 30, outline: "o" }

sprite("energy-jar", HD, (c) => {
  c.rect(8, 1, 14, 4, "j"); c.hline(8, 1, 14, "i"); c.hline(8, 4, 14, "J")
  c.rect(8, 5, 14, 1, "o")
  c.rect(6, 6, 18, 2, "G"); c.hline(6, 6, 18, "g")
  c.poly([4, 8, 26, 8, 26, 27, 4, 27], "L")
  c.recolor({ L: "c" }, (x, y) => x > 22 || y > 24); c.recolor({ c: "C" }, (x, y) => x > 23 && y > 23)
  c.vline(5, 10, 14, "l"); c.vline(6, 11, 5, "l")
  // lightning bolt
  c.poly([17, 9, 11, 18, 15, 18, 12, 25, 20, 15, 16, 15, 19, 9], "Y"); c.line(16, 10, 13, 16, "h")
})

sprite("coin-pouch", HD, (c) => {
  c.rect(11, 3, 2, 3, "B"); c.rect(17, 3, 2, 3, "B"); c.rect(12, 6, 6, 3, "B")
  c.rect(9, 9, 12, 1, "o")
  c.ellipse(13, 18, 11, 9, "K"); c.rect(9, 10, 12, 3, "K")
  c.line(6, 13, 4, 19, "k"); c.line(7, 12, 9, 12, "k")
  c.recolor({ K: "u" }, (x, y) => x + y > 34)
  // coin leaning on the pouch
  c.circ(24, 23, 5, "o"); c.circ(24, 23, 4, "Y"); c.ring(24, 23, 4, "z"); c.rect(23, 21, 2, 5, "z"); c.px(22, 20, "h")
})

sprite("golden-whisk", HD, (c) => {
  // wire loops
  c.ellipse(15, 8, 9, 7, "Y"); c.ellipse(15, 8, 7, 5, "_")
  c.ellipse(15, 8, 4, 7, "Y"); c.ellipse(15, 8, 2, 5, "_")
  c.rect(14, 1, 2, 14, "Y"); c.recolor({ Y: "h" }, (x, y) => x < 10 && y < 8)
  c.poly([9, 13, 21, 13, 17, 17, 13, 17], "Y")
  c.rect(13, 17, 4, 11, "Y"); c.vline(13, 17, 11, "y"); c.vline(16, 17, 11, "z"); c.rect(13, 23, 4, 1, "z")
  for (const [x, y] of [[26, 2], [4, 21]]) { c.vline(x, y - 2, 5, "h"); c.hline(x - 2, y, 5, "h") }
})

sprite("contest-mixer-1", HD, (c) => {
  // mixer head
  c.rect(8, 1, 18, 9, "q"); c.rect(8, 1, 8, 4, "P"); c.hline(9, 1, 6, "p")
  c.rect(26, 4, 2, 4, "Q"); c.recolor({ q: "Q" }, (x, y) => y > 7)
  c.rect(14, 10, 4, 4, "I"); c.vline(14, 10, 4, "m")
  // bowl of batter
  c.ellipse(15, 18, 12, 5, "e"); c.rect(4, 18, 23, 6, "e")
  c.line(6, 17, 8, 23, "m"); c.px(9, 17, "m")
  c.rect(5, 24, 21, 1, "s")
  c.rect(3, 26, 25, 3, "Q"); c.hline(3, 26, 25, "q")
})

sprite("sprinkles", HD, (c) => {
  c.rect(7, 1, 16, 4, "Q"); c.hline(7, 1, 16, "q")
  c.rect(7, 5, 16, 22, "e")
  c.rect(7, 5, 3, 22, "m")
  c.vline(22, 5, 22, "E")
  for (const [x, y, k] of [[16, 9, "d"], [12, 12, "q"], [19, 13, "P"], [14, 16, "v"], [18, 19, "Y"], [11, 21, "n"], [16, 23, "d"], [20, 8, "n"]]) {
    c.rect(x, y, 2, 1, k); c.px(x + 1, y + 1, k)
  }
})

sprite("frosting-swirl", HD, (c) => {
  // soft-serve swirl: stacked rolls, each with a lit top and a shaded underside
  c.poly([15, 0, 17, 4, 13, 4], "P")
  for (const [y, rx] of [[20, 11], [15, 8], [10, 6], [6, 3]]) {
    c.ellipse(15, y, rx, 3, "q"); c.ellipse(15, y - 1, rx, 2, "P"); c.hline(15 - rx + 2, y - 2, rx, "p")
  }
  c.recolor({ q: "Q" }, (x, y) => x > 20)
  c.rect(1, 23, 28, 1, "o")
  c.rect(1, 24, 28, 3, "e"); c.hline(2, 26, 26, "E")
})

sprite("sponge-layer", HD, (c) => {
  c.ellipse(15, 12, 14, 6, "f"); c.ellipse(11, 9, 5, 2, "m")
  c.rect(1, 13, 28, 12, "F"); c.ellipse(15, 13, 14, 3, "f")
  c.rect(2, 22, 26, 3, "s"); c.hline(3, 24, 24, "S")
  c.recolor({ F: "s" }, (x, y) => x > 26)
  for (const [x, y] of [[8, 16], [18, 17], [24, 15], [13, 19]]) c.px(x, y, "s")
})

sprite("tiered-cake", HD, (c) => {
  c.circ(15, 3, 2, "r"); c.px(14, 2, "p")
  const tier = (x, y, w, h) => {
    c.rect(x, y - 1, w, 1, "o")
    c.rect(x, y, w, h, "P"); c.hline(x, y, w, "p")
    c.rect(x, y + 4, w, 2, "q"); for (let i = x + 2; i < x + w; i += 5) c.px(i, y + 4, "m")
    c.rect(x, y + 6, w, h - 6, "Q")
  }
  tier(7, 7, 16, 8)
  tier(2, 16, 26, 11)
})

sprite("showstopper-cake", HD, (c) => {
  c.ellipse(15, 2, 3, 2, "Y"); c.px(14, 1, "h")
  const tier = (x, y, w, h, top, band) => {
    c.rect(x, y - 1, w, 1, "o")
    c.rect(x, y, w, h, top); c.rect(x, y + h - 2, w, 2, band)
    for (let i = x + 2; i < x + w; i += 4) c.px(i, y + h - 2, "m")
  }
  tier(8, 6, 14, 5, "P", "q")
  tier(5, 12, 20, 6, "p", "q")
  tier(0, 19, 30, 10, "P", "q"); c.rect(0, 25, 30, 4, "m"); c.hline(0, 28, 30, "E")
  c.rect(0, 5, 30, 1, "_")
})

sheet("hd-bonus", ["energy-jar", "coin-pouch", "golden-whisk", "contest-mixer-1", "sprinkles", "frosting-swirl", "sponge-layer", "tiered-cake", "showstopper-cake"], { pad: 2 })
