package com.ailearningcompanion.executorch

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.pytorch.executorch.extension.llm.LlmCallback
import org.pytorch.executorch.extension.llm.LlmGenerationConfig
import org.pytorch.executorch.extension.llm.LlmModule
import org.pytorch.executorch.extension.llm.LlmModuleConfig
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

class ExecuTorchLlamaModule : Module() {
  private var llmModule: LlmModule? = null
  private val workerScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  override fun definition() = ModuleDefinition {
    Name("ExecuTorchLlama")

    Events("onToken", "onModelError")

    AsyncFunction("getCapabilities") {
      val ctx = appContext.reactContext
      val am = ctx?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      val memInfo = ActivityManager.MemoryInfo()
      am?.getMemoryInfo(memInfo)
      val availMb = (memInfo.availMem / (1024 * 1024)).toInt()
      val totalMb = (memInfo.totalMem / (1024 * 1024)).toInt()
      mapOf(
        "platform" to "android",
        "backend" to "xnnpack",
        "availableRamMb" to availMb,
        "totalRamMb" to totalMb,
        "lowMemory" to memInfo.lowMemory,
        "supportedAbis" to Build.SUPPORTED_ABIS.toList(),
        "isModelInstalled" to (llmModule != null)
      )
    }

    AsyncFunction("verifyFileSha256") { filePath: String ->
      val file = File(filePath)
      if (!file.exists()) {
        throw IllegalArgumentException("Model file not found at $filePath")
      }
      val digest = MessageDigest.getInstance("SHA-256")
      FileInputStream(file).use { fis ->
        val buffer = ByteArray(1024 * 1024)
        var read = fis.read(buffer)
        while (read != -1) {
          digest.update(buffer, 0, read)
          read = fis.read(buffer)
        }
      }
      digest.digest().joinToString("") { "%02x".format(it) }
    }

    AsyncFunction("loadModel") { modelPath: String, tokenizerPath: String, temperature: Double, promise: Promise ->
      workerScope.launch {
        try {
          val modelFile = File(modelPath)
          val tokFile = File(tokenizerPath)
          if (!modelFile.exists() || !tokFile.exists()) {
            promise.reject(
              "ERR_MODEL_FILES_MISSING",
              "Missing .pte model or tokenizer file. model=$modelPath tokenizer=$tokenizerPath",
              null
            )
            return@launch
          }
          if (modelFile.length() < 1024L || tokFile.length() < 128L) {
            promise.reject(
              "ERR_INVALID_MODEL_FILE",
              "Invalid model or tokenizer artifact size (model=${modelFile.length()}B, tokenizer=${tokFile.length()}B).",
              null
            )
            return@launch
          }

          llmModule?.close()
          llmModule = null

          val config = LlmModuleConfig.create()
            .modulePath(modelPath)
            .tokenizerPath(tokenizerPath)
            .temperature(temperature.toFloat())
            .modelType(LlmModuleConfig.MODEL_TYPE_TEXT)
            .loadMode(LlmModuleConfig.LOAD_MODE_MMAP)
            .build()

          val module = LlmModule(config)
          module.load()
          llmModule = module
          promise.resolve(null)
        } catch (t: Throwable) {
          promise.reject("ERR_EXECUTORCH_LOAD", t.message ?: "Failed to load ExecuTorch model", t)
        }
      }
    }

    AsyncFunction("generate") { prompt: String, seqLen: Int, temperature: Double, promise: Promise ->
      val module = llmModule
      if (module == null) {
        promise.reject("ERR_MODEL_NOT_LOADED", "ExecuTorch LlmModule is not loaded", null)
        return@AsyncFunction
      }

      workerScope.launch {
        val output = StringBuilder()
        var statsJson = "{}"
        var errorOccurred: String? = null

        try {
          val genConfig = LlmGenerationConfig.create()
            .seqLen(seqLen)
            .temperature(temperature.toFloat())
            .echo(false)
            .build()

          module.generate(prompt, genConfig, object : LlmCallback {
            override fun onResult(result: String) {
              output.append(result)
              sendEvent("onToken", mapOf("token" to result))
            }

            override fun onStats(stats: String) {
              statsJson = stats
            }

            override fun onError(errorCode: Int, message: String) {
              errorOccurred = "ExecuTorch error ($errorCode): $message"
              sendEvent("onModelError", mapOf("code" to errorCode, "message" to message))
            }
          })

          if (errorOccurred != null) {
            promise.reject("ERR_EXECUTORCH_GENERATE", errorOccurred, null)
          } else {
            promise.resolve(mapOf("text" to output.toString(), "statsJson" to statsJson))
          }
        } catch (t: Throwable) {
          promise.reject("ERR_EXECUTORCH_GENERATE", t.message ?: "ExecuTorch generate failed", t)
        }
      }
    }

    AsyncFunction("stop") {
      llmModule?.stop()
    }

    AsyncFunction("resetContext") {
      llmModule?.resetContext()
    }

    AsyncFunction("dispose") {
      llmModule?.close()
      llmModule = null
    }

    OnDestroy {
      llmModule?.close()
      llmModule = null
      workerScope.cancel()
    }
  }
}
