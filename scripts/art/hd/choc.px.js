// Brownie and bonbon chains, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  m: "#ffffff", e: "#fff4d6",
  h: "#a86a4a", b: "#8a5238", c: "#6b3a24", d: "#4a2616",
  r: "#c0392b", R: "#e05a50",
  I: "#c8ccd2", i: "#e2e5e9", j: "#9aa0a8",
  y: "#e8cd85", Y: "#c9a24a", n: "#9a7a2e",
  p: "#d07ab0", P: "#b05a90", Q: "#8a3a6a", X: "#5a2444",
})
ramps("dcbh", "jIi", "nYy", "XQPp")

const HD = { w: 30, h: 30, outline: "o" }

sprite("brownie", HD, (c) => {
  c.rect(4, 8, 22, 4, "b"); c.hline(4, 8, 22, "h")
  c.rect(4, 12, 22, 6, "c")
  for (const [x, y] of [[13, 13], [8, 15], [20, 15]]) c.rect(x, y, 2, 2, "b")   // crumb pockets
  c.rect(4, 18, 22, 5, "d")
  // icing-sugar flecks on the corners
  c.rect(3, 6, 2, 2, "m"); c.rect(25, 6, 2, 2, "m")
})

sprite("brownie-tray", HD, (c) => {
  c.rect(2, 7, 26, 2, "h")
  c.rect(2, 9, 26, 9, "c"); for (const x of [10, 19]) c.vline(x, 7, 11, "d"); c.hline(2, 13, 26, "d")
  c.rect(2, 7, 26, 1, "h")
  c.rect(0, 18, 30, 1, "m")
  c.rect(0, 19, 30, 7, "I"); c.hline(0, 19, 30, "i"); c.rect(0, 25, 30, 2, "j")
})

sprite("chocolate-cake", HD, (c) => {
  c.circ(15, 4, 3, "r"); c.px(14, 3, "R"); c.px(13, 4, "R")
  c.ellipse(15, 9, 9, 2, "h"); c.rect(6, 9, 19, 2, "h")
  for (const x of [8, 13, 19, 23]) c.rect(x, 10, 2, 2 + (x % 2), "h")              // ganache drips
  c.rect(6, 11, 19, 4, "b")
  c.rect(1, 15, 28, 5, "b"); c.hline(1, 15, 28, "h")
  c.rect(1, 20, 28, 4, "c"); for (const x of [8, 16, 22]) c.rect(x, 21, 2, 1, "e")
  c.rect(1, 24, 28, 4, "d")
  c.vline(28, 15, 13, "d")
})

sprite("chocolate-tower", HD, (c) => {
  c.rect(13, 0, 4, 6, "Y"); c.vline(13, 0, 6, "y")
  const tier = (x, y, w, h, k, dots) => {
    c.rect(x, y - 1, w, 1, "o")
    c.rect(x, y, w, h, k); c.hline(x, y, w, "h")
    for (const dx of dots) c.rect(x + dx, y + Math.floor(h / 2), 2, 1, "y")
  }
  tier(8, 6, 14, 6, "b", [2, 10])
  tier(4, 13, 22, 7, "c", [2, 18])
  tier(1, 21, 28, 7, "d", [2, 24])
  c.rect(1, 21, 28, 2, "Y"); c.hline(1, 21, 28, "y")
  c.rect(0, 5, 30, 1, "_")
})

sprite("bonbon", HD, (c) => {
  // twisted wrapper tails
  c.poly([22, 4, 27, 1, 28, 6], "X"); c.poly([22, 25, 27, 29, 28, 23], "X")
  c.px(26, 2, "Q"); c.px(26, 27, "Q")
  c.circ(14, 15, 11, "P")
  c.recolor({ P: "Q" }, (x, y) => (x - 11) ** 2 + (y - 12) ** 2 > 90 && x + y > 26)
  c.recolor({ Q: "X" }, (x, y) => (x - 10) ** 2 + (y - 11) ** 2 > 190 && x + y > 30)
  c.ellipse(9, 9, 3, 2, "p"); c.px(7, 8, "m")
  c.line(9, 16, 19, 12, "Q")                                                       // drizzle
})

sprite("bonbon-box", HD, (c) => {
  c.ellipse(10, 4, 3, 3, "Y"); c.ellipse(20, 4, 3, 3, "Y"); c.ellipse(10, 4, 1, 1, "n"); c.ellipse(20, 4, 1, 1, "n")
  c.rect(1, 8, 28, 1, "o")
  c.rect(1, 9, 28, 19, "Q")
  c.rect(1, 9, 28, 5, "P"); c.hline(1, 9, 28, "p")
  c.rect(1, 23, 28, 5, "X")
  c.rect(13, 6, 4, 22, "Y"); c.rect(1, 17, 28, 3, "Y"); c.vline(13, 6, 22, "y"); c.hline(1, 17, 28, "y")
})

sprite("bonbon-tin", HD, (c) => {
  // a bonbon sits on the lid
  c.circ(15, 4, 4, "P"); c.ellipse(13, 2, 1, 1, "m"); c.recolor({ P: "Q" }, (x, y) => x + y > 21)
  c.poly([6, 8, 24, 8, 29, 11, 1, 11], "Y"); c.hline(7, 9, 10, "y")
  c.rect(0, 11, 30, 4, "y"); c.hline(0, 14, 30, "Y")
  c.rect(0, 15, 30, 1, "o")
  c.rect(0, 16, 30, 7, "Y")
  for (const [x, y] of [[8, 18], [20, 18], [14, 20]]) c.rect(x, y, 2, 2, "Q")
  c.rect(1, 23, 28, 5, "n"); c.hline(1, 23, 28, "Y")
})

sheet("hd-choc", ["brownie", "brownie-tray", "chocolate-cake", "chocolate-tower", "bonbon", "bonbon-box", "bonbon-tin"], { pad: 2 })
