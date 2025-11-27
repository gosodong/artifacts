import * as heroicons from '@heroicons/react/24/outline';

console.log('Available icons:');
const available = Object.keys(heroicons);
const relevant = available.filter(k => 
  k.toLowerCase().includes('eraser') || 
  k.toLowerCase().includes('circle') || 
  k.toLowerCase().includes('pentagon') ||
  k.toLowerCase().includes('brush') ||
  k.toLowerCase().includes('pencil') ||
  k.toLowerCase().includes('arrow') ||
  k.toLowerCase().includes('text') ||
  k.toLowerCase().includes('ruler')
);
console.log('Relevant icons:', relevant.join(', '));