// Flour chain, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  u: "#e8c07d", U: "#c99a55", y: "#fbefd2", Y: "#f2dcb0", v: "#a8c45e", V: "#8ba84a", W: "#5f7a30",
  r: "#b8743e", c: "#9c5b2e", C: "#74401d",
  a: "#fff6e6", A: "#f2dcb0", b: "#e8c07d", d: "#c99a55", D: "#a87a3c", w: "#ffffff",
  e: "#fffaf0", E: "#f5e3c0", g: "#ddc79c", G: "#c4ab7c",
  t: "#c4824a", s: "#a8642e", S: "#7d4620", T: "#5e3216",
})
ramps("oCcr", "oDdbAa", "WVv", "GgEe", "TSst")

const HD = { w: 30, h: 30, outline: "o" }

sprite("wheat-bundle", HD, (c) => {
  for (const x of [4, 14, 24]) {
    c.rect(x, 12, 3, 17, "V"); c.vline(x + 2, 12, 17, "W"); c.vline(x, 12, 17, "v")
    c.ellipse(x + 1, 6, 2, 6, "u")
    c.vline(x, 1, 10, "y"); c.vline(x + 2, 3, 9, "U")
    for (let y = 3; y < 12; y += 3) { c.px(x - 1, y, "o"); c.px(x + 3, y + 1, "o") }
  }
  c.rect(0, 15, 30, 5, "c"); c.hline(0, 15, 30, "o"); c.hline(0, 19, 30, "o")
  c.hline(0, 16, 30, "r"); c.hline(0, 18, 30, "C")
})

sprite("flour-scoop", HD, (c) => {
  c.ellipse(7, 7, 5, 4, "a"); c.rect(2, 7, 14, 3, "a"); c.ellipse(11, 7, 4, 3, "a")
  c.px(5, 4, "w"); c.px(4, 5, "w"); c.recolor({ a: "A" }, (x, y) => x > 11 && y > 6)
  c.rect(0, 9, 28, 2, "o")
  c.poly([1, 11, 17, 11, 17, 18, 14, 25, 4, 25, 1, 18], "b")
  c.rect(5, 20, 9, 7, "d"); c.poly([1, 18, 4, 21, 14, 21, 17, 18, 14, 25, 4, 25], "d")
  c.vline(2, 12, 6, "A"); c.vline(15, 12, 7, "d")
  c.vline(17, 11, 7, "o")
  c.rect(18, 11, 10, 4, "c"); c.hline(18, 11, 10, "r"); c.hline(18, 14, 10, "C"); c.rect(18, 15, 10, 1, "o")
})

sprite("flour-bag", HD, (c) => {
  c.rect(9, 3, 12, 6, "A"); c.vline(9, 3, 6, "a"); c.vline(20, 3, 6, "b")
  c.hline(9, 8, 12, "o")
  c.poly([7, 9, 23, 9, 26, 12, 26, 28, 4, 28, 4, 12], "b")
  c.rect(5, 13, 20, 5, "A"); c.hline(5, 13, 20, "a"); c.hline(5, 17, 20, "d")
  c.poly([4, 28, 26, 28, 26, 26, 18, 21, 12, 21, 4, 26], "d")
  c.vline(5, 10, 3, "A"); c.vline(25, 12, 14, "d")
})

sprite("flour-sack", HD, (c) => {
  // tied corners with a brown cord between them
  c.ellipse(9, 4, 3, 3, "A"); c.ellipse(20, 4, 3, 3, "A"); c.px(8, 2, "a")
  c.rect(13, 4, 4, 5, "c"); c.vline(13, 4, 5, "r")
  c.poly([6, 7, 24, 7, 28, 11, 28, 28, 2, 28, 2, 11], "b")
  c.rect(3, 13, 24, 5, "A"); c.hline(3, 13, 24, "a"); c.hline(3, 17, 24, "d")
  c.poly([2, 28, 28, 28, 28, 25, 20, 19, 10, 19, 2, 25], "d")
  c.vline(3, 10, 3, "A"); c.vline(27, 11, 15, "d"); c.hline(3, 27, 25, "D")
})

sprite("dough-ball", HD, (c) => {
  c.ellipse(15, 17, 13, 10, "E")
  c.recolor({ E: "g" }, (x, y) => (x - 12) ** 2 / 1.4 + (y - 14) ** 2 > 105 && x + y > 30)
  c.recolor({ g: "G" }, (x, y) => (x - 11) ** 2 / 1.4 + (y - 13) ** 2 > 140 && x + y > 34)
  c.ellipse(8, 12, 3, 2, "e"); c.px(6, 11, "w"); c.px(7, 10, "w")
})

sprite("sourdough-boule", HD, (c) => {
  c.ellipse(15, 15, 14, 12, "s")
  c.recolor({ s: "S" }, (x, y) => (x - 12) ** 2 + (y - 12) ** 2 > 150 && x + y > 30)
  c.recolor({ S: "T" }, (x, y) => (x - 11) ** 2 + (y - 11) ** 2 > 230 && x + y > 34)
  c.ellipse(9, 8, 4, 2, "t")
  // cross score, opened up to show the pale crumb
  c.rect(5, 13, 19, 2, "b"); c.rect(13, 6, 2, 17, "b")
  c.hline(5, 15, 19, "S"); c.vline(15, 6, 17, "S"); c.px(15, 13, "b"); c.px(15, 14, "b")
})

sheet("hd-flour", ["wheat-bundle", "flour-scoop", "flour-bag", "flour-sack", "dough-ball", "sourdough-boule"], { pad: 2 })
