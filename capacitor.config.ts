import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App nativo (Android/iOS) com Capacitor.
 *
 * Com CAP_SERVER_URL definido (é o caso do APK gerado no GitHub), o app abre as
 * telas direto do servidor publicado: toda atualização do site chega sozinha no
 * app, sem reinstalar. Só é preciso um APK novo quando algo nativo muda
 * (plugins, ícone, permissões).
 *
 * Sem CAP_SERVER_URL, o app usa a cópia das telas de `npm run build` (funciona
 * offline na abertura, mas precisa de APK novo a cada mudança).
 */
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "br.com.campinhoconectado.app",
  appName: "Campinho Conectado",
  webDir: "dist/public",
  backgroundColor: "#0B1A12",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: false,
          // Login do Google e pagamento abrem fora do app; o resto fica no app
          allowNavigation: [new URL(serverUrl).host],
        },
      }
    : {}),
};

export default config;
