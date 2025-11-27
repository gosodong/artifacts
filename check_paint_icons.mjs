import * as heroicons from '@heroicons/react/24/outline';

console.log('Available paint-related icons:');
const available = Object.keys(heroicons);
const paintIcons = available.filter(k => 
  k.toLowerCase().includes('paint') || 
  k.toLowerCase().includes('brush')
);
console.log('Paint/Brush icons:', paintIcons.join(', '));