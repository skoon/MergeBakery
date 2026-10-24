// 32x32 HD redraws of the 16x16 item art. Draw on a 30x30 interior; outline adds 1px each side.
// Same silhouettes and palettes as the originals (roughly 2x their footprint), clean hard-edged shading.
pal({
  o: "#3a2414",
  // wheat
  y: "#fbefd2", Y: "#f2dcb0", u: "#e8c07d", U: "#c99a55", v: "#a8c45e", V: "#8ba84a", W: "#5f7a30",
  // bread / crust
  b: "#d8955a", B: "#c17d3f", n: "#96602c", N: "#6d3d1d", f: "#f2dcb0",
  // milk
  m: "#ffffff", M: "#f4fbff", l: "#cfeaf8", L: "#a8d8f0", c: "#6fa9c9", C: "#4a85a8",
  // egg
  e: "#fffbea", E: "#fff4d6", g: "#e8cfa0", G: "#cfae78",
  // cupcake frosting
  p: "#ffe0ec", q: "#ffc8dc", P: "#f5a3c0", Q: "#d97a9c",
  // apple / cherry
  a: "#f8b0b0", r: "#f08a8a", R: "#e05a5a", d: "#a83c3c", D: "#7a2828", s: "#7cc46a", S: "#5aa85a", T: "#3d7a3d",
  // croissant
  h: "#f8d9a0", H: "#f2c98a", i: "#e0a458", I: "#b07a45",
  // cookie
  j: "#ddaa72", J: "#c98d55", k: "#b07a45", K: "#4a2c17", x: "#7a4a2a",
})
ramps("oNnBbf", "oUuYy", "TSsv", "CcLlMm", "GgEe", "QPqp", "DdRra", "IiHh", "KkJj")

const HD = { w: 30, h: 30, outline: "o" }

sprite("wheat-stalk", HD, (c) => {
  c.rect(14, 19, 3, 11, "V"); c.vline(16, 19, 11, "W"); c.vline(14, 20, 9, "v")
  // kernels stacked in pairs either side of a dark spine
  for (let i = 0; i < 4; i++) {
    const y = 5 + i * 4
    for (const x of [10, 17]) {
      c.ellipse(x + 1, y + 1, 2, 2, "u"); c.px(x, y, "y"); c.px(x + 2, y + 2, "U"); c.px(x + 1, y + 3, "U")
    }
  }
  c.ellipse(15, 3, 2, 3, "Y"); c.px(14, 1, "y"); c.vline(16, 2, 3, "u")
  c.rect(14, 5, 3, 15, "Y"); c.vline(14, 5, 15, "y"); c.vline(16, 5, 15, "u")
  for (let y = 7; y < 20; y += 4) { c.px(13, y, "o"); c.px(17, y, "o") }
  c.rect(13, 20, 5, 1, "U")
})

sprite("bread-loaf", HD, (c) => {
  c.ellipse(15, 14, 14, 8, "B")
  c.rect(1, 14, 29, 9, "B")
  c.ellipse(13, 11, 10, 4, "b")
  c.rect(1, 20, 29, 3, "n"); c.hline(2, 23, 27, "N")
  c.vline(28, 13, 8, "n"); c.vline(29, 15, 6, "n")
  // flour-dusted scores
  for (const x of [7, 13, 19]) { c.line(x, 12, x + 3, 9, "n"); c.line(x + 1, 12, x + 4, 9, "f") }
})

sprite("milk-bottle", HD, (c) => {
  c.rect(11, 2, 9, 4, "C"); c.hline(12, 2, 7, "c"); c.px(12, 3, "c")    // cap
  c.rect(11, 6, 9, 4, "M")                                                // neck
  c.poly([11, 10, 20, 10, 24, 14, 7, 14], "M")                            // shoulders
  c.rect(7, 14, 17, 14, "M")
  c.rect(9, 15, 13, 12, "L"); c.hline(9, 15, 13, "l")                     // milk
  c.rect(11, 22, 9, 4, "c"); c.hline(11, 22, 9, "C")                      // darker milk at the base
  c.vline(8, 11, 16, "m"); c.vline(10, 16, 4, "l")                        // glass glint
  c.vline(23, 14, 14, "l"); c.vline(22, 15, 12, "c")
})

