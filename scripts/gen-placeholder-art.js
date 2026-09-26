/**
 * Placeholder art generator for Rise & Shine Bakery items (task T2.7).
 * Generates 128x128 SVG files for each item with chain color, tier number, and label.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Parse hex color to RGB.
 * @param {string} hex - Color in #rrggbb format.
 * @returns {{r: number, g: number, b: number}} RGB components 0-255.
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex color.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string} Color in #rrggbb format.
 */
function rgbToHex(r, g, b) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Darken a color by a fixed amount.
 * @param {string} hex - Color in #rrggbb format.
 * @param {number} amount - Amount to reduce each RGB component (0-255).
 * @returns {string} Darker color in #rrggbb format.
 */
function darkenColor(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    Math.max(0, r - amount),
    Math.max(0, g - amount),
    Math.max(0, b - amount),
  );
}

/**
 * Calculate relative luminance of a color.
 * @param {string} hex - Color in #rrggbb format.
 * @returns {number} Luminance 0-1.
 */
function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [r8, g8, b8] = [r, g, b].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r8 + 0.7152 * g8 + 0.0722 * b8;
}

/**
 * Get text color based on background luminance.
 * @param {string} bgHex - Background color in #rrggbb format.
 * @returns {string} Text color: white (#ffffff) for dark backgrounds, near-black (#1a1a1a) for light.
 */
function getTextColor(bgHex) {
  const luminance = getRelativeLuminance(bgHex);
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}

/**
 * Extract up to 3 capital letters from item name.
 * Takes the first letter of each word, up to 3 letters.
 * @param {string} name - Item name (e.g. "Wheat stalk", "Crème brûlée").
 * @returns {string} Label (e.g. "WS", "CB").
 */
function generateLabel(name) {
  const words = name
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word[0].toUpperCase());
  return words.slice(0, 3).join('');
}

/**
 * Generate SVG content for a placeholder item.
 * @param {string} color - Chain color in #rrggbb format.
 * @param {number} tier - Item tier (1-based).
 * @param {string} label - Item label (e.g. "WS").
 * @returns {string} SVG content.
 */
function generateSvg(color, tier, label) {
  const outlineColor = darkenColor(color, 60);
  const textColor = getTextColor(color);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <style>
      .placeholder-bg { fill: ${color}; stroke: ${outlineColor}; stroke-width: 4; }
      .tier-text { font-size: 48px; font-weight: bold; fill: ${textColor}; text-anchor: middle; }
      .label-text { font-size: 16px; font-weight: 500; fill: ${textColor}; text-anchor: middle; }
    </style>
  </defs>
  <rect class="placeholder-bg" x="2" y="2" width="124" height="124" rx="24" ry="24"/>
  <text class="tier-text" x="64" y="58">${tier}</text>
  <text class="label-text" x="64" y="85">${label}</text>
</svg>`;
}

/**
 * Main function to generate placeholder art for all items.
 */
async function generatePlaceholderArt() {
  // Read items.json
  const itemsPath = path.resolve('src/data/items.json');
  const itemsData = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));

  // Create a map of chain colors
  const chainColors = new Map();
  itemsData.chains.forEach((chain) => {
    chainColors.set(chain.id, chain.color);
  });

  // Create public/art directory if it doesn't exist
  const artDir = path.resolve('public/art');
  if (!fs.existsSync(artDir)) {
    fs.mkdirSync(artDir, { recursive: true });
  }

  // Generate SVG for each item
  let count = 0;
  itemsData.items.forEach((item) => {
    const color = chainColors.get(item.chainId);
    if (!color) {
      throw new Error(`Chain ${item.chainId} not found for item ${item.id}`);
    }

    const label = generateLabel(item.name);
    const svg = generateSvg(color, item.tier, label);
    const filePath = path.join(artDir, `${item.spriteKey}.svg`);

    fs.writeFileSync(filePath, svg, 'utf-8');
    count++;
  });

  console.log(`Generated ${count} placeholder SVG files in public/art/`);
}

// Run the generator
generatePlaceholderArt().catch((error) => {
  console.error('Error generating placeholder art:', error.message);
  process.exit(1);
});
