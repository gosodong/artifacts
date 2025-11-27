import * as heroicons from '@heroicons/react/24/outline';

console.log('Available square-related icons:');
const available = Object.keys(heroicons);
const squareIcons = available.filter(k => 
  k.toLowerCase().includes('square') || 
  k.toLowerCase().includes('rect')
);
console.log('Square icons:', squareIcons.join(', '));