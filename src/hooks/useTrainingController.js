import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG, getModelSignature } from '../config/trainingConfig.js';
import { createDataset } from '../core/datasets.js';
import { NeuralNetworkEngine } from '../core/neuralNetworkEngine.js';
import { validateTrainingConfig } from '../utils/validation.js';

const initialTrainingState = {
  status: 'idle',
  label: 'Модель не создана',
  currentEpoch: 0,
  loss: null,
  valLoss: null,
  accuracy: null,
  message: 'Настройте параметры и создайте нейросеть.',
};

function createDatasetForConfig(config) {
  return createDataset({
    type: config.datasetType,
    sampleCount: Number(config.sampleCount),
    noise: Number(config.noise),
    seed: Number(config.datasetSeed) || 42,
  });
}

function toNumber(value) {
  if (value === '') {
    return value;
  }

  return Number(value);
}

export function useTrainingController() {
  const engineRef = useRef(null);
  const modelSignatureRef = useRef('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [dataset, setDataset] = useState(() => createDatasetForConfig(DEFAULT_CONFIG));
  const [history, setHistory] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [decisionGrid, setDecisionGrid] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [trainingState, setTrainingState] = useState(initialTrainingState);

  if (!engineRef.current) {
    engineRef.current = new NeuralNetworkEngine();
  }

  const validation = useMemo(() => validateTrainingConfig(config), [config]);
  const currentSignature = useMemo(() => getModelSignature(config), [config]);
  const modelIsCurrent = modelInfo && modelSignatureRef.current === currentSignature;
  const isTraining = trainingState.status === 'training' || trainingState.status === 'stopping';

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    setDataset(createDatasetForConfig(config));

    if (!isTraining && modelInfo && modelSignatureRef.current !== currentSignature) {
      setDecisionGrid(null);
      setTrainingState((state) => ({
        ...state,
        status: 'dirty',
        label: 'Параметры изменены',
        message: 'Создайте модель заново или запустите обучение для пересборки.',
      }));
    }
  }, [config, currentSignature, isTraining, modelInfo]);

  const updateConfig = useCallback((patch) => {
    setConfig((previous) => ({
      ...previous,
      ...patch,
    }));
  }, []);

  const setHiddenLayerCount = useCallback((count) => {
    const nextCount = Math.trunc(Number(count));

    setConfig((previous) => {
      const safeCount = Number.isFinite(nextCount) ? nextCount : previous.hiddenLayers.length;
      const nextLayers = Array.from({ length: Math.max(safeCount, 0) }, (_, index) => previous.hiddenLayers[index] ?? 4);

      return {
        ...previous,
        hiddenLayers: nextLayers,
      };
    });
  }, []);

  const setLayerNeurons = useCallback((index, value) => {
    setConfig((previous) => {
      const nextLayers = [...previous.hiddenLayers];
      nextLayers[index] = toNumber(value);

      return {
        ...previous,
        hiddenLayers: nextLayers,
      };
    });
  }, []);

  const generateDataset = useCallback(() => {
    setConfig((previous) => ({
      ...previous,
      datasetSeed: Date.now(),
    }));
    setHistory([]);
    setDecisionGrid(null);
  }, []);

  const createModel = useCallback(async () => {
    const check = validateTrainingConfig(config);

    if (!check.isValid) {
      setTrainingState((state) => ({
        ...state,
        status: 'invalid',
        label: 'Ошибка параметров',
        message: check.messages[0],
      }));
      return false;
    }

    const nextDataset = createDatasetForConfig(config);
    const nextInfo = engineRef.current.createModel(config);
    const nextParameters = await engineRef.current.getParameters();
    const nextDecisionGrid = engineRef.current.getDecisionGrid();

    setDataset(nextDataset);
    setModelInfo(nextInfo);
    setParameters(nextParameters);
    setDecisionGrid(nextDecisionGrid);
    setHistory([]);
    modelSignatureRef.current = currentSignature;
    setTrainingState({
      status: 'ready',
      label: 'Модель создана',
      currentEpoch: 0,
      loss: null,
      valLoss: null,
      accuracy: null,
      message: `Параметров модели: ${nextInfo.trainableParams}.`,
    });

    return true;
  }, [config, currentSignature]);

  const startTraining = useCallback(async () => {
    if (isTraining) {
      return;
    }

    const check = validateTrainingConfig(config);

    if (!check.isValid) {
      setTrainingState((state) => ({
        ...state,
        status: 'invalid',
        label: 'Ошибка параметров',
        message: check.messages[0],
      }));
      return;
    }

    let canTrain = true;

    if (!modelIsCurrent) {
      canTrain = await createModel();
    }

    if (!canTrain) {
      return;
    }

    const nextDataset = createDatasetForConfig(config);
    setDataset(nextDataset);
    setDecisionGrid(engineRef.current.getDecisionGrid());
    setHistory([]);
    setTrainingState({
      status: 'training',
      label: 'Обучение идет',
      currentEpoch: 0,
      loss: null,
      valLoss: null,
      accuracy: null,
      message: 'TensorFlow.js обучает модель в браузере.',
    });

    try {
      const result = await engineRef.current.train(config, nextDataset, {
        onEpochEnd: ({ epoch, loss, valLoss, accuracy, parameters: nextParameters, decisionGrid: nextDecisionGrid }) => {
          const point = { epoch, loss, valLoss, accuracy };
          setHistory((previous) => [...previous, point]);

          if (nextParameters) {
            setParameters(nextParameters);
          }

          if (nextDecisionGrid) {
            setDecisionGrid(nextDecisionGrid);
          }

          setTrainingState({
            status: 'training',
            label: 'Обучение идет',
            currentEpoch: epoch,
            loss,
            valLoss,
            accuracy,
            message: `Эпоха ${epoch} из ${config.epochs}.`,
          });
        },
      });

      setTrainingState((state) => ({
        ...state,
        status: result.status,
        label: result.status === 'completed' ? 'Обучение завершено' : 'Обучение остановлено',
        message:
          result.status === 'completed'
            ? 'Модель прошла заданное количество эпох.'
            : 'Процесс остановлен пользователем.',
      }));
    } catch (error) {
      setTrainingState((state) => ({
        ...state,
        status: 'error',
        label: 'Ошибка обучения',
        message: error.message,
      }));
    }
  }, [config, createModel, isTraining, modelIsCurrent]);

  const stopTraining = useCallback(() => {
    engineRef.current.stopTraining();
    setTrainingState((state) => ({
      ...state,
      status: 'stopping',
      label: 'Остановка',
      message: 'Обучение завершится после текущей эпохи.',
    }));
  }, []);

  const resetTraining = useCallback(() => {
    engineRef.current.dispose();
    modelSignatureRef.current = '';
    setModelInfo(null);
    setParameters([]);
    setDecisionGrid(null);
    setHistory([]);
    setDataset(createDatasetForConfig(config));
    setTrainingState({
      ...initialTrainingState,
      label: 'Состояние сброшено',
      message: 'Можно создать новую модель.',
    });
  }, [config]);

  return {
    config,
    updateConfig,
    setHiddenLayerCount,
    setLayerNeurons,
    generateDataset,
    validation,
    dataset,
    decisionGrid,
    history,
    parameters,
    modelInfo,
    modelIsCurrent,
    trainingState,
    isTraining,
    createModel,
    startTraining,
    stopTraining,
    resetTraining,
  };
}
