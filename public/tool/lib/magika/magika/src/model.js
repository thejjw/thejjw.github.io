// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import tf from "./tf-shim.js";
export class Model {
    model_config;
    model;
    constructor(model_config) {
        this.model_config = model_config;
    }
    async loadUrl(modelURL) {
        if (!this.model) {
            this.model = await tf.loadGraphModel(modelURL);
        }
    }
    async predict(features) {
        if (!this.model) {
            throw new Error("model has not been loaded");
        }
        let features_array = features.toArray();
        const modelInput = tf.tensor([features_array], [1, features_array.length], "int32");
        const modelOutput = tf.squeeze((await this.model.executeAsync(modelInput)));
        const maxScoreIndexTensor = tf.argMax(modelOutput);
        const maxScoreIndex = maxScoreIndexTensor.dataSync()[0];
        const rawScores = modelOutput.dataSync();
        maxScoreIndexTensor.dispose();
        modelInput.dispose();
        modelOutput.dispose();
        const maxScoreLabel = this.model_config.target_labels_space[maxScoreIndex];
        const maxScore = rawScores[maxScoreIndex];
        if (rawScores.length != this.model_config.target_labels_space.length) {
            throw new Error(`Assertion failed: Expected rawScores.length (${rawScores.length}) to have the same length of the targets_label_space (${this.model_config.target_labels_space.length})`);
        }
        let scores_map = {};
        for (let i = 0; i < rawScores.length; i++) {
            const label = this.model_config.target_labels_space[i];
            const score = rawScores[i];
            scores_map[label] = score;
        }
        return { label: maxScoreLabel, score: maxScore, scores_map: scores_map };
    }
}
