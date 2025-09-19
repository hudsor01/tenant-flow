const original = "Product'; DROP TABLE orders--";
console.log('Original:', original);

// My filtering logic
const filtered = original
  .split('')
  .filter(char => {
    const code = char.charCodeAt(0);
    return code > 31 && code !== 127 && code !== 0;
  })
  .join('');

console.log('After filtering:', filtered);

// Then escaping
const escaped = filtered
  .replace(/'/g, "''")
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '""');

console.log('After escaping:', escaped);

// Test pattern
const pattern = /(\bdrop\b|\bdelete\b|\btruncate\b|\balter\b)\s+(table|database)/gi;
console.log('Pattern matches:', pattern.test(escaped));