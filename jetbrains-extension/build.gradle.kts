plugins {
    kotlin("jvm") version "2.0.21"
    id("org.jetbrains.intellij.platform") version "2.2.1"
}

group = "com.tayari24.lottieview"
version = "1.0.0"

repositories {
    intellijPlatform {
        defaultRepositories()
    }
    mavenCentral()
}

dependencies {
    intellijPlatform {
        create("IC", "2024.3.1")
    }
}

kotlin {
    jvmToolchain(17)
}

intellijPlatform {
    pluginConfiguration {
        name = "Lottie View"
        ideaVersion {
            sinceBuild = "243"
            untilBuild = "261.*"
        }
    }
    publishing {
        token = providers.gradleProperty("publishToken")
        channels = providers.gradleProperty("publishChannel").map { listOf(it) }
    }
}