sprite("egg", HD, (c) => {
  c.ellipse(15, 15, 11, 13, "E")
  c.ellipse(15, 18, 11, 10, "E")
  c.ellipse(11, 9, 3, 4, "e"); c.px(10, 6, "m"); c.px(9, 7, "m")
  // crescent shadow on the lower right
  c.recolor({ E: "g", e: "g" }, (x, y) => (x - 11) ** 2 * 0.9 + (y - 12) ** 2 > 150)
  c.recolor({ g: "G" }, (x, y) => (x - 10) ** 2 * 0.9 + (y - 10) ** 2 > 260)
})

sprite("cupcake", HD, (c) => {
  // wrapper with pleats
  c.poly([5, 17, 26, 17, 23, 28, 8, 28], "u")
  for (const x of [8, 12, 16, 20, 24]) c.line(x, 18, x - (x - 15) / 6 | 0, 27, "U")
  c.hline(6, 18, 19, "U")
  c.rect(8, 26, 15, 2, "U")
  // frosting dome
  c.ellipse(15, 12, 12, 7, "P")
  c.rect(3, 12, 25, 4, "P")
  c.hline(3, 16, 25, "Q"); c.hline(4, 15, 23, "Q")
  c.ellipse(9, 9, 4, 2, "q"); c.line(6, 9, 6, 12, "q"); c.px(7, 7, "p"); c.px(8, 7, "p")
  c.rect(3, 17, 25, 1, "o")
  // cherry
  c.circ(15, 4, 2, "R"); c.px(14, 3, "a"); c.px(17, 5, "d"); c.line(16, 1, 18, 0, "T")
})

sprite("apple", HD, (c) => {
  c.circ(10, 17, 9, "R"); c.circ(20, 17, 9, "R")
  c.ellipse(15, 21, 12, 8, "R")
  c.rect(12, 8, 7, 2, "_")
  c.ellipse(15, 27, 6, 2, "R")
  c.ellipse(8, 13, 2, 3, "r"); c.px(7, 11, "a"); c.px(7, 12, "a")
  c.recolor({ R: "d" }, (x, y) => (x - 13) ** 2 + (y - 15) ** 2 > 120 && x + y > 30)
  c.line(15, 10, 14, 3, "N", 2)                                                 // stem
  c.ellipse(20, 4, 4, 2, "S"); c.line(17, 5, 22, 3, "T"); c.px(19, 3, "s"); c.px(20, 3, "s")
})

sprite("croissant", HD, (c) => {
  // crescent: a big dome with a smaller dome cut from underneath, leaving pointed tips
  const outer = (x, y) => (x - 15) ** 2 / 196 + (y - 17) ** 2 / 144 <= 1
  const inner = (x, y) => (x - 15) ** 2 / 100 + (y - 27) ** 2 / 90 <= 1
  const body = (x, y) => outer(x + 0.5, y + 0.5) && !inner(x + 0.5, y + 0.5) && y < 26
  c.recolor({ ".": "i" }, body)
  c.rect(0, 0, 30, 30, "i"); c.recolor({ i: "_" }, (x, y) => !body(x, y))
  // underside and tips darker
  c.recolor({ i: "I" }, (x, y) => body(x, y) && !body(x, y + 2))
  c.recolor({ i: "I" }, (x, y) => body(x, y) && (x < 5 || x > 24) && y > 16)
  // three seams fanning out with the curve
  for (const [x0, y0, x1, y1] of [[8, 12, 9, 17], [14, 9, 14, 15], [20, 12, 19, 17]]) {
    c.line(x0, y0, x1, y1, "o"); c.line(x0 + 1, y0, x1 + 1, y1, "H")
  }
  c.line(6, 8, 10, 6, "H"); c.hline(11, 6, 3, "h"); c.line(18, 6, 22, 7, "H"); c.px(4, 11, "H")
})

sprite("cookie", HD, (c) => {
  c.circ(14, 15, 13, "J")
  c.ellipse(10, 9, 6, 3, "j")
  c.recolor({ J: "k", j: "k" }, (x, y) => (x - 12) ** 2 + (y - 13) ** 2 > 130 && x + y > 28)
  // big chocolate chunks, with a glint on each
  for (const [x, y] of [[9, 6], [19, 10], [6, 13], [16, 17], [11, 22], [20, 21]]) {
    c.rect(x, y, 4, 3, "K"); c.px(x, y, "x"); c.px(x + 1, y, "x"); c.px(x + 3, y + 2, "_"); c.px(x + 3, y + 2, "J")
  }
})

sheet("hd-sample", ["wheat-stalk", "bread-loaf", "milk-bottle", "egg", "cupcake", "apple", "croissant", "cookie"], { pad: 2 })
