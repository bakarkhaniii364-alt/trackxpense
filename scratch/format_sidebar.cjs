const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'components', 'Sidebar.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Simple formatting: break after semicolons, braces, and tags if they are in long lines
content = content.replace(/;/g, ';\n');
content = content.replace(/{/g, '{\n');
content = content.replace(/}/g, '\n}\n');
content = content.replace(/>/g, '>\n');
content = content.replace(/</g, '\n<');

fs.writeFileSync(filePath, content);
