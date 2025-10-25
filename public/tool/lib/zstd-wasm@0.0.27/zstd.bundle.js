/**
 * Custom bundle wrapper for @bokuweb/zstd-wasm v0.0.27
 * This file properly imports all dependencies with .js extensions
 */

// Import with proper .js extensions
import { Module, waitInitialized } from "./module.js";
import { compress } from "./simple/compress.js";
import { decompress } from "./simple/decompress.js";
import { compressUsingDict } from "./simple/compress_using_dict.js";
import { decompressUsingDict } from "./simple/decompress_using_dict.js";

/**
 * Initialize the WASM module
 * @param {string} path - Path to zstd.wasm file
 */
export const init = async (path) => {
    const defaultPath = new URL("./zstd.wasm", import.meta.url).href;
    Module.init(path != null ? path : defaultPath);
    await waitInitialized();
};

// Re-export compression functions
export { compress, decompress, compressUsingDict, decompressUsingDict };

// Re-export other utilities if needed
export { Module } from "./module.js";