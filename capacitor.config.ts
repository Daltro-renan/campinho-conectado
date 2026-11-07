import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App nativo (Android/iOS) com Capacitor.
 * O app usa os arquivos de `npm run build`; as chamadas da API vão para o
 * endereço definido em VITE_API_URL no momento do build (veja o README).
 */
const config: CapacitorConfig = {
  appId: "br.com.campinhoconectado.app",
  appName: "Campinho Conectado",
  webDir: "dist/public",
  backgroundColor: "#0B1A12",
};

export default config;
