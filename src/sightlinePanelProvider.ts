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
          body { font-family: sans-serif; padding: 10px; color: var(--vscode-foreground); background-color: var(--vscode-editor-background); }
          button { margin: 5px 0; width: 100%; background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 5px; border-radius: 3px; }
          button:hover { background-color: var(--vscode-button-hoverBackground); cursor: pointer; }
          #snapshots { margin-top: 10px; }
          .snapshot { border: 1px solid var(--vscode-editorWidget-border); padding: 5px; margin-bottom: 5px; border-radius: 3px; background-color: var(--vscode-editorWidget-background); }
          .actions button { width: auto; margin-right: 5px; }
          #ai-section { margin-top: 20px; border-top: 1px solid var(--vscode-editorWidget-border); padding-top: 10px; }
          .suggestion { border: 1px dashed var(--vscode-editorWidget-border); padding: 5px; margin-bottom: 5px; border-radius: 3px; background-color: var(--vscode-editorWidget-background); }
          #status { margin-top: 10px; font-size: 0.9em; color: var(--vscode-descriptionForeground); }
          #loading { display: none; margin-top: 10px; font-size: 0.9em; color: var(--vscode-progressBar-background); }
        </style>
      </head>
      <body>
        <h2>Sightline Snapshots</h2>
        <button title="Capture a new snapshot" onclick="vscode.postMessage({ command: 'captureSnapshot' })">📸 Capture Snapshot</button>
        <button title="Refresh snapshot list" onclick="vscode.postMessage({ command: 'refreshSnapshots' })">🔄 Refresh Snapshots</button>

        <input id="searchInput" placeholder="Filter by label, tags, or status..." style="width:100%;margin-top:5px;padding:4px;" oninput="filterSnapshots()" />

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
              window.snapshotData = message.snapshots;
              renderSnapshots(message.snapshots);
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

          function renderSnapshots(snapshots) {
            const container = document.getElementById('snapshots');
            container.innerHTML = '';
            snapshots.forEach(snap => {
              const div = document.createElement('div');
              div.className = 'snapshot';
              div.innerHTML = \`
                <strong>\${snap.label || 'Snapshot #' + snap.id}</strong><br/>
                Status: \${snap.archived ? 'Archived' : 'Active'}<br/>
                <div class="actions">
                  <button title="Validate snapshot" onclick="vscode.postMessage({ command: 'validateSnapshot', snapshotId: \${snap.id} })">✅</button>
                  <button title="\${snap.archived ? 'Unarchive' : 'Archive'} snapshot" onclick="vscode.postMessage({ command: 'archiveSnapshot', snapshotId: \${snap.id} })">\${snap.archived ? '📂' : '🗄️'}</button>
                  <button title="Delete snapshot" onclick="vscode.postMessage({ command: 'deleteSnapshot', snapshotId: \${snap.id} })">🗑️</button>
                </div>
              \`;
              container.appendChild(div);
            });
          }

          function filterSnapshots() {
            const query = document.getElementById('searchInput').value.toLowerCase();
            const filtered = (window.snapshotData || []).filter(snap => {
              return (snap.label && snap.label.toLowerCase().includes(query)) ||
                     (snap.tags && snap.tags.toLowerCase().includes(query)) ||
                     (snap.archived ? 'archived' : 'active').includes(query);
            });
            renderSnapshots(filtered);
          }
        </script>
      </body>
      </html>
    `;
  }
}
