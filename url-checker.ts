import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Raw URL data from your paste.txt
const rawUrlData = `10Fed: 10 Federal Storage,10federalstorage.com
ASG: The Storage Advantage - 1st Class Boat and RV Storage,1stclassboatandrv.thestorageadvantage.com
ASG: The Storage Advantage - 1st Class Storage,1stclassstorage.thestorageadvantage.com
ASG: The Storage Advantage - Add-A-Space Mini Storage,addaspaceministorage.thestorageadvantage.com
ASG: The Storage Advantage - Akron Self Storage,akronselfstorage.thestorageadvantage.com
SSUN: z_NOT USED | All Purpose Storage,allpurposestorage.selfstorageunitsnearby.com
Amazon Storage,amazonstoragellc.com
Arkansas Storage Centers,arkansasstoragecenters.com
ASG: The Storage Advantage - Arnold Self Storage,arnoldselfstorage.thestorageadvantage.com
SSUN: Bigger Garage Self Storage,biggergarageselfstorage.selfstorageunitsnearby.com
Bluebird Blog,blog.bluebirdstorage.ca
Bluebird Self Storage,bluebirdstorage.ca
ASG: The Storage Advantage - Broken Arrow Storage,brokenarrowselfstorage.thestorageadvantage.com
SSP: Burning Tree Self Storage,burningtreeselfstorage.com
ASG: The Storage Advantage - Capital City Storage,capitalcitystorage.thestorageadvantage.com
Carolina Secure Storage,carolinasecurestorage.com
SSUN: z_NOT USED | Cypress Mini Storage,cypressministorage.selfstorageunitsnearby.com
PM: Armored Mini Storage,dahlonegastorageuhaul.com
SSUN: Delco Storage,delcostorage.selfstorageunitsnearby.com
BB Clone,demo.storagely.io
Distinct Storage,distinctstorage.com
PM: Doraville Self Storage,doravilleselfstorage.com
ASG: The Storage Advantage - Emerald Coast Storage,emeraldcoaststorage.thestorageadvantage.com
Excalibur Self Storage,excaliburselfstorage.com
ESM: Expert Storage Management,expertstoragemanagement.com
VSG: Frederica Storage,fredericastorage.victorystoragegroup.com
ESM: Fremaux Self Storage,fremauxstorage.com
Gate 5 Self Storage,gate5selfstorage.com
Gatekeeper Self Storage,gatekeeperstoragega.com
SSP: Glen Eagle Self Storage,gleneaglestorage.com
VSG: Hamilton Road Storage,hamiltonroadstorage.victorystoragegroup.com
ASG: The Storage Advantage - Harte Storage,hartestorage.thestorageadvantage.com
ASG: Hearthfire Self Storage,hfirestorage.com
ASG: The Storage Advantage - High Country Self Storage,highcountryselfstorage.thestorageadvantage.com
ASG: The Storage Advantage - Hobbs Self Storage,hobbsselfstorage.thestorageadvantage.com
SSUN: z_NOT USED | Horizon Mini Storage,horizonministorage.selfstorageunitsnearby.com
Iron Door Self Storage,irondoorstorage.com
Just Store It!,juststoreit.com
Kitchener Self Storage,kitchenerstorage.com
ASG: The Storage Advantage - LaGrange Climate Storage,lagrangeclimatestorage.thestorageadvantage.com
Lock N Go,lockngo.ca
ASG: The Storage Advantage - Masterkey Storage,masterkeystorage.thestorageadvantage.com
ASG: The Storage Advantage - Metco Mini Storage,metcoministorage.thestorageadvantage.com
ASG: ModBox Storage,modboxstorage.com
modSTORAGE,modstorage.com
VSG: Moody Road Storage,moodyroadstorage.victorystoragegroup.com
ASG: The Storage Advantage - Old Foundry Storage,oldfoundrystorage.thestorageadvantage.com
ASG: The Storage Advantage - Park Forest Self Storage,parkforeststorage.thestorageadvantage.com
ASG: Poth Mini Storage & RV Park,pothstorageandrv.com
ASG: Radiant Storage,radiantstorage.com
ASG: The Storage Advantage - Red Door Storage,reddoorstorage.thestorageadvantage.com
SSP: Red Rocks Self Storage,redrocksstorage.com
Security Public Storage,rental.securitypublicstorage.com
ESM: Rhino Storage Solutions,rhino-storage.com
ESM: Riverfront Self Storage,riverfrontselfstorage.com
SSUN: z_NOT USED | Route 36 Storage,route36storage.selfstorageunitsnearby.com
ASG: The Storage Advantage - Roxborough Storage,roxboroughstorage.thestorageadvantage.com
ASG: The Storage Advantage - Safe Storage,safestorage.thestorageadvantage.com
U-Lock Mini Storage,selfstorage.ca
SSUN: Self Storage Units Nearby,selfstorageunitsnearby.com
SSUN: z_NOT USED | Slate Storage,slatestorage.selfstorageunitsnearby.com
Smart Space Storage,smartspace.biz
SSUN: Smart Storage MI,smartstorage.selfstorageunitsnearby.com
Smart Self Storage,smartstorageohio.com
SSUN: z_NOT USED | Smithfield Safe Storage,smithfieldsafestorage.selfstorageunitsnearby.com
VSG: South Port Storage,southportstorage.victorystoragegroup.com
Space Cubed,space-cubed.com
ASG: The Storage Advantage - Space Savers Storage,spacesaversstorage.thestorageadvantage.com
ASG: SpotDog Storage,spotdogstorage.com
10Fed: Storage Depot,storagedepot.10federalstorage.com
ASG: Storage Depot,storagedepot.co
ESM: Storage Boss,storagedepotla.com
ASG: Storage First,storagefirstpa.com
ASG: Storage Point,storagepoint.co
ASG: The Storage Advantage - Storage Solutions,storagesolutions.thestorageadvantage.com
SSUN: z_NOT USED | Store Safe TN,storesafetn.selfstorageunitsnearby.com
Sunbird Storage,sunbirdstorage.com
ASG: The Storage Advantage,thestorageadvantage.com
Storage Locker,thestoragelocker.com
The Storage Place,thestorageplace.org
ASG: The Storage Advantage - The Storage Space,thestoragespace.thestorageadvantage.com
VSG: Thunderbolt Self Storage,thunderboltselfstorage.victorystoragegroup.com
ASG: The Storage Advantage - Topeka Self Storage,topekaselfstorage.thestorageadvantage.com
ASG: The Storage Advantage - TriLink Storage,trilinkstorage.thestorageadvantage.com
Downtown U-Lok Storage,ulok.com
PM: USA Rent-A-Space,usarent-a-space.com
VSG: Victory Drive Self Storage,victorydriveselfstorage.victorystoragegroup.com
VSG: Victory Storage Group,victorystoragegroup.com
Carolina Secure Storage: StorEDGE,ww2.carolinasecurestorage.com
StorageOnly,ww2.storageonly.ca
10Fed: z_10 Federal Self Storage | REDIRECTS ONLY,www.10federalselfstorage.com
21st Century Storage | REDIRECTS ONLY,www.21css.com
Anytime Self Storage,www.anytimeselfstorageusa.com
BestBox Storage,www.bestboxstorage.com
Hi-Desert Storage,www.hi-desertstorage.com
mod-STORAGE | REDIRECTS ONLY,www.mod-storage.com
Storage Star,www.storagestar.com
All Purpose Storage,www.storeallpurpose.com
ASG: TriLink Storage,www.trilinkstorage.com
ASG: Premier Storage,yourpremierstorage.com`;

