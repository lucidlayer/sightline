import * as vscode from 'vscode';
import { SightlinePanelProvider } from './sightlinePanelProvider';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('sightline.openPanel', () => {
    const panel = vscode.window.createWebviewPanel(
      'sightlinePanel',
      'Sightline',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'approveAI':
          vscode.window.showInformationMessage(`Approved AI suggestion: ${message.suggestionId}`);
          // Parse suggestionId format: e.g., "validate:123", "diff:123:100", "archive:99"
          const parts = message.suggestionId.split(':');
          const action = parts[0];
          if (action === 'validate') {
            const snapId = parts[1];
            vscode.commands.executeCommand('sightline.validateSnapshot', snapId);
          } else if (action === 'diff') {
            const idA = parts[1];
            const idB = parts[2];
            vscode.commands.executeCommand('sightline.compareSnapshots', idA, idB);
          } else if (action === 'archive') {
            const snapId = parts[1];
            vscode.commands.executeCommand('sightline.archiveSnapshot', snapId);
          } else {
            vscode.window.showWarningMessage(`Unknown AI suggestion action: ${action}`);
          }
          break;
        case 'denyAI':
          vscode.window.showInformationMessage(`Denied AI suggestion: ${message.suggestionId}`);
          // Log denial, skip action
          break;
        case 'runValidation':
          try {
            const cp = await import('child_process');
            const path = require('path');
            const cliPath = path.join(__dirname, '../../mcp/sightline-server/src/cli.js');
            const snapshotId = message.snapshotId;
            const rules = JSON.stringify(message.rules);
            const cmd = `node "${cliPath}" validate-snapshot ${snapshotId} '${rules}'`;
            cp.exec(cmd, (err, stdout, stderr) => {
              if (err) {
                vscode.window.showErrorMessage('Validation error: ' + stderr);
                return;
              }
              panel.webview.postMessage({
                type: 'validationResult',
                result: stdout
              });
            });
          } catch (e) {
            const msg = (e instanceof Error) ? e.message : String(e);
            vscode.window.showErrorMessage('Failed to run validation: ' + msg);
          }
          break;
        case 'runDiff':
          try {
            const cp = await import('child_process');
            const path = require('path');
            const cliPath = path.join(__dirname, '../../mcp/sightline-server/src/cli.js');
            const idA = message.idA;
            const idB = message.idB;
            const threshold = message.threshold;
            const cmd = `node "${cliPath}" compare-snapshots ${idA} ${idB} --threshold ${threshold}`;
            cp.exec(cmd, (err, stdout, stderr) => {
              if (err) {
                vscode.window.showErrorMessage('Diff error: ' + stderr);
                return;
              }
              panel.webview.postMessage({
                type: 'diffResult',
                result: stdout
              });
            });
          } catch (e) {
            const msg = (e instanceof Error) ? e.message : String(e);
            vscode.window.showErrorMessage('Failed to run diff: ' + msg);
          }
          break;
        case 'captureSnapshot':
          vscode.window.showInformationMessage('Capture Snapshot triggered');
          break;
        case 'refreshSnapshots':
          fetchAndSendSnapshots(sidebarProvider);
          fetchAndSendAISuggestions(sidebarProvider);
          break;
      }
    });
  });

  context.subscriptions.push(disposable);

  const sidebarProvider = new SightlinePanelProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('sightlinePanel', sidebarProvider)
  );

  setTimeout(() => {
    fetchAndSendSnapshots(sidebarProvider);
    fetchAndSendAISuggestions(sidebarProvider);
  }, 1000);

  vscode.commands.registerCommand('sightline.refreshSnapshots', () => {
    fetchAndSendSnapshots(sidebarProvider);
    fetchAndSendAISuggestions(sidebarProvider);
  });
}

function fetchAndSendSnapshots(provider: SightlinePanelProvider) {
  const cp = require('child_process');
  const path = require('path');
  const cliPath = path.join(__dirname, '../../mcp/sightline-server/src/cli.js');
  cp.exec(`node "${cliPath}" list-snapshots --json`, (err: any, stdout: string, stderr: string) => {
    if (err) {
      provider.lastWebview?.webview.postMessage({ type: 'status', text: 'Error fetching snapshots' });
      return;
    }
    try {
      const snapshots = JSON.parse(stdout);
      provider.lastWebview?.webview.postMessage({ type: 'snapshotList', snapshots });
    } catch {
      provider.lastWebview?.webview.postMessage({ type: 'status', text: 'Invalid snapshot data' });
    }
  });
}

