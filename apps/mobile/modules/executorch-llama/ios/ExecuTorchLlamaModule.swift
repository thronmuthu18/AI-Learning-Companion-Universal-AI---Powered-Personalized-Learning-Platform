import Foundation
import CryptoKit
import ExpoModulesCore

#if canImport(ExecuTorchLLM)
import ExecuTorchLLM
#endif

public class ExecuTorchLlamaModule: Module {
  private let inferenceQueue = DispatchQueue(label: "com.ailearningcompanion.executorch.ios", qos: .userInitiated)
  private var isLoaded = false

  #if canImport(ExecuTorchLLM)
  private var runner: TextLLMRunner?
  #endif

  public func definition() -> ModuleDefinition {
    Name("ExecuTorchLlama")

    Events("onToken", "onModelError")

    AsyncFunction("getCapabilities") { () -> [String: Any] in
      let totalMb = Int(ProcessInfo.processInfo.physicalMemory / (1024 * 1024))
      let availBytes = os_proc_available_memory()
      let availMb = availBytes > 0 ? Int(availBytes / (1024 * 1024)) : totalMb
      #if canImport(ExecuTorchLLM)
      let runtimeAvailable = true
      #else
      let runtimeAvailable = false
      #endif

      return [
        "platform": "ios",
        "backend": "xnnpack",
        "availableRamMb": availMb,
        "totalRamMb": totalMb,
        "isModelInstalled": self.isLoaded,
        "executorchLinked": runtimeAvailable
      ]
    }

    AsyncFunction("verifyFileSha256") { (filePath: String) -> String in
      let url = URL(fileURLWithPath: filePath)
      let handle = try FileHandle(forReadingFrom: url)
      defer { try? handle.close() }

      var hasher = SHA256()
      while autoreleasepool(invoking: {
        let data = handle.readData(ofLength: 1024 * 1024)
        if data.isEmpty { return false }
        hasher.update(data: data)
        return true
      }) {}

      let digest = hasher.finalize()
      return digest.map { String(format: "%02x", $0) }.joined()
    }

    AsyncFunction("loadModel") { (modelPath: String, tokenizerPath: String, _ temperature: Double, promise: Promise) in
      self.inferenceQueue.async {
        let fm = FileManager.default
        guard fm.fileExists(atPath: modelPath), fm.fileExists(atPath: tokenizerPath) else {
          promise.reject(
            "ERR_MODEL_FILES_MISSING",
            "Missing .pte model or tokenizer.model at \(modelPath)"
          )
          return
        }
        let modelAttrs = try? fm.attributesOfItem(atPath: modelPath)
        let modelSize = (modelAttrs?[.size] as? NSNumber)?.int64Value ?? 0
        if modelSize < 1024 {
          promise.reject(
            "ERR_INVALID_MODEL_FILE",
            "Invalid .pte model file size (\(modelSize) bytes)."
          )
          return
        }

        #if canImport(ExecuTorchLLM)
        let specialTokens = [
          "<|begin_of_text|>",
          "<|end_of_text|>",
          "<|start_header_id|>",
          "<|end_header_id|>",
          "<|eot_id|>"
        ]
        self.runner = TextLLMRunner(
          modelPath: modelPath,
          tokenizerPath: tokenizerPath,
          specialTokens: specialTokens
        )
        self.isLoaded = true
        promise.resolve(nil)
        #else
        promise.reject(
          "ERR_EXECUTORCH_NOT_LINKED",
          "ExecuTorchLLM Swift Package is not linked in this Xcode target. Add https://github.com/pytorch/executorch via SPM (targets: executorch, executorch_llm, backend_xnnpack)."
        )
        #endif
      }
    }

    AsyncFunction("generate") { (prompt: String, seqLen: Int, _ temperature: Double, promise: Promise) in
      self.inferenceQueue.async {
        #if canImport(ExecuTorchLLM)
        guard let runner = self.runner else {
          promise.reject("ERR_MODEL_NOT_LOADED", "ExecuTorch TextLLMRunner is not loaded")
          return
        }
        var accumulated = ""
        let start = CFAbsoluteTimeGetCurrent()
        var tokenCount = 0
        do {
          try runner.generate(prompt, Config {
            $0.sequenceLength = seqLen
          }) { token in
            accumulated += token
            tokenCount += 1
            self.sendEvent("onToken", ["token": token])
          }
          let elapsed = max(0.001, CFAbsoluteTimeGetCurrent() - start)
          let tps = Double(tokenCount) / elapsed
          let statsJson = "{\"num_generated_tokens\":\(tokenCount),\"tokens_per_sec\":\(String(format: "%.2f", tps))}"
          promise.resolve(["text": accumulated, "statsJson": statsJson])
        } catch {
          self.sendEvent("onModelError", ["code": -1, "message": error.localizedDescription])
          promise.reject("ERR_EXECUTORCH_GENERATE", error.localizedDescription)
        }
        #else
        promise.reject("ERR_EXECUTORCH_NOT_LINKED", "ExecuTorchLLM Swift Package is not linked")
        #endif
      }
    }

    AsyncFunction("stop") {
      #if canImport(ExecuTorchLLM)
      self.runner?.stop()
      #endif
    }

    AsyncFunction("resetContext") {
      #if canImport(ExecuTorchLLM)
      self.runner?.reset()
      #endif
    }

    AsyncFunction("dispose") {
      #if canImport(ExecuTorchLLM)
      self.runner?.reset()
      self.runner = nil
      #endif
      self.isLoaded = false
    }
  }
}
