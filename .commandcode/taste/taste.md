# Git
- Push commits with user as sole author — do not add Claude/co-authorship attribution. Confidence: 0.85
- Git credentials (tokens) shared for a specific task should be used only for that task and the user will revoke afterward. Confidence: 0.80

# UI/UX
- Do not reveal the underlying AI model name (e.g., DeepSeek) in the chat UI. Use "BairePorbo AI" or "BairePorbo Mentor" instead. Confidence: 0.85
- CV templates use the following order: Classic (1), Europass (2), Modern Academic (3), Spotlight/Photo (4). Confidence: 0.70

# Mobile (React Native)
- Use KeyboardAvoidingView with behavior="padding" on all Android screens with text inputs to handle edge-to-edge keyboard behavior. Confidence: 0.75
- Hide the AI disclaimer text in chat when the keyboard is open to save screen space. Confidence: 0.70

# Content
- Bangla content should use a Banglish style — keep technical/scholarship terms in English, use Bangla for instructional/descriptive text. Confidence: 0.75

# Workflow
- After making app changes, build a release APK and install on the user's physical phone (via adb) for verification before considering the task complete. Confidence: 0.75

