import { defineConfig } from "vitest/config";

// Configuração isolada dos testes: quote.ts e geometry.ts são módulos puros,
// não precisam de jsdom nem dos plugins do app (React, PWA).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
