// Dairy chain, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  m: "#ffffff", M: "#f4fbff", l: "#cfeaf8", L: "#a8d8f0", c: "#6fa9c9", C: "#4a85a8",
  k: "#fff4d6", K: "#f2e2b8",
  a: "#fff0b8", b: "#f7d774", B: "#e8c05a", d: "#d9a83c", D: "#b8862a",
  h: "#fff2b8", y: "#ffe08a", Y: "#f5c542", z: "#d9a020", Z: "#b07e14", x: "#8a5c10",
})
ramps("CcLlMm", "DdBbah", "xZzYyh")

const HD = { w: 30, h: 30, outline: "o" }

sprite("milk-splash", HD, (c) => {
  c.circ(15, 20, 9, "M"); c.poly([15, 2, 6, 18, 24, 18], "M")
  c.circ(15, 20, 7, "L"); c.poly([15, 7, 8, 19, 22, 19], "L")
  c.recolor({ L: "c" }, (x, y) => (x - 13) ** 2 + (y - 17) ** 2 > 40 && x + y > 34)
  c.ellipse(13, 22, 2, 2, "c"); c.px(12, 21, "C")
  c.vline(9, 15, 6, "m"); c.vline(10, 12, 3, "l"); c.px(14, 5, "m")
})

sprite("cream-jug", HD, (c) => {
  // handle: a thick ceramic loop on the right
  c.ellipse(21, 16, 7, 6, "M"); c.ellipse(21, 16, 4, 3, "_")
  c.recolor({ M: "l" }, (x, y) => x > 18 && y > 17)
  c.rect(1, 7, 18, 21, "M")
  c.rect(1, 5, 9, 3, "k"); c.ellipse(4, 5, 4, 2, "k"); c.px(2, 4, "m")   // cream at the lip
  c.rect(3, 15, 14, 8, "L"); c.hline(3, 15, 14, "l")                     // painted band
  c.rect(3, 23, 14, 2, "c"); c.hline(3, 24, 14, "C")
  c.vline(2, 8, 18, "m"); c.vline(17, 8, 19, "l")
  c.rect(3, 27, 14, 1, "l")
})

sprite("butter-pat", HD, (c) => {
  c.poly([6, 7, 24, 7, 28, 13, 2, 13], "a"); c.hline(7, 8, 8, "h")
  c.rect(1, 13, 28, 1, "o")
  c.rect(1, 14, 28, 8, "b"); c.hline(1, 14, 28, "h"); c.vline(28, 14, 8, "B")
  c.rect(1, 20, 28, 2, "d"); c.hline(1, 21, 28, "D")
})

sprite("butter-block", HD, (c) => {
  c.poly([3, 1, 22, 1, 26, 4, 28, 7, 0, 7, 0, 4], "a"); c.hline(4, 2, 12, "h")
  c.rect(0, 7, 30, 1, "o")
  c.rect(0, 8, 28, 19, "b"); c.vline(0, 8, 19, "h"); c.vline(27, 8, 19, "B")
  c.rect(0, 22, 28, 5, "d"); c.hline(0, 26, 28, "D")
  c.rect(9, 8, 8, 19, "M"); c.vline(9, 8, 19, "m"); c.vline(16, 8, 19, "l"); c.hline(9, 26, 8, "l")   // paper band
})

sprite("cheese-wedge", HD, (c) => {
  c.poly([0, 15, 0, 13, 27, 2, 28, 2, 28, 15], "y"); c.line(2, 13, 26, 3, "h")
  c.rect(0, 15, 30, 1, "o")
  c.rect(0, 16, 28, 12, "Y"); c.vline(27, 16, 12, "z")
  c.rect(0, 26, 28, 2, "z"); c.hline(0, 27, 28, "Z")
  for (const [x, y] of [[5, 17], [17, 17], [3, 22], [21, 22], [11, 20]]) {
    c.rect(x, y, 2, 3, "x"); c.px(x, y, "Z")
  }
})

sprite("cheese-wheel", HD, (c) => {
  c.ellipse(15, 8, 13, 5, "y"); c.rect(2, 8, 27, 4, "y"); c.ellipse(10, 6, 5, 1, "h")
  c.rect(1, 11, 29, 1, "o")
  c.rect(0, 12, 30, 15, "Y"); c.vline(29, 12, 15, "z")
  c.rect(0, 25, 30, 2, "z"); c.hline(0, 26, 30, "Z")
  for (const [x, y] of [[6, 13], [17, 13], [9, 19], [21, 19], [2, 19]]) {
    c.rect(x, y, 2, 3, "x"); c.px(x, y, "Z")
  }
})

sheet("hd-dairy", ["milk-splash", "cream-jug", "butter-pat", "butter-block", "cheese-wedge", "cheese-wheel"], { pad: 2 })
