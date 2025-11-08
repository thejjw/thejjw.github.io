import { ReadStream } from "fs";
import { Magika } from "./magika.js";
import { MagikaOptions } from "./src/magika-options.js";
import { MagikaResult } from "./src/magika-result.js";
import { ModelNode } from "./src/model-node.js";
import { ModelConfigNode } from "./src/model-config-node.js";
/**
 * The main Magika object for Node use (`MagikaNode`).
 *
 * Example usage:
 * ```js
 * import { readFile } from "fs/promises";
 * import { MagikaNode as Magika } from "magika/node";
 * const data = await readFile("some file");
 * const magika = await Magika.create();
 * const result = await magika.identifyBytes(data);
 * console.log(result.prediction.output.label);
 * ```
 * For a client-side implementation, please import `Magika` instead.
 *
 * Note that this `MagikaNode` class extends `Magika`, which means that all
 * public `Magika` APIs (e.g., `identifyBytes`) are available for `MagikaNode`
 * as well.
 *
 * Demos:
 * - Node: `<MAGIKA_REPO>/js/magika-cli.js`, which you can run with `yarn run bin -h`.
 * - Client-side: see `<MAGIKA_REPO>/website/src/components/FileClassifierDemo.vue`
 */
export declare class MagikaNode extends Magika {
    model_config: ModelConfigNode;
    model: ModelNode;
    protected constructor();
    /**
     * Factory method to create a Magika instance.
     *
     * @param {MagikaOptions} options The urls or file paths where the model and
     * its config are stored.
     *
     * Parameters are optional. If not provided, the model will be loaded from GitHub.
     */
    static create(options?: MagikaOptions): Promise<MagikaNode>;
    protected load(options?: MagikaOptions): Promise<void>;
    /**
     * Identifies the content type from a read stream
     *
     * @param {ReadStream} stream A read stream.
     * @param {number} length Total length of stream data.
     * @returns {MagikaResult} An object containing the result of the content type
     * prediction.
     */
    identifyStream(stream: ReadStream, length: number): Promise<MagikaResult>;
    private _identifyFromStream;
}
