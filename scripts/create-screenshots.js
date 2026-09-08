const sharp = require('sharp');
const path = require('path');

const outputDir = path.join(__dirname, '../public');

// Create placeholder screenshots
const screenshots = [
  { name: 'screenshot-wide.png', width: 1280, height: 720, color: '#1a1a2e' },
  { name: 'screenshot-narrow.png', width: 750, height: 1334, color: '#16213e' }
];

async function createScreenshots() {
  try {
    console.log('Creating placeholder screenshots...');
    
    for (const { name, width, height, color } of screenshots) {
      const outputPath = path.join(outputDir, name);
      
      // Create a simple colored background with text
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${color}"/>
          <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
            Shree Sai Engineering
          </text>
          <text x="50%" y="55%" font-family="Arial" font-size="16" fill="#cccccc" text-anchor="middle" dominant-baseline="middle">
            ${name}
          </text>
        </svg>
      `;
      
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Created ${name} (${width}x${height})`);
    }
    
    console.log('Placeholder screenshots created successfully!');
    console.log('NOTE: Replace these with actual screenshots of your app for better PWA experience');
  } catch (error) {
    console.error('Error creating screenshots:', error);
    process.exit(1);
  }
}

createScreenshots();