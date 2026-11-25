Pod::Spec.new do |s|
  s.name           = 'ExecuTorchLlama'
  s.version        = '1.0.0'
  s.summary        = 'Native Swift ExecuTorch Llama 3.2 Expo Module for AI Learning Companion'
  s.description    = 'Wraps PyTorch ExecuTorch ExecuTorchLLM TextLLMRunner for offline iOS inference.'
  s.license        = 'MIT'
  s.author         = 'AI Learning Companion'
  s.homepage       = 'https://github.com/ailearningcompanion/ai-learning-companion'
  s.platforms      = { :ios => '17.0' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
