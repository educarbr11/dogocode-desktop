# DoGo Code Desktop (Tauri v2)

Aplicativo desktop do DoGo Code empacotado com Tauri, usando frontend estático em `built/packaged`.

## Visão geral do projeto

- Shell desktop: Rust + Tauri (`src-tauri`)
- Frontend distribuído: `built/packaged` (configurado em `src-tauri/tauri.conf.json`)
- Auto-update: `tauri-plugin-updater`, lendo o arquivo `latest.json` da release mais recente no GitHub
- CI/CD: workflow `.github/workflows/build.yml` publica releases ao fazer push na branch `release`

## Pré-requisitos

### Gerais

- Node.js LTS
- npm
- Rust (toolchain `stable`)
- Tauri CLI v2 (já está em `devDependencies` via `@tauri-apps/cli`)

### Linux (Ubuntu/Debian)

Para build local no Linux, instale as libs nativas:

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.0-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

## Como rodar localmente

1. Instale dependências Node:

```bash
npm install
```

2. Rode em modo desenvolvimento:

```bash
npm run tauri -- dev
```

Observação importante:
- O Tauri usa `../built/packaged` como frontend (`frontendDist`).
- Esse diretório precisa existir e estar atualizado antes de rodar/buildar.

## Como gerar build local (instalador/binário)

```bash
npm run tauri -- build
```

Os artefatos são gerados em:

- `src-tauri/target/release/bundle/`

Targets configurados no projeto:

- `msi`
- `nsis`
- `appimage`

## Como deployar (publicar release automática)

O deploy é feito por GitHub Actions no workflow:

- `.github/workflows/build.yml`

Trigger atual:

- Push na branch `release`

Ao disparar:

1. Faz checkout do código
2. Instala Node e Rust
3. Instala dependências do sistema no Ubuntu
4. Executa `npm install`
5. Executa `tauri-apps/tauri-action@v0`
6. Cria/atualiza release no GitHub com assets de Windows e Linux
7. Gera artefatos de updater (`latest.json` + assinaturas), usados pelo app para atualização automática

### Secrets obrigatórios no repositório GitHub

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_KEY_PASSWORD`
- `GITHUB_TOKEN` (fornecido automaticamente pelo GitHub Actions)

Sem os secrets de assinatura, o updater não funciona corretamente.

## Como subir uma nova versão

Use este checklist:

1. Atualize a versão em `src-tauri/Cargo.toml`:

```toml
version = "X.Y.Z"
```

2. Atualize a mesma versão em `src-tauri/tauri.conf.json`:

```json
"version": "X.Y.Z"
```

3. (Opcional, para consistência) atualize também `package.json`:

```json
"version": "X.Y.Z"
```

4. Commit das alterações:

```bash
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json package.json
git commit -m "chore(release): vX.Y.Z"
```

5. Faça push para a branch `release`:

```bash
git push origin release
```

6. Acompanhe o workflow em `Actions` no GitHub até concluir com sucesso.
7. Valide a release criada e confirme que o asset `latest.json` foi publicado.

## Processo recomendado de release

1. Desenvolver e validar em branch de trabalho
2. Garantir que `built/packaged` está na versão correta do frontend
3. Bump de versão (`Cargo.toml` + `tauri.conf.json`)
4. Push para `release`
5. Conferir release no GitHub e testar atualização no app instalado

## Troubleshooting rápido

- Erro de dependências nativas no Linux: revisar libs `webkit2gtk`/`libappindicator` instaladas.
- App abre sem frontend: confirmar se `built/packaged` existe no projeto.
- Updater não encontra atualização: validar se `latest.json` foi publicado na release mais recente.
- Build CI falha por assinatura: revisar `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_KEY_PASSWORD`.

## Publicação na Microsoft Store como MSIX

O workflow `.github/workflows/store-msix.yml` gera um pacote separado para a
Microsoft Store. Esse pacote não usa o certificado Authenticode rejeitado: a
Store aplica sua assinatura pública depois da certificação.

Crie o GitHub Environment `microsoft-store` e adicione estas **Variables** com
os valores exatos da página **Product identity** no Partner Center:

- `MSIX_IDENTITY_NAME`: valor de Package/Identity/Name;
- `MSIX_PUBLISHER`: valor completo de Package/Identity/Publisher;
- `MSIX_PUBLISHER_DISPLAY_NAME`: nome de exibição do publicador.

Execute `Build Microsoft Store MSIX` manualmente em Actions ou publique uma
tag no formato:

```bash
git tag store-v1.0.9
git push origin store-v1.0.9
```

Baixe o artefato `dogocode-microsoft-store-msix` e envie o `.msix` como um
produto **MSIX packaged app**, não como EXE/MSI. O build Store desabilita o
updater próprio do Tauri por meio de `DOGOCODE_STORE_BUILD=1`.

### Build local no Windows

Instale Node.js, Rust e o Windows 10/11 SDK. Em seguida:

```powershell
$env:DOGOCODE_STORE_BUILD = "1"
npm install
npm run tauri build -- --no-bundle
./scripts/build-msix.ps1 `
  -IdentityName "IDENTITY_NAME_DO_PARTNER_CENTER" `
  -Publisher "PUBLISHER_EXATO_DO_PARTNER_CENTER" `
  -PublisherDisplayName "NOME_DO_PUBLICADOR"
```

O resultado será criado em `dist/msix/`.

### Linux e MSIX Packaging Tool

O MSIX Packaging Tool e o Windows SDK não funcionam nativamente no Linux. Use
o workflow `windows-latest` ou uma VM Windows; Wine não é um fluxo suportado
para certificação da Store.

Dentro do Windows, a ferramenta interativa pode ser instalada com:

```powershell
winget install "MSIX Packaging Tool"
```

O pipeline deste repositório não depende da captura interativa: ele usa o
`MakeAppx.exe` do Windows SDK para gerar um pacote reproduzível.
