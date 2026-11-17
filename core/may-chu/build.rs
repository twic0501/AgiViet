fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_prost_build::configure().build_client(false).compile_protos(&["../../proto/agiviet/core/v1/core.proto"], &["../../proto"])?;
    Ok(())
}
