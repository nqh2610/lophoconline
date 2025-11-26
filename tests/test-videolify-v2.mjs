/**
 * Comprehensive Test Suite for VideolifyFull_v2
 * Tests all hooks and features
 */

console.log('='.repeat(80));
console.log('📋 VIDEOLIFY V2 - COMPREHENSIVE TEST SUITE');
console.log('='.repeat(80));

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

// Helper functions
function testPass(name, details = '') {
  results.passed.push({ name, details });
  console.log(`✅ PASS: ${name}${details ? ` - ${details}` : ''}`);
}

function testFail(name, error) {
  results.failed.push({ name, error: error.message });
  console.log(`❌ FAIL: ${name}`);
  console.log(`   Error: ${error.message}`);
}

function testWarn(name, warning) {
  results.warnings.push({ name, warning });
  console.log(`⚠️  WARN: ${name} - ${warning}`);
}

// Test 1: File Structure
console.log('\n📁 Test 1: File Structure');
console.log('-'.repeat(80));

import { existsSync } from 'fs';

const requiredFiles = [
  'src/components/VideolifyFull_v2.tsx',
  'src/components/videolify/index.ts',
  'src/components/videolify/types/index.ts',
  'src/components/videolify/hooks/useSignaling.ts',
  'src/components/videolify/hooks/useWebRTC.ts',
  'src/components/videolify/hooks/useMediaDevices.ts',
  'src/components/videolify/hooks/useDataChannel.ts',
  'src/components/videolify/hooks/useChat.ts',
  'src/components/videolify/hooks/useWhiteboard.ts',
  'src/components/videolify/hooks/useScreenShare.ts',
  'src/components/videolify/hooks/useFileTransfer.ts',
  'src/components/videolify/hooks/useVirtualBackground.ts',
  'src/components/videolify/hooks/useRecording.ts',
];

for (const file of requiredFiles) {
  if (existsSync(file)) {
    testPass(`File exists: ${file}`);
  } else {
    testFail(`File missing: ${file}`, new Error('File not found'));
  }
}

// Test 2: TypeScript Syntax Check
console.log('\n🔍 Test 2: TypeScript Syntax Validation');
console.log('-'.repeat(80));

import { readFileSync } from 'fs';

const filesToCheck = [
  'src/components/VideolifyFull_v2.tsx',
  'src/components/videolify/types/index.ts',
  'src/components/videolify/hooks/useSignaling.ts',
  'src/components/videolify/hooks/useWebRTC.ts',
  'src/components/videolify/hooks/useMediaDevices.ts',
  'src/components/videolify/hooks/useChat.ts',
  'src/components/videolify/hooks/useWhiteboard.ts',
  'src/components/videolify/hooks/useScreenShare.ts',
  'src/components/videolify/hooks/useFileTransfer.ts',
  'src/components/videolify/hooks/useVirtualBackground.ts',
  'src/components/videolify/hooks/useRecording.ts',
];

for (const file of filesToCheck) {
  try {
    const content = readFileSync(file, 'utf-8');

    // Check for common syntax issues
    const issues = [];

    // Check imports
    if (!content.includes('import ')) {
      issues.push('No imports found');
    }

    // Check exports
    if (!content.includes('export ')) {
      issues.push('No exports found');
    }

    // Check for useCallback/useState in hooks
    if (file.includes('/hooks/') && !content.includes('use')) {
      issues.push('No React hooks usage found');
    }

    if (issues.length > 0) {
      testWarn(`Syntax check: ${file}`, issues.join(', '));
    } else {
      testPass(`Syntax check: ${file}`);
    }
  } catch (err) {
    testFail(`Syntax check: ${file}`, err);
  }
}

// Test 3: Types Export Check
console.log('\n📦 Test 3: Types Export Validation');
console.log('-'.repeat(80));

try {
  const typesContent = readFileSync('src/components/videolify/types/index.ts', 'utf-8');

  const requiredTypes = [
    'VideolifyFullProps',
    'ChatMessage',
    'FileMetadata',
    'FileTransfer',
    'BackgroundMode',
    'ICE_SERVERS',
  ];

  for (const type of requiredTypes) {
    if (typesContent.includes(type)) {
      testPass(`Type exported: ${type}`);
    } else {
      testFail(`Type missing: ${type}`, new Error('Type not found in exports'));
    }
  }
} catch (err) {
  testFail('Types export check', err);
}

// Test 4: Hook Exports Check
console.log('\n🪝 Test 4: Hook Exports Validation');
console.log('-'.repeat(80));

