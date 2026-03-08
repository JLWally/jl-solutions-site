#!/usr/bin/env node
/**
 * Converts PNG/JPG images in assets/images to WebP format.
 * Run: node scripts/convert-to-webp.js
 * Or: npm run images:webp
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'assets', 'images');
const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));

Promise.all(files.map(f => {
  const input = path.join(dir, f);
  const output = path.join(dir, f.replace(/\.(png|jpg|jpeg)$/i, '.webp'));
  return sharp(input)
    .webp({ quality: 82 })
    .toFile(output)
    .then(() => console.log('Created', path.basename(output)))
    .catch(e => console.error('Error:', f, e.message));
})).then(() => console.log('Done.')).catch(e => console.error(e));
