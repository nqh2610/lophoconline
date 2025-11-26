// Test all background URLs to find broken images
import { readFileSync } from 'fs';

async function testBackgroundUrls() {
  console.log('🔍 Testing all 90 background URLs...\n');
  
  // Read the file
  const content = readFileSync('src/components/VideolifyFull.tsx', 'utf-8');
  
  // Extract PRESET_BACKGROUNDS array
  const match = content.match(/const PRESET_BACKGROUNDS = \[([\s\S]*?)\];/);
  if (!match) {
    console.error('❌ Could not find PRESET_BACKGROUNDS array');
    process.exit(1);
  }
  
  // Extract all URLs
  const urlMatches = [...match[1].matchAll(/url: '(https:\/\/[^']+)'/g)];
  const urls = urlMatches.map(m => m[1]);
  
  console.log(`📊 Found ${urls.length} background URLs\n`);
  
  const results = {
    working: [],
    broken: [],
    slow: []
  };
  
  // Test each URL
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const photoId = url.match(/photo-([a-zA-Z0-9_-]+)\?/)?.[1] || 'unknown';
    
    process.stdout.write(`[${i + 1}/${urls.length}] Testing ${photoId}... `);
    
    try {
      const startTime = Date.now();
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });
      const loadTime = Date.now() - startTime;
      
      if (response.ok) {
        if (loadTime > 3000) {
          console.log(`⚠️  SLOW (${loadTime}ms)`);
          results.slow.push({ url, photoId, loadTime });
        } else {
          console.log(`✅ OK (${loadTime}ms)`);
        }
        results.working.push({ url, photoId, loadTime });
      } else {
        console.log(`❌ FAILED (${response.status})`);
        results.broken.push({ url, photoId, status: response.status });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      results.broken.push({ url, photoId, error: error.message });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`✅ Working: ${results.working.length}/${urls.length}`);
  console.log(`❌ Broken: ${results.broken.length}/${urls.length}`);
  console.log(`⚠️  Slow (>3s): ${results.slow.length}/${urls.length}`);
  
  if (results.broken.length > 0) {
    console.log('\n❌ BROKEN IMAGES:');
    results.broken.forEach(item => {
      console.log(`   - ${item.photoId}: ${item.status || item.error}`);
      console.log(`     ${item.url}`);
    });
  }
  
  if (results.slow.length > 0) {
    console.log('\n⚠️  SLOW IMAGES (>3s):');
    results.slow.forEach(item => {
      console.log(`   - ${item.photoId}: ${item.loadTime}ms`);
    });
  }
  
  // Exit with error if broken images found
  if (results.broken.length > 0) {
    process.exit(1);
  }
}

testBackgroundUrls().catch(console.error);
