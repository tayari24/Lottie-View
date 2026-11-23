package com.tayari24.lottieview

import com.google.gson.JsonParser
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import java.awt.BorderLayout
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets
import java.beans.PropertyChangeListener
import java.io.File
import java.util.Base64
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.SwingConstants

class LottieFileEditor(private val file: VirtualFile) : UserDataHolderBase(), FileEditor {

    companion object {
        private val LOG = Logger.getInstance(LottieFileEditor::class.java)
    }

    private var browser: JBCefBrowser? = null
    private var html: String? = null
    private var initError: String? = null
    private val fallbackPanel: JPanel

    init {
        if (JBCefApp.isSupported()) {
            try {
                val b = JBCefBrowser()
                html = buildHtml()
                b.loadHTML(html!!)
                browser = b
            } catch (e: Exception) {
                initError = e.message ?: e.toString()
                LOG.warn("LottieView: failed to initialize preview for ${file.path}", e)
            }
        } else {
            // JCEF unavailable (e.g. Android Studio) — fall back to system browser
            try {
                html = buildHtml()
            } catch (e: Exception) {
                initError = e.message ?: e.toString()
                LOG.warn("LottieView: failed to build preview for ${file.path}", e)
            }
        }
        fallbackPanel = buildFallbackPanel()
    }

    private fun buildFallbackPanel(): JPanel {
        val msg = if (initError != null)
            "Lottie preview failed.<br><br>$initError"
        else
            "Embedded browser isn't available in this IDE.<br>Preview opens in your system browser instead."
        val panel = JPanel(GridBagLayout())
        val c = GridBagConstraints().apply { gridy = 0; insets = Insets(8, 8, 8, 8) }
        panel.add(JLabel("<html><center>$msg</center></html>", SwingConstants.CENTER), c)
        if (html != null) {
            c.gridy = 1
            panel.add(JButton("Open Preview in Browser").apply {
                addActionListener { openInBrowser() }
            }, c)
        }
        return panel
    }

    private fun openInBrowser() {
        val page = html ?: return
        try {
            val out = File.createTempFile("lottie-preview-", ".html")
            out.writeText(page)
            BrowserUtil.browse(out.toURI().toURL().toString())
        } catch (e: Exception) {
            LOG.warn("LottieView: failed to open browser preview", e)
        }
    }

    private fun buildHtml(): String {
        val viewerJs = javaClass.getResourceAsStream("/web/viewer.js")
            ?.use { String(it.readBytes(), Charsets.UTF_8) }
            ?: throw IllegalStateException("web/viewer.js resource missing")

        val isLottie = file.extension.equals("lottie", ignoreCase = true)
        val bytes = file.inputStream.use { it.readBytes() }
        val payload = if (isLottie) bytes else prepareJsonPayload(bytes)

        val b64 = Base64.getEncoder().encodeToString(payload)
        val format = if (isLottie) "lottie" else "json"

        return """<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  html,body{height:100%;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:#1e1e2e;color:#cdd6f4;font-family:system-ui,sans-serif}
  #anim{width:320px;height:320px}#anim svg{width:100%;height:100%}
  #toolbar{display:none;gap:8px;margin-bottom:12px}
  #toolbar button{background:#89b4fa;color:#1e1e2e;border:none;border-radius:6px;
    padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer}
  #toolbar button:hover{background:#b4befe}
  #error{display:none;max-width:80%;color:#f38ba8;white-space:pre-wrap;font-size:12px}
</style></head><body>
<div id="toolbar"><button id="playpause">Pause</button><button id="restart">Restart</button></div>
<div id="anim"></div><div id="error"></div>
<script>window.__LOTTIE_PAYLOAD__={format:"$format",data:"$b64"};</script>
<script>$viewerJs</script>
</body></html>"""
    }

    // For plain .json files, inline relative image assets as data URIs
    private fun prepareJsonPayload(bytes: ByteArray): ByteArray {
        return try {
            val root = JsonParser.parseString(String(bytes, Charsets.UTF_8)).asJsonObject
            val assets = root.getAsJsonArray("assets") ?: return bytes
            val parent = file.parent ?: return bytes
            var changed = false
            for (el in assets) {
                val asset = el.asJsonObject ?: continue
                val p = asset.get("p")?.asString ?: continue
                if (p.startsWith("data:")) continue
                val sibling = VfsUtil.findRelativeFile(p, parent) ?: continue
                val imgBytes = sibling.inputStream.use { it.readBytes() }
                asset.addProperty("p", "data:${mimeFromName(p)};base64," + Base64.getEncoder().encodeToString(imgBytes))
                asset.addProperty("u", "")
                changed = true
            }
            if (changed) root.toString().toByteArray(Charsets.UTF_8) else bytes
        } catch (e: Exception) {
            bytes
        }
    }

    private fun mimeFromName(name: String): String = when (name.substringAfterLast('.').lowercase()) {
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "gif" -> "image/gif"
        "webp" -> "image/webp"
        "svg" -> "image/svg+xml"
        else -> "application/octet-stream"
    }

    override fun getComponent(): JComponent = browser?.component ?: fallbackPanel

    override fun getPreferredFocusedComponent(): JComponent? = browser?.component

    override fun getName() = "Lottie Preview"

    override fun setState(state: FileEditorState) {}

    override fun isModified() = false

    override fun isValid() = file.isValid

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {}

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {}

    override fun getFile(): VirtualFile = file

    override fun dispose() {
        browser?.let { Disposer.dispose(it) }
    }
}