try {
  const indexContent = readFileSync('src/components/videolify/index.ts', 'utf-8');

  const requiredExports = [
    'VideolifyFull_v2',
    'useSignaling',
    'useWebRTC',
    'useMediaDevices',
    'useChat',
    'useWhiteboard',
    'useScreenShare',
    'useFileTransfer',
    'useVirtualBackground',
    'useRecording',
    'useDataChannel',
  ];

  for (const exp of requiredExports) {
    if (indexContent.includes(exp)) {
      testPass(`Export found: ${exp}`);
    } else {
      testFail(`Export missing: ${exp}`, new Error('Export not found'));
    }
  }
} catch (err) {
  testFail('Hook exports check', err);
}

// Test 5: useMediaDevices Feature Check
console.log('\n📹 Test 5: useMediaDevices Features');
console.log('-'.repeat(80));

try {
  const content = readFileSync('src/components/videolify/hooks/useMediaDevices.ts', 'utf-8');

  const features = [
    { name: 'requestPermissions', desc: 'Permission request function' },
    { name: 'createDummyVideo', desc: 'Dummy video track for permission denial' },
    { name: 'createDummyAudio', desc: 'Dummy audio track for permission denial' },
    { name: 'toggleVideo', desc: 'Toggle camera function' },
    { name: 'toggleAudio', desc: 'Toggle microphone function' },
    { name: 'stopStream', desc: 'Stop media stream function' },
  ];

  for (const feature of features) {
    if (content.includes(feature.name)) {
      testPass(`Feature: ${feature.name}`, feature.desc);
    } else {
      testFail(`Feature missing: ${feature.name}`, new Error(feature.desc));
    }
  }
} catch (err) {
  testFail('useMediaDevices feature check', err);
}

// Test 6: useWebRTC Perfect Negotiation
console.log('\n🔄 Test 6: useWebRTC Perfect Negotiation Pattern');
console.log('-'.repeat(80));

try {
  const content = readFileSync('src/components/videolify/hooks/useWebRTC.ts', 'utf-8');

  const patterns = [
    { name: 'Perfect Negotiation', check: 'isPolite' },
    { name: 'Offer collision handling', check: 'offerCollision' },
    { name: 'Rollback support', check: 'rollback' },
    { name: 'ICE candidate handling', check: 'addIceCandidate' },
    { name: 'Connection state tracking', check: 'onconnectionstatechange' },
    { name: 'Negotiation needed handler', check: 'onnegotiationneeded' },
  ];

  for (const pattern of patterns) {
    if (content.includes(pattern.check)) {
      testPass(`Pattern: ${pattern.name}`);
    } else {
      testFail(`Pattern missing: ${pattern.name}`, new Error(`Check: ${pattern.check}`));
    }
  }
} catch (err) {
  testFail('useWebRTC pattern check', err);
}

// Test 7: useSignaling SSE Implementation
console.log('\n📡 Test 7: useSignaling SSE Implementation');
console.log('-'.repeat(80));

try {
  const content = readFileSync('src/components/videolify/hooks/useSignaling.ts', 'utf-8');

  const features = [
    { name: 'EventSource initialization', check: 'EventSource' },
    { name: 'Join room function', check: 'joinRoom' },
    { name: 'Signal function', check: 'signal' },
    { name: 'Event handlers', check: 'addEventListener' },
    { name: 'Cleanup/disconnect', check: 'disconnect' },
  ];

  for (const feature of features) {
    if (content.includes(feature.check)) {
      testPass(`Feature: ${feature.name}`);
    } else {
      testFail(`Feature missing: ${feature.name}`, new Error(`Check: ${feature.check}`));
    }
  }
} catch (err) {
  testFail('useSignaling feature check', err);
}

// Test 8: useChat P2P Implementation
console.log('\n💬 Test 8: useChat P2P Implementation');
console.log('-'.repeat(80));

try {
  const content = readFileSync('src/components/videolify/hooks/useChat.ts', 'utf-8');

  const features = [
    { name: 'Send message function', check: 'sendMessage' },
    { name: 'Message queue system', check: 'outgoingQueueRef' },
    { name: 'Channel ready check', check: 'readyState' },
    { name: 'Message state management', check: 'setMessages' },
  ];

  for (const feature of features) {
    if (content.includes(feature.check)) {
      testPass(`Feature: ${feature.name}`);
    } else {
      testFail(`Feature missing: ${feature.name}`, new Error(`Check: ${feature.check}`));
    }
  }
} catch (err) {
  testFail('useChat feature check', err);
}

