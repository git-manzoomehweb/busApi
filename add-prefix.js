// file: add-prefix.js
const fs = require('fs');
const path = require('path');

// تنظیمات:
const targetDir = './web/static';
const targetDirmob = './mobile/static';
const fileExtensions = ['.html', '.js'];
const prefix = 'book-';

const classRegex = /class=["']([^"']+)["']/g;

function addPrefixToClasses(content) {
  return content.replace(classRegex, (match, classList) => {
    const updated = classList
      .split(/\s+/)
      .map(cls => {
        if (cls.startsWith(prefix) || cls.trim() === '') return cls;

        const parts = cls.split(':');
        const lastPart = parts.pop();
        return [...parts, prefix + lastPart].join(':');
      })
      .join(' ');
    return `class="${updated}"`;
  });
}


function processFiles(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processFiles(fullPath);
    } else if (fileExtensions.includes(path.extname(fullPath))) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const updatedContent = addPrefixToClasses(content);
      fs.writeFileSync(fullPath, updatedContent, 'utf-8');
    }
  });
}

processFiles(targetDir);
processFiles(targetDirmob);