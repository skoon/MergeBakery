// Grandma's stash and bake sale event items, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  m: "#ffffff", f: "#fff4d6", F: "#e6d9b0",
  k: "#dcb06a", K: "#c99a55", d: "#a8703a", D: "#7a4f26",
  y: "#e8cd85", Y: "#c9a24a", n: "#9a7a2e",
  g: "#b4ecc4", G: "#8edba6", s: "#3fae6a", S: "#2b8450",
  b: "#f9e3b0", B: "#f0cf8a", c: "#cfa75a", C: "#a8843e",
  P: "#e0457b", p: "#f58aae",
  h: "#ffe08a", H: "#f2c94c",
})
ramps("DdKk", "nYy", "SsGg", "CcBb", "Ff")

const HD = { w: 30, h: 30, outline: "o" }

sprite("stash-1", HD, (c) => {
  // trunk with grandma's recipe note poking out
  c.poly([6, 0, 10, 4, 7, 7, 3, 3], "f"); c.line(5, 3, 7, 5, "F")
  c.ellipse(15, 8, 13, 4, "K"); c.rect(2, 8, 27, 3, "K"); c.ellipse(11, 6, 6, 1, "k")
  c.rect(1, 11, 28, 2, "d"); c.rect(1, 13, 28, 2, "n")
  c.rect(1, 15, 28, 8, "d")
  c.rect(12, 14, 6, 5, "Y"); c.hline(12, 14, 6, "y"); c.rect(14, 16, 2, 2, "o")   // lock
  c.rect(1, 23, 28, 5, "D"); c.hline(1, 23, 28, "d")
  c.recolor({ K: "d", d: "D" }, (x, y) => x > 26)
})

sprite("stash-flour", HD, (c) => {
  c.rect(11, 2, 2, 3, "n"); c.rect(17, 2, 2, 3, "n")
  c.rect(9, 5, 12, 4, "Y"); c.hline(9, 5, 12, "y")
  c.rect(9, 9, 12, 19, "f")
  c.rect(9, 9, 4, 19, "m"); c.rect(17, 9, 4, 19, "F")
  c.rect(10, 15, 10, 4, "n"); c.hline(10, 15, 10, "Y")
})

sprite("stash-sack", HD, (c) => {
  c.ellipse(15, 4, 6, 3, "Y"); c.hline(11, 3, 6, "y")
  c.ellipse(15, 18, 12, 11, "f"); c.rect(5, 7, 20, 6, "f")
  c.poly([5, 7, 9, 7, 7, 11, 4, 11], "f"); c.poly([21, 7, 25, 7, 26, 11, 23, 11], "f")
  c.ellipse(8, 14, 3, 4, "m")
  c.recolor({ f: "F" }, (x, y) => (x - 13) ** 2 + (y - 16) ** 2 > 110 && x + y > 30)
  c.rect(13, 15, 4, 6, "n"); c.hline(13, 15, 4, "Y")
})

sprite("stash-crate", HD, (c) => {
  // cloth bundle on a plank crate
  c.ellipse(15, 4, 6, 4, "f"); c.rect(9, 4, 12, 3, "f"); c.ellipse(13, 2, 3, 1, "m")
  c.rect(0, 6, 30, 1, "o")
  c.rect(0, 7, 30, 21, "d")
  c.rect(0, 7, 30, 3, "K"); c.hline(0, 7, 30, "k")
  c.rect(0, 13, 30, 3, "D"); c.rect(0, 23, 30, 5, "D")
  c.hline(0, 16, 30, "K")
  for (const x of [2, 26]) for (const y of [11, 20]) { c.rect(x, y, 2, 1, "Y"); c.px(x, y, "y") }
})

sprite("stash-reserve", HD, (c) => {
  c.ellipse(15, 15, 14, 16, "d"); c.recolor({ d: "_" }, (x, y) => y < 4 || y > 27)
  c.ellipse(15, 4, 7, 3, "f"); c.ellipse(13, 3, 3, 1, "m")
  c.rect(1, 8, 29, 3, "n"); c.rect(1, 20, 29, 4, "n")
  c.rect(2, 11, 6, 9, "K"); c.rect(23, 11, 6, 9, "D")
  c.hline(1, 8, 29, "Y"); c.hline(1, 20, 29, "Y")
})

