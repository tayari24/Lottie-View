const vscode = require('vscode');
const path = require('path');

function getHtml(webview, extensionUri) {
  const nonce = getNonce();
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'viewer.js'));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    html, body { height: 100%; margin: 0; }
    body {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
    }
    #anim { width: 320px; height: 320px; }
    #anim svg { width: 100%; height: 100%; }
    #toolbar { display: none; gap: 8px; margin-bottom: 12px; }
    #toolbar button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; border-radius: 2px; padding: 4px 12px; cursor: pointer;
      font-size: 12px;
    }
    #toolbar button:hover { background: var(--vscode-button-hoverBackground); }
    #error { display: none; max-width: 80%; color: var(--vscode-errorForeground); white-space: pre-wrap; font-size: 12px; }
  </style>
</head>
<body>
  <div id="toolbar">
    <button id="playpause">Pause</button>
    <button id="restart">Restart</button>
  </div>
  <div id="anim"></div>
  <div id="error"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce() {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

class LottieEditorProvider {
  constructor(context) {
    this.context = context;
  }

  async openCustomDocument(uri) {
    return { uri, dispose: () => {} };
  }

  async resolveCustomEditor(document, webviewPanel) {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
    };
    webviewPanel.webview.html = getHtml(webviewPanel.webview, this.context.extensionUri);

    const ext = path.extname(document.uri.fsPath).toLowerCase();
    const bytes = await vscode.workspace.fs.readFile(document.uri);

    const message = {
      type: 'open',
      format: ext === '.lottie' ? 'lottie' : 'json',
      data: Buffer.from(bytes).toString('base64')
    };

    // For plain JSON files, resolve relative image assets to webview URIs
    // so lottie-web can load them (CSP img-src allows webview.cspSource).
    if (ext !== '.lottie') {
      try {
        const json = JSON.parse(Buffer.from(bytes).toString('utf8'));
        if (Array.isArray(json.assets)) {
          const dir = vscode.Uri.joinPath(document.uri, '..');
          message.assets = [];
          json.assets.forEach((asset, i) => {
            if (asset && asset.p && !asset.p.startsWith('data:')) {
              const target = vscode.Uri.joinPath(dir, asset.p);
              message.assets.push({ index: i, uri: webviewPanel.webview.asWebviewUri(target).toString() });
            }
          });
        }
      } catch (e) {
        // leave it to the webview to report parse errors
      }
    }

    webviewPanel.webview.postMessage(message);
    return {};
  }
}

function activate(context) {
  const provider = new LottieEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('lottiePreview.lottie', provider),
    vscode.window.registerCustomEditorProvider('lottiePreview.json', provider)
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
