const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const fullB64 = fs.readFileSync(path.join(root, 'samarth-buildpro-full.zip')).toString('base64');
const backB64 = fs.readFileSync(path.join(root, 'buildpro-backend.zip')).toString('base64');

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BuildPro Download</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#F5F5F0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.c{background:#fff;border-radius:18px;padding:36px;max-width:520px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.1)}.l{width:80px;height:80px;border-radius:40px;background:#E8F5E9;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:36px}h1{color:#1B4D3E;font-size:26px;margin-bottom:4px}h2{color:#6B7280;font-size:14px;font-weight:400;margin-bottom:20px}.b{display:block;width:100%;background:#1B4D3E;color:#fff;font-size:16px;font-weight:700;padding:14px;border-radius:12px;cursor:pointer;border:none;margin-bottom:10px;transition:opacity .2s}.b:hover{opacity:.85}.b2{background:#7C3AED}.i{font-size:12px;color:#9CA3AF;margin-top:10px}ul{text-align:left;margin:16px 0;padding:0 12px;list-style:none;columns:2;column-gap:8px}li{color:#374151;font-size:12px;margin-bottom:5px;break-inside:avoid}li::before{content:"\\2713 ";color:#10B981;font-weight:700}.sep{border-top:1px solid #E5E7EB;margin:16px 0}.tag{display:inline-block;background:#F5F3FF;color:#7C3AED;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin:2px}</style></head>
<body><div class="c">
<div class="l">&#127959;&#65039;</div>
<h1>Samarth BuildPro v2.0</h1>
<h2>Construction Management Platform</h2>
<div><span class="tag">React Native + Expo</span><span class="tag">Python FastAPI</span><span class="tag">SQLAlchemy</span><span class="tag">scikit-learn AI</span></div>
<ul>
<li>JWT Auth (register/login)</li>
<li>Multi-project + Phases</li>
<li>Inventory + QR Tracking</li>
<li>Material Usage Logging</li>
<li>AI Demand Forecasting</li>
<li>Geo-tagged Deliveries</li>
<li>Payment Management</li>
<li>Worker Payroll (D/W/M)</li>
<li>Invoice Gen + GST</li>
<li>Auto Reconciliation</li>
<li>Smart Alerts Engine</li>
<li>Analytics Dashboard</li>
<li>44 REST API Endpoints</li>
<li>API Key Config (blank)</li>
</ul>
<div class="sep"></div>
<button class="b" onclick="dl('full')">&#11015; Full Project (Frontend + Backend) &mdash; 200 KB</button>
<button class="b b2" onclick="dl('back')">&#11015; Backend Only (Python) &mdash; 76 KB</button>
<p class="i"><b>Frontend:</b> Extract &rarr; npm install &rarr; npx expo start<br><b>Backend:</b> cd backend &rarr; pip install -r requirements.txt &rarr; uvicorn app.main:app --reload</p>
</div>
<script>
var zips={full:"${fullB64}",back:"${backB64}"};
function dl(k){var b=atob(zips[k]);var u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);var bl=new Blob([u],{type:"application/zip"});var a=document.createElement("a");a.href=URL.createObjectURL(bl);a.download=k==="full"?"samarth-buildpro-full.zip":"buildpro-backend.zip";a.click()}
</script></body></html>`;

fs.writeFileSync(path.join(root, 'download_page.html'), html);
console.log('Created download_page.html:', (fs.statSync(path.join(root, 'download_page.html')).size / 1024).toFixed(0), 'KB');