sprite("sale-table-1", HD, (c) => {
  // awning
  c.rect(1, 0, 28, 8, "s")
  c.rect(1, 0, 8, 4, "G"); c.hline(1, 0, 28, "g")
  for (const x of [4, 10, 16, 22]) c.rect(x, 5, 2, 2, "m")
  c.rect(1, 8, 28, 1, "o")
  c.rect(1, 9, 2, 6, "D"); c.rect(27, 9, 2, 6, "D")                    // canopy poles
  // goods: a green box and a bun
  c.rect(5, 10, 7, 5, "S"); c.rect(5, 10, 7, 1, "s"); c.rect(7, 9, 3, 1, "G")
  c.ellipse(20, 12, 5, 3, "B"); c.ellipse(19, 11, 2, 1, "b"); c.px(22, 12, "m")
  c.rect(0, 15, 30, 1, "o")
  c.rect(0, 16, 30, 2, "K"); c.hline(0, 16, 30, "k")
  c.rect(0, 18, 30, 2, "d")
  c.rect(3, 20, 3, 9, "D"); c.rect(24, 20, 3, 9, "D")
})

sprite("sale-bun", HD, (c) => {
  c.ellipse(15, 16, 13, 9, "B"); c.ellipse(11, 12, 7, 4, "b")
  c.recolor({ B: "c" }, (x, y) => x + y > 34 && y < 21)
  for (const [x, y] of [[9, 13], [15, 10], [20, 15], [12, 18], [23, 12]]) c.rect(x, y, 2, 1, "m")
  c.rect(4, 21, 22, 6, "c"); c.hline(4, 21, 22, "C")
  for (let x = 6; x < 25; x += 4) c.vline(x, 22, 5, "C")
})

sprite("sale-box", HD, (c) => {
  c.ellipse(10, 4, 3, 3, "m"); c.ellipse(20, 4, 3, 3, "m"); c.ellipse(10, 4, 1, 1, "F"); c.ellipse(20, 4, 1, 1, "F")
  c.rect(1, 8, 28, 1, "o")
  c.rect(1, 9, 28, 19, "s")
  c.rect(1, 9, 28, 4, "G"); c.hline(1, 9, 28, "g")
  c.rect(1, 23, 28, 5, "S")
  c.rect(13, 6, 4, 22, "m"); c.vline(16, 9, 19, "F")
})

sprite("sale-hamper", HD, (c) => {
  // arched handle
  c.ellipse(15, 11, 9, 10, "D"); c.ellipse(15, 11, 7, 8, "_"); c.rect(5, 11, 21, 12, "_")
  c.rect(8, 9, 5, 5, "s"); c.px(8, 9, "G")
  c.ellipse(19, 11, 3, 2, "P"); c.px(18, 10, "p")
  c.rect(3, 12, 24, 2, "d")
  c.rect(0, 14, 30, 1, "o")
  c.rect(0, 15, 30, 4, "K"); c.hline(0, 15, 30, "k")
  c.poly([0, 19, 30, 19, 30, 22, 26, 28, 4, 28, 0, 22], "d")
  c.recolor({ d: "D" }, (x, y) => y > 19 && ((x >> 1) + ((y - 19) >> 1)) % 2 === 0)
})

sprite("sale-raffle-cake", HD, (c) => {
  // raffle ticket on a pick
  c.rect(19, 0, 10, 7, "H"); c.hline(19, 0, 10, "h"); c.rect(21, 2, 3, 2, "n"); c.px(26, 4, "n")
  c.vline(19, 7, 2, "o")
  c.rect(3, 8, 22, 6, "m"); c.hline(3, 13, 22, "F")
  for (const x of [5, 11, 17]) c.rect(x, 10, 2, 2, "P")
  c.rect(1, 14, 28, 1, "o")
  c.rect(1, 15, 28, 4, "G"); c.hline(1, 15, 28, "g")
  c.rect(1, 19, 28, 5, "s"); c.rect(1, 24, 28, 4, "S")
})

sheet("hd-stash-sale", ["stash-*", "sale-*"], { pad: 2 })
