# ChatGPT Anti-Lag

Chrome extension for long ChatGPT conversations. This first version hides older turns so typing, scrolling, and repaints stay lighter.

## V1

- Manifest V3 extension
- Popup for settings
- Content script on `chatgpt.com` and `chat.openai.com`
- Keeps only the latest configurable turns visible
- Inline page control for quickly expanding older messages

## Load In Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `chatgpt-antilag-extension` folder

## Next Good Steps

- verify the DOM selectors against the current ChatGPT UI
- optionally add placeholders instead of `display: none`
- optionally add summary/export helpers before starting a new chat
