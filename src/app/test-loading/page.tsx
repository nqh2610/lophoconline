"use client";

import { useEffect, useState } from 'react';

export default function LoadingTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'passed' | 'failed'>('idle');

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const runTest = () => {
    setTestStatus('testing');
    setLogs([]);
    addLog('🧪 Starting test...');

    // Open tutors page in new window and monitor
    const win = window.open('/tutors?nocache=' + Date.now(), '_blank');
    
    if (!win) {
      addLog('❌ Failed to open window - check popup blocker');
      setTestStatus('failed');
      return;
    }

    let checkCount = 0;
    const maxChecks = 20;
    
    const checkInterval = setInterval(() => {
      checkCount++;
      
      try {
        const doc = win.document;
        const bodyContent = doc.body?.textContent || '';
        const hasContent = bodyContent.length > 100;
        const hasCards = doc.querySelectorAll('[data-testid*="tutor"]').length > 0;
        
        addLog(`Check ${checkCount}: hasContent=${hasContent}, hasCards=${hasCards}, bodyLength=${bodyContent.length}`);
        
        if (hasCards) {
          addLog('✅ Test PASSED: Tutors loaded successfully');
          setTestStatus('passed');
          clearInterval(checkInterval);
        } else if (checkCount >= maxChecks) {
          addLog('❌ Test FAILED: Timeout after ' + maxChecks + ' checks');
          setTestStatus('failed');
          clearInterval(checkInterval);
        }
      } catch (e) {
        addLog(`⚠️ Cannot access window (CORS or closed): ${e}`);
        clearInterval(checkInterval);
        setTestStatus('failed');
      }
    }, 200);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">🧪 Loading State Test</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-2">Mục tiêu test:</h2>
          <p>Khi mở trang /tutors, màn hình phải hoàn toàn blank (không có box trống) cho đến khi data load xong.</p>
        </div>

        <div className="space-y-4">
          <div>
            <button
              onClick={runTest}
              disabled={testStatus === 'testing'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {testStatus === 'testing' ? '⏳ Testing...' : '▶️ Run Test'}
            </button>
          </div>

          {testStatus !== 'idle' && (
            <div className={`p-4 rounded-lg border-2 ${
              testStatus === 'passed' ? 'bg-green-50 border-green-500' :
              testStatus === 'failed' ? 'bg-red-50 border-red-500' :
              'bg-gray-50 border-gray-300'
            }`}>
              <h3 className="font-semibold mb-2">
                {testStatus === 'passed' && '✅ Test Passed'}
                {testStatus === 'failed' && '❌ Test Failed'}
                {testStatus === 'testing' && '⏳ Testing...'}
              </h3>
            </div>
          )}

          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click "Run Test" to start.</div>
            ) : (
              logs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Manual Test Steps:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Mở DevTools (F12) trong tab mới</li>
            <li>Vào Network tab, chọn "Slow 3G"</li>
            <li>Tick "Disable cache"</li>
            <li>Navigate to <code className="bg-gray-200 px-1">/tutors</code></li>
            <li>Quan sát: Màn hình phải blank (trắng tinh) khi loading</li>
            <li>Sau vài giây: Tutor cards xuất hiện</li>
          </ol>
        </div>

        <div className="mt-4">
          <a 
            href="/tutors" 
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            → Open /tutors in new tab (manual test)
          </a>
        </div>
      </div>
    </div>
  );
}