function fetchAndSendAISuggestions(provider: SightlinePanelProvider) {
  const cp = require('child_process');
  const path = require('path');
  const cliPath = path.join(__dirname, '../../mcp/sightline-server/src/cli.js');
  cp.exec(`node "${cliPath}" get-ai-suggestions --json`, (err: any, stdout: string, stderr: string) => {
    if (err) {
      provider.lastWebview?.webview.postMessage({ type: 'status', text: 'Error fetching AI suggestions' });
      return;
    }
    try {
      const suggestions = JSON.parse(stdout);
      provider.lastWebview?.webview.postMessage({ type: 'aiSuggestions', suggestions });
    } catch {
      provider.lastWebview?.webview.postMessage({ type: 'status', text: 'Invalid AI suggestion data' });
    }
  });
}

export function deactivate() {}

function getWebviewContent(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Sightline</title>
      <style>
        body { font-family: sans-serif; padding: 10px; }
        h1 { color: #007acc; }
        .gallery { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
        .snapshot { border: 1px solid #ccc; padding: 5px; width: 150px; }
        .snapshot img { width: 100%; }
        .actions { margin-top: 10px; }
        button { margin-right: 5px; }
      </style>
    </head>
    <body>
      <h1>Sightline Extension</h1>
      <div class="actions">
        <button id="captureBtn">Capture Snapshot</button>
        <button id="refreshBtn">Refresh Gallery</button>
      </div>

      <h2>Snapshots</h2>
      <div>
        <input type="text" id="filterInput" placeholder="Filter by label or tags..." />
        <button id="filterBtn">Filter</button>
        <span id="loadingIndicator" style="display:none;">Loading...</span>
        <span id="errorIndicator" style="color:red;"></span>
      </div>
      <div id="gallery" class="gallery">
        <!-- Snapshots will be dynamically inserted here -->
      </div>

      <h2>Validation</h2>
      <div>
        <label>Snapshot ID: <input type="number" id="validationSnapshotId" /></label><br/>
        <label>Rules (JSON array):<br/>
          <textarea id="validationRules" rows="4" cols="50">[{"selector": "#header", "text": "Welcome"}]</textarea>
        </label><br/>
        <button id="validateBtn">Run Validation</button>
      </div>
      <div id="validationResults">
        <!-- Validation results will appear here -->
      </div>

      <h2>Diff</h2>
      <div>
        <label>Snapshot A ID: <input type="number" id="diffIdA" /></label><br/>
        <label>Snapshot B ID: <input type="number" id="diffIdB" /></label><br/>
        <label>Threshold: <input type="number" id="diffThreshold" value="0.1" step="0.01" min="0" max="1" /></label><br/>
        <button id="diffBtn">Run Diff</button>
      </div>
      <div id="diffViewer">
        <!-- Diff image and score will appear here -->
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('captureBtn').onclick = () => {
          vscode.postMessage({ type: 'captureSnapshot' });
        };

        document.getElementById('refreshBtn').onclick = () => {
          vscode.postMessage({ type: 'refreshSnapshots' });
        };

        window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'snapshotList') {
            const gallery = document.getElementById('gallery');
            gallery.innerHTML = '';
            message.snapshots.forEach(snap => {
              const div = document.createElement('div');
              div.className = 'snapshot';
              div.innerHTML = \`
                <img src="data:image/png;base64,\${snap.thumbnail}" alt="Snapshot" />
                <div><strong>\${snap.label || 'No Label'}</strong></div>
                <div>Tags: \${snap.tags || ''}</div>
                <div>Status: \${snap.archived ? 'Archived' : 'Active'}</div>
                <button data-id="\${snap.id}" class="validateBtn">Validate</button>
                <button data-id="\${snap.id}" class="archiveBtn">\${snap.archived ? 'Unarchive' : 'Archive'}</button>
                <button data-id="\${snap.id}" class="deleteBtn">Delete</button>
              \`;
              gallery.appendChild(div);
            });

            // Add event listeners for archive/unarchive and delete buttons
            gallery.querySelectorAll('.archiveBtn').forEach(btn => {
              btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                vscode.postMessage({ type: 'toggleArchive', id });
              });
            });

            gallery.querySelectorAll('.deleteBtn').forEach(btn => {
              btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                vscode.postMessage({ type: 'deleteSnapshot', id });
              });
            });
          }
        });
      </script>
    </body>
    </html>
  `;
}
