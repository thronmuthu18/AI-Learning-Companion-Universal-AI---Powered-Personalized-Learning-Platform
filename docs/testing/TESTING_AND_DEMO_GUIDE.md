# Testing & Demonstration Guide

## Automated Test Suites
Run all unit & cross-package integration tests via Vitest:
```bash
npm test
```

## Demonstration Sequence (16-Step Verification Checklist)
1. **Application Opening**: Splash screen transitions cleanly to Welcome / Dashboard.
2. **Learner Registration**: Complete Onboarding (`name`, academic level, daily hours, self-reported skills).
3. **Goal Selection**: Choose a predefined goal (e.g., AI Engineer) or interpret a custom free-text goal using local Llama 3.2.
4. **Skill Assessment**: Complete the 10-question diagnostic with confidence ratings and timing.
5. **Skill-Gap Analysis**: Inspect strong/weak/missing/unassessed categories and verified DAG prerequisite lockouts.
6. **Personalised Roadmap**: Inspect 3-stage roadmap tailored to diagnostic evidence.
7. **Study Plan**: Inspect daily, weekly, and monthly views; test unrealistic deadline warning & missed session rescheduling.
8. **Learning Activity**: Open bundled offline lessons and code examples in Learning Library -> Content Viewer.
9. **Quiz**: Complete a topic mastery quiz and review instant explanations.
10. **Progress Dashboard**: Verify DB-backed study hours, streaks, completion %, and 7-day activity bars.
11. **Adaptive Recommendation**: Trigger deterministic rules from low quiz scores / overdue sessions.
12. **Actual Local Llama Inference**: Run streaming Q&A in AI Assistant via WebLLM (WebGPU) or ExecuTorch (Android/iOS).
13. **Internet-Disconnected Operation**: Switch browser/device offline and verify lessons, quizzes, persistence, and cached local Llama inference continue working.
14. **Web Application**: Verified build (`apps/web/dist`) + local preview.
15. **Android Application**: Kotlin `ExecuTorchLlamaModule` + `org.pytorch:executorch-android:1.5.1` (`assembleDebug` requires Android SDK).
16. **iOS Application**: Swift `ExecuTorchLlamaModule` + `TextLLMRunner` (Xcode build blocked on Windows host — BLK-01).
