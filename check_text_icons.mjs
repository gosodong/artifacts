import * as heroicons from '@heroicons/react/24/outline';

console.log('Available text-related icons:');
const available = Object.keys(heroicons);
const textIcons = available.filter(k => 
  k.toLowerCase().includes('text') || 
  k.toLowerCase().includes('font') ||
  k.toLowerCase().includes('type')
);
console.log('Text icons:', textIcons.join(', '));