interface UrlCheck {
  originalUrl: string;
  expectedFinalUrl: string;
  actualFinalUrl: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  errorMessage?: string;
}

// Main execution function
async function main() {
  // Parse the list of URLs
  const urlPairs = parseUrlsFromInput();
  
  console.log(`Total URLs to check: ${urlPairs.length}`);
  console.log(`Starting the check process...`);
  
  // Initialize results array
  const results: UrlCheck[] = [];
  
  // Launch browser
  const browser = await chromium.launch({
    headless: true,
  });
  
  // Process URLs in batches to avoid overwhelming the system
  const batchSize = 5;
  for (let i = 0; i < urlPairs.length; i += batchSize) {
    const batch = urlPairs.slice(i, i + batchSize);
    await Promise.all(batch.map(pair => checkUrl(browser, pair, results)));
    console.log(`Processed ${Math.min(i + batchSize, urlPairs.length)} of ${urlPairs.length} URLs`);
    
    // Add a small delay between batches
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Close browser
  await browser.close();
  
  // Generate and save results
  generateResults(results);
  
  console.log('URL check completed.');
  console.log(`Results saved to: ${path.resolve('redirect-results.html')}`);
  console.log(`CSV data saved to: ${path.resolve('redirect-results.csv')}`);
}

function parseUrlsFromInput(): { originalUrl: string, expectedFinalUrl: string }[] {
  const urlList: { originalUrl: string, expectedFinalUrl: string }[] = [];
  
  const lines = rawUrlData.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split(',');
    if (parts.length >= 2) {
      const urlPart = parts[1].trim();
      // Ensure URL has http/https prefix
      const originalUrl = urlPart.startsWith('http') 
        ? urlPart 
        : `https://${urlPart}`;
      
      urlList.push({
        originalUrl,
        expectedFinalUrl: originalUrl,
      });
    }
  }
  
  return urlList;
}

