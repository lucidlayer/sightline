import * as vscode from 'vscode';

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
          // TODO: invoke CLI or MCP to capture snapshot
          vscode.window.showInformationMessage('Capture Snapshot triggered');
          break;
        case 'refreshSnapshots':
          try {
            const cp = await import('child_process');
            const path = require('path');
            const cliPath = path.join(__dirname, '../../mcp/sightline-server/src/cli.js');
            cp.exec(`node "${cliPath}" list-snapshots --json`, (err, stdout, stderr) => {
              if (err) {
                vscode.window.showErrorMessage('Error fetching snapshots: ' + stderr);
                return;
              }
              try {
                const snapshots = JSON.parse(stdout);
                panel.webview.postMessage({
                  type: 'snapshotList',
                  snapshots
                });
              } catch (e) {
                vscode.window.showErrorMessage('Invalid snapshot data');
              }
            });
          } catch (e) {
            const msg = (e instanceof Error) ? e.message : String(e);
            vscode.window.showErrorMessage('Failed to run CLI: ' + msg);
          }
          break;
        case 'toggleArchive':
          try {
            const cp = await import('child_process');
            const path = require('path');
            const cliPath = path.join(__dirname, '../../mcp/sightline-server/src/cli.js');
            // First, get current snapshot status
            cp.exec(`node "${cliPath}" list-snapshots --json`, (err, stdout, stderr) => {
              if (err) {
                vscode.window.showErrorMessage('Error fetching snapshot: ' + stderr);
                return;
              }
              try {
                const snapshots = JSON.parse(stdout);
                const snap = snapshots.find((s: any) => s.id == message.id);
                if (!snap) {
                  vscode.window.showErrorMessage('Snapshot not found');
                  return;
                }
                const cmd = snap.archived
                  ? `node "${cliPath}" unarchive-snapshot ${message.id}`
                  : `node "${cliPath}" archive-snapshot ${message.id}`;
                cp.exec(cmd, (err2, stdout2, stderr2) => {
                  if (err2) {
                    vscode.window.showErrorMessage('Error archiving snapshot: ' + stderr2);
                    return;
                  }
                  vscode.commands.executeCommand('sightline.openPanel'); // Refresh panel
                });
              } catch (e) {
                vscode.window.showErrorMessage('Invalid snapshot data');
              }
            });
          } catch (e) {
            const msg = (e instanceof Error) ? e.message : String(e);
            vscode.window.showErrorMessage('Failed to run CLI: ' + msg);
          }
          break;
        case 'deleteSnapshot':
          try {
            const cp = await import('child_process');
            const path = require('path');
            const cliPath = path.join(__dirname, '../../mcp/sightline-server/src/cli.js');
            cp.exec(`node "${cliPath}" delete-snapshot ${message.id}`, (err, stdout, stderr) => {
              if (err) {
                vscode.window.showErrorMessage('Error deleting snapshot: ' + stderr);
                return;
              }
              vscode.commands.executeCommand('sightline.openPanel'); // Refresh panel
            });
          } catch (e) {
            const msg = (e instanceof Error) ? e.message : String(e);
            vscode.window.showErrorMessage('Failed to run CLI: ' + msg);
          }
          break;
      }
    });
  });

  context.subscriptions.push(disposable);
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
