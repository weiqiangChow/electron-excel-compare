use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

/// 把前端生成的 xlsx 内容写入用户在保存对话框里选定的路径。
///
/// 内容用 base64 而不是 `number[]` 传递：Tauri 的 JSON IPC 会把字节数组展开成数字列表，
/// 体积约为原文件的 4 倍，稍微大一点的对比结果就会明显变慢。
#[tauri::command]
fn save_export(path: String, contents_base64: String) -> Result<(), String> {
  let bytes = BASE64
    .decode(contents_base64)
    .map_err(|err| format!("导出内容解析失败：{err}"))?;

  std::fs::write(&path, bytes).map_err(|err| format!("写入 {path} 失败：{err}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![save_export])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}

#[cfg(test)]
mod tests {
  use super::save_export;
  use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

  fn temp_path(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join("excel-compare-save-export-test");
    std::fs::create_dir_all(&dir).unwrap();
    dir.join(name)
  }

  #[test]
  fn writes_decoded_contents() {
    let path = temp_path("对比结果.xlsx");
    let payload = b"fake xlsx bytes";

    save_export(path.to_string_lossy().into(), BASE64.encode(payload)).unwrap();

    assert_eq!(std::fs::read(&path).unwrap(), payload);
    std::fs::remove_file(&path).unwrap();
  }

  #[test]
  fn rejects_invalid_contents_without_touching_disk() {
    let path = temp_path("bad.xlsx");

    let err = save_export(path.to_string_lossy().into(), "not base64!!".into()).unwrap_err();

    assert!(err.contains("解析失败"), "{err}");
    assert!(!path.exists());
  }
}
