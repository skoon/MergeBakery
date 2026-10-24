// Egg chain, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  m: "#ffffff", e: "#fffbea", E: "#fff4d6", g: "#e8cfa0", G: "#cfae78",
  k: "#e0c49a", K: "#c9a57a", j: "#a8845a", J: "#8a6a45",
  w: "#b8743e", W: "#9c5b2e", s: "#e4e7ea", S: "#c9cdd1", t: "#9aa1a8",
  h: "#fff0b8", y: "#f7d774", Y: "#d9a83c", Z: "#b8862a",
  l: "#cfeaf8", L: "#a8d8f0", c: "#6fa9c9", C: "#4a85a8",
  r: "#f4fbff", R: "#d4e3ea", f: "#9fb3bf",
  a: "#f2c26b", b: "#c47a2c", B: "#a8641f", n: "#8a4f1a",
})
ramps("GgEe", "JjKk", "tSs", "ZYyh", "CcLl", "fRr", "nBba")

const HD = { w: 30, h: 30, outline: "o" }

// one egg, shaded from the top-left; reused by pair and carton
const egg = (c, cx, cy, rx, ry) => {
  c.ellipse(cx, cy, rx, ry, "E")
  c.recolor({ E: "g" }, (x, y) => (x - cx + 2) ** 2 / rx ** 2 + (y - cy + 2) ** 2 / ry ** 2 > 0.95 && x + y > cx + cy)
  c.recolor({ E: "e" }, (x, y) => (x - cx + rx / 2.5) ** 2 + (y - cy + ry / 2.5) ** 2 < 4)
  c.px(cx - (rx / 2 | 0), cy - (ry / 2 | 0) - 1, "m")
}

sprite("egg-pair", HD, (c) => {
  egg(c, 8, 12, 7, 9)
  c.ellipse(19, 18, 8, 10, "o")
  egg(c, 19, 18, 7, 9)
})

sprite("egg-carton", HD, (c) => {
  for (const x of [5, 15, 25]) egg(c, x, 12, 3, 5)
  for (const x of [8, 18]) c.rect(x + 1, 7, 2, 7, "o")
  c.rect(0, 13, 30, 1, "o")
  c.rect(1, 14, 28, 10, "K"); c.hline(1, 14, 28, "k")
  for (const x of [4, 10, 16, 22]) { c.rect(x + 1, 16, 2, 4, "j"); c.px(x + 1, 16, "J") }
  c.rect(1, 22, 28, 3, "J")
})

sprite("whisked-eggs", HD, (c) => {
  // whisk: steel loops dipping in, brown handle sticking out
  c.line(13, 13, 24, 2, "S", 3); c.line(13, 13, 24, 2, "s"); c.rect(23, 0, 4, 4, "W"); c.px(23, 0, "w")
  c.ellipse(15, 13, 13, 3, "y")
  c.hline(4, 12, 4, "h"); c.hline(19, 12, 4, "h"); c.px(6, 13, "m"); c.px(23, 13, "m")
  c.line(13, 13, 16, 10, "S")
  c.rect(0, 15, 30, 1, "o")
  c.poly([0, 16, 30, 16, 26, 25, 22, 28, 8, 28, 4, 25], "L")
  c.hline(1, 16, 28, "l"); c.recolor({ L: "c" }, (x, y) => y > 24 || x > 25)
  c.hline(8, 27, 14, "C")
})

sprite("custard-cup", HD, (c) => {
  c.poly([4, 7, 26, 7, 29, 14, 1, 14], "y")
  c.ellipse(7, 10, 3, 1, "h"); c.hline(20, 13, 6, "Y")
  c.rect(1, 15, 28, 1, "o")
  c.poly([1, 16, 29, 16, 29, 22, 26, 26, 4, 26, 1, 22], "r")
  for (let x = 3; x < 28; x += 4) c.vline(x, 16, 10, "R")
  c.recolor({ r: "R", R: "f" }, (x, y) => x > 22 && y > 20)
})

sprite("creme-brulee", HD, (c) => {
  // sparkle above the torched sugar
  c.vline(24, 0, 5, "a"); c.hline(22, 2, 5, "a"); c.px(24, 2, "m")
  c.poly([3, 9, 27, 9, 29, 16, 1, 16], "b")
  c.ellipse(6, 12, 3, 1, "a"); c.px(4, 12, "h")
  c.line(16, 10, 14, 15, "o"); c.line(15, 12, 18, 14, "n")          // crack in the caramel
  c.hline(20, 15, 8, "n")
  c.rect(0, 17, 30, 1, "o")
  c.poly([0, 18, 30, 18, 30, 22, 27, 26, 3, 26, 0, 22], "r")
  for (let x = 2; x < 30; x += 4) c.vline(x, 18, 8, "R")
  c.recolor({ r: "R", R: "f" }, (x, y) => x > 23 && y > 21)
})

sheet("hd-eggs", ["egg-pair", "egg-carton", "whisked-eggs", "custard-cup", "creme-brulee"], { pad: 2 })
