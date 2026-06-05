fn main() {
    #[cfg(target_os = "windows")]
    {
        let mut res = winresource::WindowsResource::new();
        res.set_manifest_file("urapex.exe.manifest");
        res.compile().expect("Failed to compile Windows resources");
    }
    tauri_build::build()
}