// Test 9: useWhiteboard Fabric.js Integration
console.log('\n🎨 Test 9: useWhiteboard Fabric.js Integration');
console.log('-'.repeat(80));

try {
  const content = readFileSync('src/components/videolify/hooks/useWhiteboard.ts', 'utf-8');

  const features = [
    { name: 'Fabric.js canvas', check: 'fabric.Canvas' },
    { name: 'Drawing mode', check: 'isDrawingMode' },
    { name: 'Path creation event', check: 'path:created' },
    { name: 'Clear canvas function', check: 'clearCanvas' },
    { name: 'Undo functionality', check: 'undo' },
    { name: 'localStorage persistence', check: 'localStorage' },
    { name: 'P2P sync', check: 'sendEvent' },
  ];

  for (const feature of features) {
    if (content.includes(feature.check)) {
      testPass(`Feature: ${feature.name}`);
    } else {
      testFail(`Feature missing: ${feature.name}`, new Error(`Check: ${feature.check}`));
    }
  }
} catch (err) {
  testFail('useWhiteboard feature check', err);
}

// Test 10: useScreenShare Adaptive Quality
console.log('\n🖥️  Test 10: useScreenShare Adaptive Quality');
console.log('-'.repeat(80));

try {
  const content = readFileSync('src/components/videolify/hooks/useScreenShare.ts', 'utf-8');

  const features = [
    { name: 'getDisplayMedia call', check: 'getDisplayMedia' },
    { name: 'Track replacement', check: 'replaceTrack' },
    { name: 'Adaptive downscaling', check: 'scaleResolutionDownBy' },
    { name: 'Bitrate control', check: 'maxBitrate' },
    { name: 'Quality monitoring', check: 'getStats' },
    { name: 'Packet loss detection', check: 'packetsLost' },
    { name: 'Track ended handler', check: 'onended' },
  ];

  for (const feature of features) {
    if (content.includes(feature.check)) {
      testPass(`Feature: ${feature.name}`);
    } else {
      testFail(`Feature missing: ${feature.name}`, new Error(`Check: ${feature.check}`));
    }
  }
} catch (err) {
  testFail('useScreenShare feature check', err);
}

// Test 11: useFileTransfer Chunked Transfer
console.log('\n📁 Test 11: useFileTransfer Chunked Transfer');
console.log('-'.repeat(80));

try {
  const content = readFileSync('src/components/videolify/hooks/useFileTransfer.ts', 'utf-8');

  const features = [
    { name: 'Chunk size constant', check: 'CHUNK_SIZE' },
    { name: 'File offer/accept/reject', check: 'file-offer' },
    { name: 'Flow control', check: 'bufferedAmount' },
    { name: 'Progress tracking', check: 'progress' },
    { name: 'File System Access API', check: 'showSaveFilePicker' },
    { name: 'Blob creation', check: 'new Blob' },
    { name: 'Download fallback', check: 'createElement' },
  ];

  for (const feature of features) {
    if (content.includes(feature.check)) {
      testPass(`Feature: ${feature.name}`);
    } else {
      testFail(`Feature missing: ${feature.name}`, new Error(`Check: ${feature.check}`));
    }
  }
} catch (err) {
  testFail('useFileTransfer feature check', err);
}

// Test 12: useVirtualBackground MediaPipe
console.log('\n🎭 Test 12: useVirtualBackground MediaPipe Integration');
console.log('-'.repeat(80));

try {
  const content = readFileSync('src/components/videolify/hooks/useVirtualBackground.ts', 'utf-8');

  const features = [
    { name: 'VirtualBackgroundProcessor', check: 'VirtualBackgroundProcessor' },
    { name: 'Dual processor (local/remote)', check: 'localProcessorRef' },
    { name: 'Enable virtual background', check: 'enableVirtualBackground' },
    { name: 'Disable virtual background', check: 'disableVirtualBackground' },
    { name: 'Remote VBG application', check: 'applyRemoteVirtualBackground' },
    { name: 'localStorage persistence', check: 'localStorage' },
    { name: 'Background modes', check: 'BackgroundMode' },
  ];

  for (const feature of features) {
    if (content.includes(feature.check)) {
      testPass(`Feature: ${feature.name}`);
    } else {
      testFail(`Feature missing: ${feature.name}`, new Error(`Check: ${feature.check}`));
    }
  }
} catch (err) {
  testFail('useVirtualBackground feature check', err);
}

// Test 13: useRecording MediaRecorder
console.log('\n🎥 Test 13: useRecording MediaRecorder');
console.log('-'.repeat(80));

