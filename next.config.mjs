
const nextConfig = {
  // Native ONNX runtime must not be bundled.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
