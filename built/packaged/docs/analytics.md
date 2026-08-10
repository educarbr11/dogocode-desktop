# Analytics do editor

O editor DogoCode usa o Google Analytics 4 para medir, de forma agregada, quais fluxos e recursos do produto são mais utilizados. A integração está isolada em `editor/analytics.ts` e usa a propriedade `G-YPJ8TVLGCS`.

## Privacidade e ambientes

A configuração usa Consent Mode com `analytics_storage`, `ad_storage`, `ad_user_data` e `ad_personalization` definidos como `denied`. Google Signals, personalização de anúncios e o `page_view` automático também ficam desativados.

O GA4 é habilitado somente quando todas as condições abaixo são atendidas:

* a página usa HTTPS;
* o editor é um pacote estático publicado;
* a página está na janela principal, e não em um iframe;
* o editor não está no Tauri/Electron;
* o hostname não é `localhost`, `127.0.0.1` ou `::1`.

Mesmo sem cookies, os sinais enviados ao Google continuam sujeitos às políticas do Google Analytics e às leis aplicáveis. Mudanças nesta integração devem passar por revisão de privacidade.

## Eventos coletados

| Evento GA4 | Finalidade | Parâmetros específicos |
| --- | --- | --- |
| `page_view` | Abertura do editor | `page_location`, `page_title` |
| `screen_view` | Home ou editor | `screen_name` |
| `navigation` | Navegação interna | `destination` |
| `project_action` | Criar, abrir ou importar projeto | `action` |
| `editor_interaction` | Edição de código | `action`, `editor` |
| `editor_mode_change` | Troca entre Blocks, Python e JavaScript | `editor` |
| `block_interaction` | Inserção de bloco, sem identificar o bloco | `action` |
| `simulator_action` | Executar, depurar, iniciar ou parar | `action`, `editor` |
| `code_compile` | Início ou falha da compilação | `status`, `editor` |
| `code_deploy` | Envio do programa | `status`, `duration_ms` |
| `hardware_connection` | Uso de WebUSB | `action`, `connection_type`, `status` |
| `hardware_flash` | Gravação no micro:bit | `status` |
| `bluetooth_action` | Início do pareamento Bluetooth | `action`, `status` |
| `tutorial_action` | Início, navegação, conclusão ou saída | `action`, `step` |
| `extension_action` | Abrir ou importar extensão | `action` |
| `share_action` | Abrir ou publicar compartilhamento | `action` |
| `select_promotion` | Clique no banner do Portal DogoMaker | `promotion_id`, `promotion_name` |

Todos os eventos incluem, quando disponíveis, `language`, `target_version`, `hardware_variant` e `platform`. Eventos idênticos emitidos em menos de um segundo são deduplicados.

## Dados proibidos

Não adicione aos eventos:

* código-fonte, conteúdo dos blocos ou dados do simulador;
* nome, e-mail, identificadores de conta ou de projeto;
* URLs completas, query strings, hashes ou tokens;
* nomes livres de extensões, tutoriais ou arquivos;
* texto digitado pelo usuário;
* identificadores permanentes do navegador ou dispositivo.

O `page_location` é construído somente com origem e caminho, descartando query string e hash. Parâmetros desconhecidos são removidos antes do envio.

## Adicionando um evento

1. Confirme que o comportamento já emite um `pxt.tickEvent` estável.
2. Adicione um mapeamento explícito em `mapPxtEvent`.
3. Cadastre o nome e os parâmetros em `allowedParameters`.
4. Use valores enumerados ou numéricos; nunca encaminhe dados livres do evento original.
5. Atualize a tabela deste documento e valide os cenários de privacidade.

O wrapper sempre chama primeiro o `pxt.tickEvent` original. Isso preserva o Application Insights e outros consumidores existentes.

## Validação

Em localhost, confirme no painel Network que `googletagmanager.com` não é solicitado. Para validar um pacote publicado, use o Realtime ou DebugView do GA4 e confira que somente os eventos e parâmetros desta página aparecem.

Também devem ser testados:

* bloqueio de `googletagmanager.com` sem impacto no editor;
* ausência de query string e hash no `page_view`;
* ausência de eventos em iframe e desktop;
* continuidade dos eventos do Application Insights;
* deduplicação e descarte de parâmetros não permitidos.
