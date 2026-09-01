// use tauri_plugin_updater::UpdaterExt;

// pub fn run() {
//     tauri::Builder::default()
//         // 🔥 Adiciona o plugin do Updater ANTES de usar `app.updater()`
//         .plugin(tauri_plugin_updater::Builder::new().build())
//         .setup(|app| {
//             let handle = app.handle().clone();
//             tauri::async_runtime::spawn(async move {
//                 if let Err(e) = update(handle).await {
//                     println!("Erro ao verificar atualização: {:?}", e);
//                 }
//             });
//             Ok(())
//         })
//         .run(tauri::generate_context!())
//         .expect("Erro ao iniciar a aplicação");
// }

// async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
//     if let Some(update) = app.updater()?.check().await? {
//         let mut downloaded = 0;

//         update
//             .download_and_install(
//                 |chunk_length, content_length| {
//                     downloaded += chunk_length;
//                     println!("Baixado {downloaded} de {content_length:?}");
//                 },
//                 || {
//                     println!("Download finalizado");
//                 },
//             )
//             .await?;

//         println!("Atualização instalada");
//         app.restart();
//     }

//     Ok(())
// }

use tauri_plugin_updater::UpdaterExt;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Store releases are updated by Microsoft Store. Running a second
            // updater would bypass Store package management and certification.
            if option_env!("DOGOCODE_STORE_BUILD") == Some("1") {
                return Ok(());
            }

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                update(handle).await.unwrap();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .unwrap();
}

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;

        // alternatively we could also call update.download() and update.install() separately
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    println!("downloaded {downloaded} from {content_length:?}");
                },
                || {
                    println!("download finished");
                },
            )
            .await?;

        println!("update installed");
        app.restart();
    }

    Ok(())
}
