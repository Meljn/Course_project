import * as tf from '@tensorflow/tfjs';

function createRegularizer(config) {
  const rate = Number(config.regularizationRate);

  if (config.regularization === 'l1') {
    return tf.regularizers.l1({ l1: rate });
  }

  if (config.regularization === 'l2') {
    return tf.regularizers.l2({ l2: rate });
  }

  if (config.regularization === 'l1l2') {
    return tf.regularizers.l1l2({ l1: rate, l2: rate });
  }

  return undefined;
}

function createOptimizer(name, learningRate) {
  if (name === 'sgd') {
    return tf.train.sgd(learningRate);
  }

  if (name === 'rmsprop') {
    return tf.train.rmsprop(learningRate);
  }

  return tf.train.adam(learningRate);
}

function denseLayerName(index, totalLayers) {
  if (index === totalLayers - 1) {
    return 'Выходной слой';
  }

  return `Скрытый слой ${index + 1}`;
}

export class NeuralNetworkEngine {
  constructor() {
    this.model = null;
    this.inputUnits = 2;
    this.isTraining = false;
    this.stopRequested = false;
  }

  dispose() {
    if (this.model) {
      this.model.optimizer?.dispose?.();
      this.model.dispose();
    }

    this.model = null;
    this.inputUnits = 2;
    this.isTraining = false;
    this.stopRequested = false;
  }

  createModel(config, inputUnits = 2) {
    this.dispose();

    const safeInputUnits = Math.max(2, Math.trunc(Number(inputUnits)) || 2);
    const hiddenLayers = config.hiddenLayers.map((neurons) => Number(neurons));
    const model = tf.sequential();
    const regularizer = createRegularizer(config);
    const kernelInitializer = config.kernelInitializer || 'glorotUniform';
    const useBias = config.useBias !== false;
    const biasInitializer = config.biasInitializer || 'zeros';
    this.inputUnits = safeInputUnits;

    hiddenLayers.forEach((neurons, index) => {
      model.add(
        tf.layers.dense({
          units: neurons,
          inputShape: index === 0 ? [safeInputUnits] : undefined,
          activation: config.activation,
          kernelInitializer,
          useBias,
          biasInitializer,
          kernelRegularizer: regularizer,
        }),
      );
    });

    model.add(
      tf.layers.dense({
        units: 1,
        activation: 'sigmoid',
        kernelInitializer,
        useBias,
        biasInitializer,
      }),
    );

    model.compile({
      optimizer: createOptimizer(config.optimizer, Number(config.learningRate)),
      loss: config.loss,
    });

    this.model = model;

    return {
      inputUnits: safeInputUnits,
      hiddenLayers,
      outputUnits: 1,
      trainableParams: model.countParams(),
    };
  }

  stopTraining() {
    this.stopRequested = true;

    if (this.model) {
      this.model.stopTraining = true;
    }
  }

  async getParameters() {
    if (!this.model) {
      return [];
    }

    const totalLayers = this.model.layers.length;

    return Promise.all(
      this.model.layers.map(async (layer, index) => {
        const [kernelTensor, biasTensor] = layer.getWeights();
        const weights = kernelTensor ? await kernelTensor.array() : [];
        const biases = biasTensor ? await biasTensor.array() : [];
        const toUnits = weights[0]?.length ?? biases.length;

        return {
          id: `dense-${index}`,
          name: denseLayerName(index, totalLayers),
          fromUnits: weights.length,
          toUnits,
          weights,
          biases,
        };
      }),
    );
  }

  evaluateAccuracy(xs, ys) {
    if (!this.model) {
      return 0;
    }

    const predictionTensor = this.model.predict(xs);
    const predictions = Array.from(predictionTensor.dataSync());
    const labels = Array.from(ys.dataSync());
    predictionTensor.dispose();

    const correct = predictions.reduce((total, value, index) => {
      const predictedLabel = value >= 0.5 ? 1 : 0;
      return total + (predictedLabel === labels[index] ? 1 : 0);
    }, 0);

    return correct / Math.max(labels.length, 1);
  }

  getDecisionGrid(resolution = 96, baselineFeatures = []) {
    if (!this.model) {
      return null;
    }

    const size = Math.max(24, Math.min(Number(resolution) || 96, 128));
    const baseline = Array.from({ length: this.inputUnits }, (_, index) => {
      const value = Number(baselineFeatures[index]);
      return Number.isFinite(value) ? value : 0;
    });
    const points = [];

    for (let row = 0; row < size; row += 1) {
      const y = 1 - (row / Math.max(size - 1, 1)) * 2;

      for (let column = 0; column < size; column += 1) {
        const x = -1 + (column / Math.max(size - 1, 1)) * 2;
        const input = [...baseline];
        input[0] = x;
        input[1] = y;
        points.push(input);
      }
    }

    const inputTensor = tf.tensor2d(points, [points.length, this.inputUnits]);
    const predictionTensor = this.model.predict(inputTensor);
    const probabilities = Array.from(predictionTensor.dataSync());
    inputTensor.dispose();
    predictionTensor.dispose();

    return {
      resolution: size,
      probabilities,
    };
  }

  async train(config, dataset, callbacks = {}) {
    if (!this.model) {
      throw new Error('Модель еще не создана.');
    }

    this.isTraining = true;
    this.stopRequested = false;
    this.model.stopTraining = false;

    const trainXs = tf.tensor2d(dataset.train.inputs);
    const trainYs = tf.tensor2d(dataset.train.labels);
    const testXs = tf.tensor2d(dataset.test.inputs);
    const testYs = tf.tensor2d(dataset.test.labels);
    const epochs = Number(config.epochs);
    const batchSize = Number(config.batchSize);
    const shouldStopByAccuracy = Boolean(config.stopByAccuracy);
    const targetAccuracy = Number(config.targetAccuracy);
    const parameterInterval = epochs > 500 ? 8 : epochs > 250 ? 4 : 1;

    try {
      for (let epoch = 0; epoch < epochs; epoch += 1) {
        if (this.stopRequested) {
          break;
        }

        const result = await this.model.fit(trainXs, trainYs, {
          epochs: 1,
          batchSize,
          shuffle: true,
          validationData: [testXs, testYs],
          verbose: 0,
        });

        const loss = result.history.loss?.[0] ?? null;
        const valLoss = result.history.val_loss?.[0] ?? null;
        const accuracy = this.evaluateAccuracy(testXs, testYs);
        const shouldUpdateParameters =
          epoch === 0 || epoch + 1 === epochs || (epoch + 1) % parameterInterval === 0;
        const parameters = shouldUpdateParameters ? await this.getParameters() : null;
        const decisionGrid = this.getDecisionGrid(96, dataset.decisionBaseline);

        callbacks.onEpochEnd?.({
          epoch: epoch + 1,
          loss,
          valLoss,
          accuracy,
          parameters,
          decisionGrid,
        });

        if (this.stopRequested) {
          break;
        }

        if (shouldStopByAccuracy && Number.isFinite(targetAccuracy) && accuracy >= targetAccuracy) {
          await tf.nextFrame();
          return {
            status: 'accuracy-reached',
            epoch: epoch + 1,
            accuracy,
            targetAccuracy,
          };
        }

        await tf.nextFrame();
      }

      return {
        status: this.stopRequested ? 'stopped' : 'completed',
      };
    } finally {
      trainXs.dispose();
      trainYs.dispose();
      testXs.dispose();
      testYs.dispose();
      this.isTraining = false;
      this.model.stopTraining = false;
    }
  }
}
