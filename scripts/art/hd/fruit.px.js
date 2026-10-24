// Fruit chain, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  s: "#7cc46a", S: "#5aa85a", T: "#3d7a3d",
  a: "#f8b0b0", r: "#f08a8a", R: "#e05a5a", d: "#a83c3c", D: "#7a2525", P: "#7a2540",
  e: "#fff4d6", h: "#fff0b8", y: "#f7e08a",
  m: "#ffffff", g: "#eef9fb", G: "#d4eef2",
  k: "#e0c49a", K: "#c9a57a", j: "#a8845a", J: "#8a6a45",
  i: "#f2c27a", I: "#e0a458", b: "#b07a45",
})
ramps("TSs", "DdRra", "JjKk", "bIi")

const HD = { w: 30, h: 30, outline: "o" }

// a small round berry with its own dark rim, so clustered berries stay readable
const drupe = (c, x, y, r = 3) => {
  c.circ(x, y, r, "o"); c.circ(x, y, r - 1, "R")
  c.px(x - 1, y - 1, "a"); c.px(x + r - 2, y + r - 2, "d"); c.px(x + r - 2, y + r - 3, "d")
}

sprite("berry", HD, (c) => {
  c.ellipse(15, 15, 10, 8, "R"); c.poly([5, 15, 25, 15, 17, 28, 13, 28], "R"); c.ellipse(15, 18, 9, 8, "R")
  c.recolor({ R: "d" }, (x, y) => x - y * 0.3 > 15 && (x - 13) ** 2 + (y - 15) ** 2 > 40)
  c.ellipse(9, 14, 2, 3, "r"); c.px(8, 12, "a")
  for (const [x, y] of [[13, 13], [19, 12], [11, 19], [17, 18], [22, 17], [14, 24], [8, 16], [18, 23]]) c.px(x, y, "h")
  // leafy cap
  c.poly([6, 9, 10, 5, 15, 8, 20, 5, 24, 9, 20, 12, 15, 11, 10, 12], "S")
  c.line(8, 8, 12, 6, "s"); c.line(18, 6, 21, 7, "s"); c.rect(14, 2, 2, 6, "T"); c.px(14, 2, "S")
  c.px(10, 11, "T"); c.px(20, 11, "T")
})

sprite("berry-bunch", HD, (c) => {
  c.ellipse(9, 4, 5, 3, "S"); c.ellipse(20, 4, 5, 3, "S"); c.line(6, 3, 11, 2, "s"); c.line(18, 2, 22, 3, "s")
  c.vline(15, 3, 5, "T")
  for (const [x, y] of [[11, 10], [19, 11], [6, 15], [14, 15], [22, 16], [10, 20], [18, 21], [14, 26]]) drupe(c, x, y, 4)
})

sprite("apple-basket", HD, (c) => {
  const apple = (x, y) => {
    c.circ(x, y, 5, "o"); c.circ(x, y, 4, "R"); c.px(x - 2, y - 2, "a"); c.px(x - 3, y - 1, "r")
    c.recolor({ R: "d" }, (px, py) => px - x + py - y > 3 && (px - x) ** 2 + (py - y) ** 2 <= 16)
  }
  apple(5, 13); apple(24, 13)
  apple(14, 9); c.line(14, 4, 14, 1, "J", 2); c.px(16, 2, "S"); c.px(17, 2, "S")
  c.rect(0, 15, 30, 1, "o")
  c.poly([0, 16, 30, 16, 27, 28, 3, 28], "K")
  c.recolor({ K: "j" }, (x, y) => y > 16 && ((x >> 1) + ((y - 17) >> 1)) % 2 === 0)   // weave
  c.hline(0, 16, 30, "k"); c.recolor({ K: "j", j: "J" }, (x, y) => x > 24)
})

sprite("jam-jar", HD, (c) => {
  // gingham lid
  c.rect(1, 1, 28, 6, "m")
  for (let y = 1; y < 7; y += 2) for (let x = (y % 4 === 1 ? 0 : 2); x < 30; x += 4) c.rect(x + 1, y, 2, 2, "R")
  c.rect(0, 7, 30, 1, "o")
  c.rect(5, 8, 20, 2, "G"); c.hline(5, 8, 20, "g")
  c.rect(3, 10, 24, 1, "o")
  c.poly([1, 11, 29, 11, 29, 24, 26, 27, 4, 27, 1, 24], "d")
  c.recolor({ d: "D" }, (x, y) => x > 25 || y > 24)
  c.vline(3, 12, 10, "R"); c.vline(4, 13, 6, "r")
  c.rect(7, 15, 14, 5, "e"); c.hline(7, 15, 14, "m"); c.hline(9, 17, 10, "r")
})

sprite("fruit-tart-filling", HD, (c) => {
  c.ellipse(15, 13, 13, 7, "R"); c.rect(1, 13, 28, 3, "R")
  c.recolor({ R: "d" }, (x, y) => x + y > 34 && y > 10)
  c.ellipse(9, 9, 4, 2, "r"); c.px(7, 8, "a")
  for (const [x, y, k] of [[11, 8, "y"], [17, 7, "y"], [20, 11, "P"], [6, 12, "y"], [13, 13, "P"], [23, 9, "y"], [16, 11, "r"]]) {
    c.rect(x, y, 2, 2, k)
  }
  c.rect(0, 15, 30, 1, "o")
  c.poly([0, 16, 30, 16, 30, 19, 25, 24, 5, 24, 0, 19], "I")
  for (let x = 1; x < 30; x += 4) { c.rect(x + 2, 17, 2, 3, "b"); c.px(x, 17, "i") }
  c.hline(5, 23, 20, "b")
})

sheet("hd-fruit", ["berry", "berry-bunch", "apple-basket", "jam-jar", "fruit-tart-filling"], { pad: 2 })
