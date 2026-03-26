const fs = require('fs');

const path = 'src/app/shared/navbar/navbar.html';
let html = fs.readFileSync(path, 'utf8');

// Remove pointerdown entirely
html = html.replace(/\s*\(pointerdown\)="[^"]+"\s*/g, ' ');

// Change DesdeEvento($event) to ()
html = html.replace(/DesdeEvento\(\$event\)/g, '()');

fs.writeFileSync(path, html);
console.log('Done replacement in navbar.html');