// Function to check if URLs match, considering the trailing slash rule
function urlsMatch(actualUrl: string, expectedUrl: string): boolean {
  // Remove trailing slash from both URLs for comparison
  const normalizedActual = actualUrl.replace(/\/$/, '');
  const normalizedExpected = expectedUrl.replace(/\/$/, '');
  
  // Check if they're exactly the same after normalization
  if (normalizedActual === normalizedExpected) {
    return true;
  }
  
  // Check if one has a trailing slash and the other doesn't
  return (normalizedActual === normalizedExpected || 
          normalizedActual + '/' === expectedUrl || 
          actualUrl === normalizedExpected + '/');
}

async function checkUrl(
  browser: any, 
  pair: { originalUrl: string, expectedFinalUrl: string }, 
  results: UrlCheck[]
): Promise<void> {
  const { originalUrl, expectedFinalUrl } = pair;
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  
  // Initialize page as a properly typed variable (not null)
  let page;
  
  try {
    // Set timeout and create a new page
    context.setDefaultTimeout(30000); // 30 seconds timeout
    page = await context.newPage();
    
    // Navigate to the URL and wait for navigation to complete
    await page.goto(originalUrl, {
      waitUntil: 'domcontentloaded', // Wait until the DOM is ready, not for all resources
      timeout: 30000,
    });
    
    // Wait a moment for any client-side redirects
    await page.waitForTimeout(2000);
    
    // Get the final URL after all redirects
    const actualFinalUrl = page.url();
    
    // Check if the URL redirected as expected, allowing for trailing slash variations
    const status = urlsMatch(actualFinalUrl, expectedFinalUrl) ? 'PASS' : 'FAIL';
    
    results.push({
      originalUrl,
      expectedFinalUrl,
      actualFinalUrl,
      status,
    });
    
  } catch (error: any) {
    console.log(`Error checking ${originalUrl}: ${error.message}`);
    
    results.push({
      originalUrl,
      expectedFinalUrl,
      actualFinalUrl: 'ERROR',
      status: 'ERROR',
      errorMessage: error.message,
    });
  } finally {
    // Check if page exists before closing it
    if (page) {
      await page.close();
    }
    await context.close();
  }
}

function generateResults(results: UrlCheck[]): void {
  // Save as CSV
  let csvContent = 'Original URL,Expected Final URL,Actual Final URL,Status,Error Message\n';
  
  for (const result of results) {
    csvContent += `"${result.originalUrl}","${result.expectedFinalUrl}","${result.actualFinalUrl}","${result.status}","${result.errorMessage || ''}"\n`;
  }
  
  fs.writeFileSync('redirect-results.csv', csvContent);
  
  // Generate HTML report with nice table
  let htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>URL Redirect Check Results</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .pass { color: green; font-weight: bold; }
      .fail { color: red; font-weight: bold; }
      .error { color: orange; font-weight: bold; }
      .url-cell { max-width: 300px; word-break: break-all; }
      .summary { margin-bottom: 20px; padding: 10px; background-color: #f8f8f8; border-radius: 5px; }
    </style>
  </head>
  <body>
    <h1>URL Redirect Check Results</h1>
    
    <div class="summary">
      <h2>Summary</h2>
      <p>Total URLs checked: ${results.length}</p>
      <p>Passed: ${results.filter(r => r.status === 'PASS').length}</p>
      <p>Failed: ${results.filter(r => r.status === 'FAIL').length}</p>
      <p>Errors: ${results.filter(r => r.status === 'ERROR').length}</p>
    </div>
    
    <h2>Detailed Results</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Original URL</th>
          <th>Expected Final URL</th>
          <th>Actual Final URL</th>
          <th>Status</th>
          <th>Error Message</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  results.forEach((result, index) => {
    let statusClass = '';
    if (result.status === 'PASS') statusClass = 'pass';
    else if (result.status === 'FAIL') statusClass = 'fail';
    else statusClass = 'error';
    
    htmlContent += `
        <tr>
          <td>${index + 1}</td>
          <td class="url-cell">${result.originalUrl}</td>
          <td class="url-cell">${result.expectedFinalUrl}</td>
          <td class="url-cell">${result.actualFinalUrl}</td>
          <td class="${statusClass}">${result.status}</td>
          <td>${result.errorMessage || ''}</td>
        </tr>
    `;
  });
  
  htmlContent += `
      </tbody>
    </table>
  </body>
  </html>
  `;
  
  fs.writeFileSync('redirect-results.html', htmlContent);
}

// Run the main function
main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});