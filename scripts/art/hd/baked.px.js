// Cookie, croissant and cupcake chains, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  j: "#e0a870", J: "#c98d55", k: "#b07a45", K: "#4a2c17", x: "#7a4a2a",
  t: "#8fb8dd", T: "#5a92c4", n: "#4a7fb0", N: "#2f5a82",
  y: "#ffe08a", Y: "#f2c94c", z: "#c99a2e",
  w: "#e0c49a", W: "#c9a57a", v: "#a8845a", V: "#8a6a45",
  B: "#7a2540", b: "#a83c4c", R: "#e05a5a", d: "#a83c3c", a: "#f8b0b0",
  h: "#f8d9a0", H: "#f2c98a", i: "#e0a458", I: "#b07a45", u: "#8f5530",
  m: "#ffffff", M: "#f4fbff", e: "#c9d6de", E: "#a8b8c4",
  p: "#ffe0ec", q: "#ffc8dc", P: "#f5a3c0", Q: "#d97a9c",
  c: "#f8e8c8", C: "#f2dcb0", s: "#d9b98a",
  f: "#fffaf5", F: "#ece0d8", g: "#d9c9c0",
})
ramps("Kkjh", "NntT", "zYy", "VvWw", "Bba", "dRa", "uIiHh", "EeMm", "QPqp", "sCc", "gFf")

const HD = { w: 30, h: 30, outline: "o" }

const cookieDisc = (c, x, y) => {
  c.rect(x, y - 1, 26, 1, "o")
  c.rect(x + 1, y, 24, 6, "J"); c.rect(x, y + 1, 26, 4, "J"); c.hline(x + 2, y, 20, "j")
  c.rect(x, y + 4, 26, 2, "k"); c.rect(x + 1, y + 5, 24, 1, "k")
  for (const dx of [4, 10, 17, 22]) c.rect(x + dx, y + 1 + (dx % 2), 2, 2, "K")
}

sprite("cookie-stack", HD, (c) => {
  cookieDisc(c, 0, 6)
  cookieDisc(c, 4, 14)
  cookieDisc(c, 2, 22)
  c.rect(0, 5, 26, 1, "_")
})

sprite("cookie-tin", HD, (c) => {
  c.poly([4, 6, 26, 6, 29, 9, 29, 11, 1, 11, 1, 9], "T"); c.hline(4, 7, 10, "t"); c.px(3, 8, "t")
  c.rect(1, 11, 28, 1, "o")
  c.rect(1, 12, 28, 16, "n"); c.vline(1, 12, 16, "T")
  c.rect(1, 14, 28, 2, "Y"); c.hline(1, 14, 28, "y"); c.rect(1, 23, 28, 2, "Y"); c.hline(1, 24, 28, "z")
  c.recolor({ n: "N" }, (x, y) => x > 25)
  c.circ(12, 19, 3, "J"); c.px(11, 18, "j"); c.rect(12, 19, 2, 1, "K"); c.px(10, 20, "K")   // cookie badge
})

sprite("gift-hamper", HD, (c) => {
  // bottle and cookie poking out of the basket
  c.rect(4, 1, 4, 5, "Y"); c.vline(4, 1, 5, "y")
  c.rect(2, 6, 8, 10, "B"); c.vline(3, 7, 7, "b"); c.rect(4, 10, 2, 3, "R")
  c.circ(21, 11, 6, "J"); c.ellipse(19, 9, 3, 2, "j")
  for (const [x, y] of [[18, 10], [22, 8], [23, 13], [19, 14]]) c.rect(x, y, 2, 2, "K")
  c.rect(0, 15, 30, 1, "o")
  c.poly([0, 16, 30, 16, 27, 28, 3, 28], "W")
  c.recolor({ W: "v" }, (x, y) => y > 16 && ((x >> 1) + ((y - 17) >> 1)) % 2 === 0)
  c.hline(0, 16, 30, "w")
  // ribbon bow
  c.rect(12, 16, 6, 3, "R"); c.poly([10, 17, 15, 19, 10, 23], "R"); c.poly([20, 17, 15, 19, 20, 23], "R"); c.px(14, 17, "a")
  c.recolor({ W: "v", v: "V" }, (x, y) => x > 24)
})

