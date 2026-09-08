const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceIcon = path.join(__dirname, '../public/icon-192x192.jpg');
const outputDir = path.join(__dirname, '../public');

// Sizes we need
const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
];

async function resizeIcons() {
  try {
    console.log('Resizing icons...');
    
    for (const { name, size } of sizes) {
      const outputPath = path.join(outputDir, name);
      
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Created ${name} (${size}x${size})`);
    }
    
    console.log('All icons resized successfully!');
  } catch (error) {
    console.error('Error resizing icons:', error);
    process.exit(1);
  }
}

resizeIcons();