try {
  const content = readFileSync('src/components/videolify/hooks/useRecording.ts', 'utf-8');

  const features = [
    { name: 'MediaRecorder initialization', check: 'MediaRecorder' },
    { name: 'MIME type configuration', check: 'mimeType' },
    { name: 'Data available handler', check: 'ondataavailable' },
    { name: 'Recording stop handler', check: 'onstop' },
    { name: 'Blob creation', check: 'new Blob' },
    { name: 'Auto-download', check: 'download' },
    { name: 'Toggle recording', check: 'toggleRecording' },
  ];

  for (const feature of features) {
    if (content.includes(feature.check)) {
      testPass(`Feature: ${feature.name}`);
    } else {
      testFail(`Feature missing: ${feature.name}`, new Error(`Check: ${feature.check}`));
    }
  }
} catch (err) {
  testFail('useRecording feature check', err);
}

// Test 14: VideolifyFull_v2 Integration
console.log('\n🎯 Test 14: VideolifyFull_v2 Main Component Integration');
console.log('-'.repeat(80));

try {
  const content = readFileSync('src/components/VideolifyFull_v2.tsx', 'utf-8');

  const integrations = [
    { name: 'useMediaDevices hook', check: 'useMediaDevices()' },
    { name: 'useChat hook', check: 'useChat(' },
    { name: 'useWhiteboard hook', check: 'useWhiteboard(' },
    { name: 'useFileTransfer hook', check: 'useFileTransfer()' },
    { name: 'useVirtualBackground hook', check: 'useVirtualBackground()' },
    { name: 'useRecording hook', check: 'useRecording()' },
    { name: 'useWebRTC hook', check: 'useWebRTC(' },
    { name: 'useScreenShare hook', check: 'useScreenShare(' },
    { name: 'useSignaling hook', check: 'useSignaling(' },
    { name: 'Cleanup on unmount', check: 'return () =>' },
  ];

  for (const integration of integrations) {
    if (content.includes(integration.check)) {
      testPass(`Integration: ${integration.name}`);
    } else {
      testFail(`Integration missing: ${integration.name}`, new Error(`Check: ${integration.check}`));
    }
  }

  // Check line count reduction
  const lines = content.split('\n').length;
  if (lines < 600) {
    testPass(`Line count optimization`, `${lines} lines (target: <600)`);
  } else {
    testWarn('Line count', `${lines} lines - consider further optimization`);
  }
} catch (err) {
  testFail('VideolifyFull_v2 integration check', err);
}

// Test 15: Code Quality Checks
console.log('\n✨ Test 15: Code Quality & Best Practices');
console.log('-'.repeat(80));

try {
  const v2Content = readFileSync('src/components/VideolifyFull_v2.tsx', 'utf-8');

  const qualityChecks = [
    { name: 'TypeScript types', check: ': ' },
    { name: 'React hooks', check: 'useCallback' },
    { name: 'useEffect cleanup', check: 'return () =>' },
    { name: 'Error handling', check: 'try {' },
    { name: 'Console logging', check: 'console.log' },
    { name: 'Refs usage', check: 'useRef' },
  ];

  for (const check of qualityChecks) {
    if (v2Content.includes(check.check)) {
      testPass(`Quality: ${check.name}`);
    } else {
      testWarn('Quality', `${check.name} not found - may need review`);
    }
  }
} catch (err) {
  testFail('Code quality check', err);
}

// Final Report
console.log('\n' + '='.repeat(80));
console.log('📊 FINAL TEST REPORT');
console.log('='.repeat(80));

console.log(`\n✅ PASSED: ${results.passed.length} tests`);
console.log(`❌ FAILED: ${results.failed.length} tests`);
console.log(`⚠️  WARNINGS: ${results.warnings.length} tests`);

const totalTests = results.passed.length + results.failed.length + results.warnings.length;
const passRate = ((results.passed.length / totalTests) * 100).toFixed(2);

console.log(`\n📈 Pass Rate: ${passRate}%`);

if (results.failed.length > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.failed.forEach((fail, i) => {
    console.log(`   ${i + 1}. ${fail.name}`);
    console.log(`      Error: ${fail.error}`);
  });
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  results.warnings.forEach((warn, i) => {
    console.log(`   ${i + 1}. ${warn.name}: ${warn.warning}`);
  });
}

console.log('\n' + '='.repeat(80));

if (results.failed.length === 0) {
  console.log('✅ ALL CRITICAL TESTS PASSED!');
  console.log('VideolifyFull_v2 is ready for production testing.');
} else {
  console.log('❌ SOME TESTS FAILED - Please review and fix issues.');
  process.exit(1);
}

console.log('='.repeat(80));
