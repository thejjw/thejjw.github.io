const tf = globalThis.tf;

if (!tf) {
  throw new Error(
    "TensorFlowJS global 'tf' not found. Load ./lib/@tensorflow/tfjs/dist/tf.min.js before Magika.",
  );
}

export default tf;
