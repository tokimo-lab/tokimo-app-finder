//! Trigger ts-rs TypeScript type generation.

#[test]
fn export_bindings() {
    tokimo_app_finder::handlers::FileFavoriteDto::export().expect("ts-rs export failed");
}
