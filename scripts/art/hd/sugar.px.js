// Sugar chain, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  m: "#ffffff", q: "#fff0f5", p: "#f9b8cd", P: "#f27ba0", Q: "#c9557c", R: "#8d1940", r: "#ffa8c4",
  k: "#c9a57a", K: "#a8845a", g: "#eef9fb", G: "#d4eef2", e: "#fff4d6",
  a: "#e8a85a", b: "#c47a2c", B: "#a8641f", n: "#8a4f1a",
  s: "#7cc46a", S: "#5aa85a",
  d: "#c98550", c: "#a8642e", C: "#7d4620", D: "#6a3a1a",
  h: "#b06a3e", u: "#8f5530", U: "#6a3a1a", x: "#4a2812",
  i: "#eeeef2", I: "#d9d9e0", j: "#9a9aa5",
  y: "#ffe08a", Y: "#f2c94c", z: "#c99a2e",
})
ramps("RQPpq", "nBba", "DCcd", "xUuh", "jIi", "zYy", "KkG")

const HD = { w: 30, h: 30, outline: "o" }

sprite("sugar-cube", HD, (c) => {
  c.poly([15, 1, 29, 8, 15, 15, 1, 8], "m")
  c.poly([1, 8, 15, 15, 15, 29, 1, 22], "q")
  c.poly([15, 15, 29, 8, 29, 22, 15, 29], "p")
  c.line(2, 9, 14, 15, "m"); c.line(16, 15, 28, 9, "r")
  for (const [x, y] of [[5, 15], [9, 21], [19, 19], [24, 14], [13, 6], [20, 7]]) c.px(x, y, y < 9 ? "q" : x < 15 ? "m" : "r")
})

sprite("sugar-bowl", HD, (c) => {
  c.ellipse(15, 9, 9, 4, "q"); c.rect(6, 9, 19, 3, "q"); c.ellipse(13, 7, 5, 2, "m")
  c.rect(17, 3, 2, 6, "i"); c.vline(17, 3, 6, "m")                      // spoon handle
  c.rect(3, 11, 25, 1, "o")
  c.poly([3, 12, 28, 12, 28, 18, 24, 22, 7, 22, 3, 18], "P")
  c.hline(4, 12, 23, "r"); c.vline(4, 13, 5, "r"); c.vline(27, 13, 5, "Q")
  c.rect(7, 21, 17, 2, "Q")
  c.rect(10, 23, 11, 3, "Q"); c.hline(10, 23, 11, "o"); c.hline(11, 25, 9, "R")
})

sprite("syrup-bottle", HD, (c) => {
  c.rect(11, 1, 8, 6, "k"); c.vline(11, 1, 6, "e"); c.vline(18, 1, 6, "K")  // cork
  c.rect(10, 7, 10, 1, "o")
  c.rect(11, 8, 8, 3, "G"); c.poly([11, 11, 19, 11, 21, 13, 9, 13], "G"); c.vline(12, 8, 4, "g")
  c.poly([9, 13, 21, 13, 24, 16, 24, 27, 6, 27, 6, 16], "P")
  c.vline(7, 16, 10, "p"); c.vline(8, 15, 3, "r"); c.px(9, 14, "r")
  c.rect(10, 17, 12, 5, "e"); c.hline(10, 17, 12, "m"); c.hline(11, 19, 8, "p")
  c.rect(6, 25, 18, 2, "Q"); c.vline(23, 16, 9, "Q")
})

sprite("caramel", HD, (c) => {
  // twisted wrapper ends on both sides
  for (const flip of [0, 1]) {
    const X = (x) => (flip ? 29 - x : x)
    c.poly([X(0), 8, X(5), 12, X(5), 17, X(0), 21], "P")
    c.line(X(1), 11, X(1), 18, "p"); c.line(X(4), 12, X(4), 17, "Q")
    c.vline(X(6), 12, 6, "o")
  }
  c.ellipse(15, 15, 8, 7, "b")
  c.ellipse(13, 12, 5, 3, "a"); c.hline(11, 10, 4, "e")
  c.recolor({ b: "B" }, (x, y) => (x - 14) ** 2 + (y - 14) ** 2 > 40 && x + y > 31)
  c.recolor({ B: "n" }, (x, y) => (x - 13) ** 2 + (y - 13) ** 2 > 60 && x + y > 34)
})

sprite("cocoa-bean", HD, (c) => {
  c.vline(15, 1, 4, "S"); c.ellipse(16, 2, 2, 1, "s")                   // sprout
  c.ellipse(15, 16, 11, 12, "c")
  c.recolor({ c: "D" }, (x, y) => (x - 13) ** 2 + (y - 15) ** 2 * 0.8 > 70 && x > 17)
  c.recolor({ c: "C" }, (x, y) => (x - 13) ** 2 + (y - 15) ** 2 * 0.8 > 50 && x > 17)
  c.line(7, 9, 7, 19, "d"); c.line(6, 12, 6, 16, "d")
  c.vline(14, 5, 23, "C"); c.vline(15, 5, 23, "o")                     // seam
})

sprite("chocolate-bar", HD, (c) => {
  c.rect(1, 1, 28, 14, "u")
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const x = 1 + i * 9, y = 1 + j * 7
    c.rect(x, y, 9, 7, "U"); c.rect(x, y, 7, 5, "u"); c.hline(x, y, 6, "h"); c.vline(x, y, 4, "h")
    c.hline(x, y + 6, 9, "x"); c.vline(x + 8, y, 7, "x")
  }
  c.rect(0, 15, 30, 1, "o")
  c.rect(0, 16, 30, 12, "P")
  c.rect(0, 16, 30, 2, "I"); c.hline(2, 16, 4, "m"); c.px(0, 17, "i")
  c.rect(3, 21, 24, 2, "q"); c.rect(0, 26, 30, 2, "I"); c.px(29, 27, "j"); c.vline(29, 18, 8, "Q")
})

sprite("truffle-box", HD, (c) => {
  // bow
  c.ellipse(8, 4, 3, 3, "Y"); c.ellipse(21, 4, 3, 3, "Y"); c.rect(12, 5, 6, 4, "Y")
  c.ellipse(8, 4, 1, 1, "z"); c.ellipse(21, 4, 1, 1, "z"); c.px(7, 2, "y"); c.px(20, 2, "y")
  c.rect(1, 9, 28, 1, "o")
  c.rect(1, 10, 28, 17, "Q")
  c.recolor({ Q: "R" }, (x, y) => x + y > 46)
  c.hline(2, 10, 26, "P"); c.rect(2, 11, 3, 2, "P")
  c.rect(13, 10, 4, 17, "Y"); c.rect(1, 15, 28, 3, "Y")
  c.vline(13, 10, 17, "y"); c.hline(1, 15, 28, "y"); c.hline(1, 17, 28, "z"); c.vline(16, 10, 17, "z")
})

sheet("hd-sugar", ["sugar-cube", "sugar-bowl", "syrup-bottle", "caramel", "cocoa-bean", "chocolate-bar", "truffle-box"], { pad: 2 })
