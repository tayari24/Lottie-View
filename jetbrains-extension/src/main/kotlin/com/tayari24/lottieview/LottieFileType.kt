package com.tayari24.lottieview

import com.intellij.openapi.fileTypes.FileType
import javax.swing.Icon

class LottieFileType private constructor() : FileType {

    companion object {
        val INSTANCE = LottieFileType()
    }

    override fun getName() = "Lottie"

    override fun getDescription() = "dotLottie animation package"

    override fun getDefaultExtension() = "lottie"

    override fun getIcon(): Icon? = null

    override fun isBinary() = true
}
