import * as vscode from 'vscode';

export class SightlinePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'sightlinePanel';

  public lastWebview: vscode.WebviewView | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.lastWebview = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'captureSnapshot':
          vscode.commands.executeCommand('sightline.captureSnapshot');
          break;
        case 'refreshSnapshots':
          vscode.commands.executeCommand('sightline.refreshSnapshots');
          break;
        case 'validateSnapshot':
          vscode.commands.executeCommand('sightline.validateSnapshot', message.snapshotId);
          break;
        case 'compareSnapshots':
          vscode.commands.executeCommand('sightline.compareSnapshots', message.idA, message.idB);
          break;
        case 'archiveSnapshot':
          vscode.commands.executeCommand('sightline.archiveSnapshot', message.snapshotId);
          break;
        case 'deleteSnapshot':
          vscode.commands.executeCommand('sightline.deleteSnapshot', message.snapshotId);
          break;
        case 'approveAI':
          vscode.commands.executeCommand('sightline.approveAI', message.suggestionId);
          break;
        case 'denyAI':
          vscode.commands.executeCommand('sightline.denyAI', message.suggestionId);
          break;
      }
    });
  }

  private getHtml(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: sans-serif; padding: 10px; }
          button { margin: 5px 0; width: 100%; }
          #snapshots { margin-top: 10px; }
          .snapshot { border: 1px solid #ccc; padding: 5px; margin-bottom: 5px; }
          .actions button { width: auto; margin-right: 5px; }
          #ai-section { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
          .suggestion { border: 1px dashed #888; padding: 5px; margin-bottom: 5px; }
          #status { margin-top: 10px; font-size: 0.9em; color: #888; }
          #loading { display: none; margin-top: 10px; font-size: 0.9em; color: #007acc; }
        </style>
      </head>
      <body>
        <h2>Sightline Snapshots</h2>
        <button onclick="vscode.postMessage({ command: 'captureSnapshot' })">Capture Snapshot</button>
        <button onclick="vscode.postMessage({ command: 'refreshSnapshots' })">Refresh Snapshots</button>
        <div id="snapshots">
          <!-- Snapshots will be dynamically inserted here -->
        </div>

        <div id="ai-section">
          <h3>AI Suggestions</h3>
          <div id="suggestions">
            <!-- AI suggestions will be inserted here -->
          </div>
        </div>

        <div id="loading">Loading...</div>
        <div id="status">Ready</div>

        <script>
          const vscode = acquireVsCodeApi();

          window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'loading') {
              document.getElementById('loading').style.display = message.show ? 'block' : 'none';
            } else if (message.type === 'snapshotList') {
              const container = document.getElementById('snapshots');
              container.innerHTML = '';
              message.snapshots.forEach(snap => {
                const div = document.createElement('div');
                div.className = 'snapshot';
                div.innerHTML = \`
                  <strong>\${snap.label || 'Snapshot #' + snap.id}</strong><br/>
                  Status: \${snap.archived ? 'Archived' : 'Active'}<br/>
                  <div class="actions">
                    <button onclick="vscode.postMessage({ command: 'validateSnapshot', snapshotId: \${snap.id} })">Validate</button>
                    <button onclick="vscode.postMessage({ command: 'archiveSnapshot', snapshotId: \${snap.id} })">\${snap.archived ? 'Unarchive' : 'Archive'}</button>
                    <button onclick="vscode.postMessage({ command: 'deleteSnapshot', snapshotId: \${snap.id} })">Delete</button>
                  </div>
                \`;
                container.appendChild(div);
              });
            } else if (message.type === 'aiSuggestions') {
              const container = document.getElementById('suggestions');
              container.innerHTML = '';
              message.suggestions.forEach(sug => {
                const div = document.createElement('div');
                div.className = 'suggestion';
                div.innerHTML = \`
                  <strong>Suggestion:</strong> \${sug.text}<br/>
                  <button onclick="vscode.postMessage({ command: 'approveAI', suggestionId: '\${sug.id}' })">Approve</button>
                  <button onclick="vscode.postMessage({ command: 'denyAI', suggestionId: '\${sug.id}' })">Deny</button>
                \`;
                container.appendChild(div);
              });
            } else if (message.type === 'status') {
              document.getElementById('status').innerText = message.text;
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}