sprite("pain-au-chocolat", HD, (c) => {
  // chocolate batons poking out of each end
  c.rect(0, 13, 4, 6, "x"); c.rect(26, 13, 4, 6, "x"); c.hline(0, 13, 4, "u"); c.hline(26, 13, 4, "u")
  c.vline(4, 12, 9, "o"); c.vline(25, 12, 9, "o")
  c.rect(5, 8, 20, 13, "i"); c.rect(3, 10, 24, 9, "i")
  for (const x of [5, 11, 17]) { c.hline(x, 9, 4, "H"); c.px(x + 4, 9, "I") }
  c.hline(5, 8, 20, "h")
  c.hline(5, 13, 20, "H"); c.hline(5, 14, 20, "I")
  c.rect(5, 19, 20, 2, "I"); c.vline(24, 9, 10, "I")
})

sprite("pastry-platter", HD, (c) => {
  const pastry = (x, y) => {
    c.rect(x, y, 8, 7, "i"); c.rect(x, y, 3, 3, "H"); c.px(x, y, "h"); c.rect(x, y + 6, 8, 1, "I"); c.vline(x + 7, y + 3, 4, "I")
  }
  pastry(7, 5); pastry(16, 5)
  c.rect(6, 12, 19, 1, "o"); c.vline(15, 5, 7, "o")
  pastry(0, 13); pastry(11, 13); pastry(22, 13)
  c.vline(9, 13, 7, "o"); c.vline(20, 13, 7, "o")
  c.rect(0, 20, 30, 1, "o")
  c.rect(0, 21, 30, 3, "M"); c.hline(1, 21, 28, "m")
  c.rect(2, 24, 26, 2, "e"); c.hline(2, 25, 26, "E")
})

sprite("cake-slice", HD, (c) => {
  c.circ(25, 3, 2, "R"); c.px(24, 2, "a")
  c.poly([1, 15, 28, 5, 29, 5, 29, 15], "P"); c.line(4, 14, 26, 6, "q")
  c.rect(1, 15, 28, 1, "o")
  c.rect(1, 16, 28, 11, "C")
  c.rect(1, 20, 28, 2, "q"); c.hline(1, 20, 28, "p")
  c.hline(1, 16, 28, "c"); c.vline(28, 16, 11, "s"); c.hline(1, 26, 28, "s")
})

sprite("layer-cake", HD, (c) => {
  c.circ(15, 2, 2, "R"); c.px(14, 1, "a")
  c.ellipse(15, 8, 13, 4, "P"); c.rect(1, 8, 28, 5, "P"); c.ellipse(8, 7, 4, 1, "q")
  c.rect(1, 13, 28, 10, "C")
  c.recolor({ C: "q" }, (x, y) => y === 17 || y === 18 || y === 21)
  for (const x of [3, 9, 15, 21, 26]) { c.rect(x, 13, 3, 2 + (x % 3), "P"); c.px(x + 2, 14 + (x % 3), "Q") }   // frosting drips
  c.vline(28, 13, 10, "s")
  c.rect(0, 23, 30, 1, "o")
  c.rect(0, 24, 30, 2, "M"); c.hline(1, 25, 28, "e")
})

sprite("wedding-cake", HD, (c) => {
  c.circ(15, 2, 2, "R"); c.px(14, 1, "a")
  const tier = (x, y, w, h) => {
    c.rect(x, y - 1, w, 1, "o")
    c.rect(x, y, w, h, "f"); c.hline(x, y, w, "m"); c.vline(x + w - 1, y, h, "F")
    c.rect(x, y + h - 3, w, 2, "P"); c.hline(x, y + h - 3, w, "q")
  }
  tier(10, 6, 10, 6)
  tier(6, 13, 18, 7)
  tier(1, 21, 28, 8)
  c.rect(0, 5, 30, 1, "_"); c.vline(28, 21, 8, "g")
})

sheet("hd-baked", ["cookie-stack", "cookie-tin", "gift-hamper", "pain-au-chocolat", "pastry-platter", "cake-slice", "layer-cake", "wedding-cake"], { pad: 2 })
