# Chave de assinatura do APK de teste

`debug.keystore` assina o APK gerado pelo GitHub Actions. Ela é fixa para que o
"Entrar com Google" funcione: o Google confere a impressão digital SHA-1 do app.

- Alias: `androiddebugkey` — senhas: `android` (padrão de chaves de debug)
- SHA-1: `28:9A:CE:5D:2C:F3:D0:BD:42:99:4E:87:62:AF:D6:45:62:29:36:D8`
- Pacote: `br.com.campinhoconectado.app`

Esta chave serve só para o APK de testes. Para publicar na Play Store, gere uma
chave de produção (guardada fora do repositório) e cadastre também o SHA-1 dela
— e o da "App signing key" da Play Console — no Google Cloud.
