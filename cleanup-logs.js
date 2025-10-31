const fs = require('fs');
const path = require('path');

const filesToClean = [
  './pages/StorageListingPage_steptwo.ts',
  './pages/RentalDetailsPage_stepfour.ts',
  './pages/PaymentDetailsPage_stepfive.ts'
];

for (const filePath of filesToClean) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove verbose timestamp logs but keep important ones
  const unnecessaryPatterns = [
    /console\.log\(`\[\$\{new Date\(\)\.toISOString\(\)\}\] 🚀 Starting navigation.*\n/g,
    /console\.log\(`\[\$\{new Date\(\)\.toISOString\(\)\}\] 📡 Attempting page\.goto.*\n/g,
    /console\.log\(`\[\$\{new Date\(\)\.toISOString\(\)\}\] ⏳ Waiting for.*\n/g,
    /console\.log\(`\[\$\{new Date\(\)\.toISOString\(\)\}\] ℹ️ Network still active.*\n/g,
    /console\.log\(`\[\$\{new Date\(\)\.toISOString\(\)\}\] 📝 Found rent button.*\n/g,
    /console\.log\(`\[\$\{new Date\(\)\.toISOString\(\)\}\] 🌐 Current URL.*\n/g,
    /\s*console\.log\('Attempting to select state - OPTIMIZED APPROACH'\);\n/g,
    /\s*console\.log\('Attempting to fill zip code:.*\n/g,
    /\s*console\.log\('Filling rental details form - CRITICAL STEP'\);\n/g,
    /\s*console\.log\('Filling payment details - CRITICAL STEP'\);\n/g,
    /\s*console\.log\('Attempting to submit payment - CRITICAL STEP'\);\n/g,
    /\s*console\.log\('Starting robust error detection\.\.\.'\);\n/g,
    /\s*console\.log\('Starting polling error detection\.\.\.'\);\n/g,
    /\s*console\.log\('Starting extended error detection\.\.\.'\);\n/g,
    /\s*console\.log\(`Attempting to proceed to next step - CRITICAL STEP`\);\n/g
  ];
  
  unnecessaryPatterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Cleaned up logs in ${filePath}`);
}

console.log('\n✅ All logs cleaned up!');
