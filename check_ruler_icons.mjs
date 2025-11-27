import * as heroicons from '@heroicons/react/24/outline';

console.log('Available ruler-related icons:');
const available = Object.keys(heroicons);
const rulerIcons = available.filter(k => 
  k.toLowerCase().includes('ruler') || 
  k.toLowerCase().includes('measure')
);
console.log('Ruler icons:', rulerIcons.join(', '));