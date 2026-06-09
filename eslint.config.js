export default [
  {
    ignores: [
      "node_modules/**",
      "desktop/electron/app/**",
      "src/libs/**",
      "output/**",
      "tmp/**",
      ".playwright-cli/**",
      ".vercel/**"
    ]
  },
  {
    files: ["src/**/*.js", "main.js", "projectManager.js", "interactionEnhancer.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        navigator: "readonly",
        location: "readonly",
        history: "readonly",
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        DOMParser: "readonly",
        Image: "readonly",
        MouseEvent: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        performance: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly"
      }
    },
    rules: {
      "no-constant-binary-expression": "error",
      "no-dupe-else-if": "error",
      "no-duplicate-case": "error",
      "no-empty-character-class": "error",
      "no-extra-boolean-cast": "error",
      "no-irregular-whitespace": "error",
      "no-loss-of-precision": "error",
      "no-regex-spaces": "error",
      "no-sparse-arrays": "error",
      "no-unreachable": "error",
      "use-isnan": "error",
      "valid-typeof": "error"
    }
  }
];
