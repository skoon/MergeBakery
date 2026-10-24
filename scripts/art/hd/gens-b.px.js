// Hen coop, sugar tin and fruit crate generators, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  R: "#a83c3c", r: "#e05a5a", a: "#f08a8a", Q: "#7a2828",
  w: "#e8b874", W: "#d9a05c", V: "#9d6420", A: "#6d3d1d",
  h: "#fff2b8", H: "#f7d774", y: "#ffe08a", Y: "#f2c94c", z: "#c99a2e", Z: "#d9a020",
  m: "#ffffff",
  j: "#9a9aa5", i: "#e8e8ee", I: "#c9c9d2",
  p: "#f27ba0", P: "#c9557c", X: "#8d1940", q: "#fff0f5",
  k: "#c9a57a", K: "#a8845a",
  c: "#dcb06a", C: "#c99a55", d: "#a8703a", D: "#7a4f26", n: "#9a7a2e",
  b: "#d94b4b", s: "#6fbb68", S: "#4f9b4a", g: "#d07ac0", G: "#b05aa0", U: "#7a2f6e",
  e: "#e8cd85", E: "#c9a24a",
})
ramps("QRra", "AVWw", "zYyh", "jIi", "XPpq", "DdCc", "UGg", "Ee")

const HD = { w: 30, h: 30, outline: "o" }

for (const t of [1, 2, 3]) {
  sprite(`hen-coop-${t}`, HD, (c) => {
    c.poly([15, 2, 26, 11, 4, 11], "R")
    c.line(14, 4, 7, 10, "r"); c.line(13, 4, 9, 7, "a")
    if (t === 3) { c.rect(14, 0, 3, 5, "Y"); c.rect(13, 1, 5, 3, "Y"); c.rect(12, 2, 7, 1, "Y"); c.px(14, 1, "h"); c.px(15, 2, "h") }  // star
    c.rect(2, 11, 26, 2, t === 3 ? "Y" : "o"); if (t === 3) c.hline(2, 11, 26, "y")
    c.rect(5, 13, 20, 11, "W"); c.vline(5, 13, 11, "w"); c.recolor({ W: "V" }, (x, y) => x > 22)
    for (let y = 16; y < 24; y += 3) c.hline(6, y, 17, "V")
    if (t > 1) { c.rect(7, 14, 3, 2, "r"); c.px(7, 14, "a") }                         // little window
    // arched door; tiers 2-3 have a chick peeking out
    c.rect(11, 17, 8, 7, "o"); c.ellipse(15, 17, 4, 2, "o")
    c.rect(13, 17, 4, 6, "A"); c.ellipse(15, 17, 2, 1, "A")
    if (t > 1) { c.circ(15, 19, 2, "H"); c.px(14, 18, "h"); c.px(16, 19, "o"); c.px(17, 20, "Z"); c.rect(13, 21, 4, 2, "m") }
    c.rect(4, 24, 22, 1, "o")
    c.rect(3, 25, 24, 3, "H"); c.hline(3, 25, 24, "h")
    for (const x of [6, 11, 17, 22]) c.line(x, 27, x + 2, 25, "Y")                   // straw
  })
}

for (const t of [1, 2, 3]) {
  sprite(`sugar-tin-${t}`, HD, (c) => {
    if (t > 1) { c.line(19, 9, 27, 0, "k", 2); c.line(20, 9, 28, 1, "K") }            // wooden spoon
    if (t === 3) { c.vline(3, 1, 5, "Y"); c.hline(1, 3, 5, "Y"); c.px(3, 3, "h") }    // sparkle
    c.rect(13, 4, 4, 3, "j"); c.hline(13, 4, 4, "I")
    c.rect(4, 7, 22, 1, "o")
    c.rect(3, 8, 24, 3, t === 3 ? "Y" : "i"); c.hline(3, 8, 24, t === 3 ? "y" : "m"); c.hline(3, 10, 24, t === 3 ? "z" : "I")
    c.rect(3, 11, 24, 1, "o")
    c.rect(5, 12, 20, 15, "P")
    c.vline(6, 13, 3, "p"); c.vline(7, 13, 1, "p")
    c.rect(5, 17, 20, 4, "q")
    for (let x = 6; x < 22; x += 4) c.rect(x, 18, 2, 2, "P")
    c.recolor({ P: "X" }, (x, y) => x + y > 44)
  })
}

// fruit peeking over a plank crate; tier 2 adds leaves, tier 3 grapes and a pear
const grape = (c, x, y) => { c.circ(x, y, 3, "o"); c.circ(x, y, 2, "G"); c.px(x - 1, y - 1, "g"); c.px(x + 1, y + 1, "U") }
const berry = (c, x, y) => { c.circ(x, y, 3, "o"); c.circ(x, y, 2, "b"); c.px(x - 1, y - 1, "a"); c.px(x + 1, y + 1, "Q") }
for (const t of [1, 2, 3]) {
  sprite(`fruit-crate-${t}`, HD, (c) => {
    if (t === 3) {
      c.ellipse(15, 6, 3, 4, "e"); c.ellipse(15, 3, 2, 2, "e"); c.px(14, 3, "y"); c.vline(14, 6, 3, "y"); c.vline(15, 0, 1, "D")  // pear
      for (const [x, y] of [[5, 8], [9, 6], [9, 10], [21, 6], [25, 8], [21, 10]]) grape(c, x, y)
    } else {
      berry(c, 5, 8); berry(c, 11, 6); berry(c, 17, 8); c.rect(10, 1, 2, 2, "S")
      if (t === 2) { berry(c, 23, 8); for (const x of [7, 14, 20, 25]) { c.rect(x, 9, 3, 2, "S"); c.px(x, 9, "s") } }
    }
    c.rect(0, 11, 30, 1, "o")
    c.rect(0, 12, 30, 17, "d")
    c.rect(0, 12, 30, 3, t === 3 ? "E" : "C"); c.hline(0, 12, 30, t === 3 ? "e" : "c")
    c.hline(0, 16, 30, "D"); c.hline(0, 17, 30, "D"); c.hline(0, 24, 30, "D"); c.rect(0, 25, 30, 4, "D")
    c.hline(0, 18, 30, "C")
    for (const x of [2, 26]) { c.rect(x, 20, 2, 2, "n"); c.px(x, 20, "e") }       // nails
  })
}

sheet("hd-gens-b", ["hen-coop-*", "sugar-tin-*", "fruit-crate-*"], { pad: 2 })
