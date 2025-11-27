const heroicons = require('@heroicons/react/24/outline');
console.log('Available icons:');
console.log(Object.keys(heroicons).filter(k => k.toLowerCase().includes('eraser') || k.toLowerCase().includes('circle') || k.toLowerCase().includes('pentagon')).join(', '));