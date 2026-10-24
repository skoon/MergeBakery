// Flour mill and dairy fridge generators, 32x32 HD redraws. Original pixel (x, y) sits at interior (2x - 1, 2y - 1).
pal({
  o: "#3a2414",
  r: "#b8743e", a: "#9c5b2e", A: "#6d3d1d", u: "#e8c07d", U: "#c99a55", D: "#a87a3c",
  f: "#fff4d6", F: "#f2dcb0", R: "#a83c3c", S: "#d05a50", Q: "#7a2828",
  y: "#ffe08a", Y: "#f2c94c", z: "#c99a2e",
  m: "#ffffff", M: "#f4fbff", g: "#e6f8f0", G: "#d4f1e6", n: "#9ed9c3", N: "#6fae9b", K: "#4f8a78",
})
ramps("AaUu", "DUuF", "QRS", "zYy", "KNnGg")

// --- flour mill: thin unoutlined sails (as in the originals) behind an outlined tower
for (const t of [1, 2, 3]) {
  const wall = "U", cap = t === 1 ? "A" : "R", base = t === 3 ? "Y" : "a"
  sprite(`_mill_body_${t}`, { w: 30, h: 30, outline: "o" }, (c) => {
    c.ellipse(15, 12, 4, 3, cap); c.rect(11, 12, 9, 2, cap); c.hline(13, 10, 3, t === 1 ? "a" : "S")
    c.rect(10, 14, 11, 1, "o")
    c.poly([11, 15, 20, 15, 23, 25, 7, 25], wall)
    c.vline(11, 15, 9, "u"); c.recolor({ U: "D" }, (x, y) => x > 18 && y > 14)
    if (t > 1) { c.rect(14, 18, 3, 2, "f"); c.rect(13, 22, 5, 4, "o") }          // window and door
    c.rect(7, 25, 17, 1, "o")
    c.rect(7, 26, 17, 3, base); c.hline(7, 26, 17, t === 3 ? "y" : "r")
    if (t === 3) { c.vline(15, 3, 6, "o"); c.rect(16, 3, 3, 2, "Y"); c.px(16, 3, "y") }   // flag
  })
  sprite(`flour-mill-${t}`, { w: 32, h: 32 }, (c) => {
    const sail = t === 1 ? "a" : "F", edge = t === 1 ? "A" : "U"
    for (const [x0, y0, x1, y1] of [[1, 0, 16, 13], [30, 0, 16, 13], [1, 25, 16, 13], [30, 25, 16, 13]]) {
      c.line(x0, y0, x1, y1, sail); c.line(x0, y0 + 1, x1, y1 + 1, edge)
    }
  }, stamp(`_mill_body_${t}`, 0, 0))
}

// --- dairy fridge: tier 1 tall single door with a freezer, tiers 2-3 double doors (3 gets gold trim)
const handle = (c, x, y) => { c.rect(x, y, 2, 4, "M"); c.px(x, y, "m") }

sprite("dairy-fridge-1", { w: 30, h: 30, outline: "o" }, (c) => {
  c.rect(6, 1, 18, 26, "G")
  c.rect(8, 3, 14, 7, "n"); c.rect(8, 13, 14, 12, "n")
  c.rect(6, 11, 18, 1, "o")
  c.rect(8, 23, 14, 2, "N"); c.vline(8, 3, 7, "g"); c.vline(8, 13, 10, "g")
  handle(c, 18, 5); handle(c, 18, 15)
  c.rect(8, 27, 2, 2, "o"); c.rect(20, 27, 2, 2, "o")
})

for (const t of [2, 3]) {
  sprite(`dairy-fridge-${t}`, { w: 30, h: 30, outline: "o" }, (c) => {
    c.rect(1, 1, 28, 26, "G")
    c.rect(3, 4, 11, 21, "n"); c.rect(16, 4, 11, 21, "n")
    c.rect(14, 3, 2, 23, "o")
    c.vline(3, 4, 19, "g"); c.vline(16, 4, 19, "g"); c.rect(3, 23, 11, 2, "N"); c.rect(16, 23, 11, 2, "N")
    handle(c, 11, 6); handle(c, 17, 6); handle(c, 11, 18); handle(c, 17, 18)
    if (t === 3) {
      c.rect(1, 1, 28, 2, "Y"); c.hline(1, 1, 28, "y"); c.rect(1, 25, 28, 2, "Y"); c.hline(1, 26, 28, "z")
    } else c.hline(1, 1, 28, "g")
    c.rect(3, 27, 3, 2, "o"); c.rect(24, 27, 3, 2, "o")
  })
}

sheet("hd-gens-a", ["flour-mill-*", "dairy-fridge-*"], { pad: 2 })
