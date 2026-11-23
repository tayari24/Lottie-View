# Lottie View

**Preview [Lottie](https://lottiefiles.com/) animations directly inside VS Code — no browser, no external tools.**

Developed by **[Tayari24](https://tayari24.com/)** · Free & open source · [MIT License](LICENSE)

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://marketplace.visualstudio.com/items?itemName=Tayari24.lottie-view)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](https://github.com/tayari24/Lottie-View/blob/main/LICENSE)
[![Repository](https://img.shields.io/badge/repo-GitHub-black)](https://github.com/tayari24/Lottie-View)

---

## Features

- **Native `.lottie` support** — dotLottie packages open in a dedicated preview tab automatically, exactly like images do.
- **Lottie JSON preview** — open any Lottie animation `.json` via **Open With → Lottie Preview** (never hijacks your normal JSON editor).
- **Full playback** — animations play and loop automatically at their native size (scaled to fit, max 480px), with **Pause/Play** and **Restart** controls.
- **Embedded assets** — images packaged inside `.lottie` files are extracted and rendered; relative image paths in `.json` files are resolved from disk.
- **Offline & private** — everything is bundled (`lottie-web` + `JSZip`). No CDN, no network requests, no telemetry.

## Usage

### `.lottie` files

Just click a `.lottie` file in the Explorer — it opens in a preview tab automatically.

### `.json` files

1. Right-click the file → **Open With...**
2. Select **Lottie Preview**

To make it the default for a specific file pattern, use the `workbench.editorAssociations` setting:

```json
"workbench.editorAssociations": {
  "*.lottie.json": "lottiePreview.json"
}
```

## Supported Formats

| Format | Notes |
| ------ | ----- |
| `.lottie` | dotLottie package (ZIP containing `manifest.json` + animation JSON + assets). Plays the first animation in the manifest. |
| `.json` | Standard Lottie animation JSON (Bodymovin export). |

## Requirements

- VS Code **1.85.0** or newer

## Known Limitations

- Multi-animation `.lottie` packages currently preview the first animation in the manifest.
- dotLottie **themes** and **states** are not yet applied.

## Development

```sh
git clone https://github.com/tayari24/Lottie-View.git
cd Lottie-View
npm install
npm run bundle   # bundles lottie-web + jszip -> media/viewer.js
```

Press **F5** to launch the Extension Development Host, then open any `.lottie` or `.json` file.

## Packaging & Publishing

```sh
npm run package                          # produces lottie-view-<version>.vsix
code --install-extension lottie-view-1.0.0.vsix
```

## Contributing

Issues and pull requests are welcome at <https://github.com/tayari24/Lottie-View>.

## License

MIT © [Tayari24](https://tayari24.com/) — see [LICENSE](LICENSE).
