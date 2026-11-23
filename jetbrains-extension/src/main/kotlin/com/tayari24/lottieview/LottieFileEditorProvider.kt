package com.tayari24.lottieview

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

class LottieFileEditorProvider : FileEditorProvider, DumbAware {

    override fun accept(project: Project, file: VirtualFile): Boolean {
        return when (file.extension?.lowercase()) {
            "lottie" -> true
            "json" -> looksLikeLottie(file)
            else -> false
        }
    }

    private fun looksLikeLottie(file: VirtualFile): Boolean {
        return try {
            if (file.length > 50_000_000) return false
            val head = file.inputStream.use { String(it.readNBytes(8192), Charsets.UTF_8) }
            head.contains("\"layers\"") && head.contains("\"v\"") &&
                (head.contains("\"fr\"") || head.contains("\"op\""))
        } catch (e: Exception) {
            false
        }
    }

    override fun createEditor(project: Project, file: VirtualFile): FileEditor =
        LottieFileEditor(file)

    override fun getEditorTypeId() = "lottie-preview"

    override fun getPolicy() = FileEditorPolicy.PLACE_BEFORE_DEFAULT_EDITOR
}
