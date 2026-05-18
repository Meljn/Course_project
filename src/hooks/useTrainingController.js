import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG, getModelSignature } from '../config/trainingConfig.js';
import CSVDataLoader from '../core/CSVDataLoader.js';
import { EMPTY_DATASET, createCustomDatasetFromConfiguredCsv } from '../core/customDataset.js';
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

function getDatasetForConfig(config, customDataset) {
  if (config.datasetType === 'custom') {
    return customDataset ?? EMPTY_DATASET;
  }

  return createDatasetForConfig(config);
}

function withCustomValidation(config, customDataset) {
  const check = validateTrainingConfig(config);
  const errors = { ...check.errors };

  if (config.datasetType === 'custom') {
    delete errors.sampleCount;
    delete errors.noise;

    if (errors.batchSize === 'Размер батча не может превышать количество примеров.') {
      delete errors.batchSize;
    }

    if (!customDataset) {
      errors.customDataset = 'Загрузите CSV-датасет перед созданием модели.';
    } else if (Number(config.batchSize) > customDataset.rowCount) {
      errors.batchSize = 'Размер батча не может превышать количество примеров.';
    }
  }

  const messages = Object.values(errors);

  return {
    errors,
    messages,
    isValid: messages.length === 0,
  };
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
  const [customDataset, setCustomDataset] = useState(null);
  const [pendingCsvUpload, setPendingCsvUpload] = useState(null);
  const [history, setHistory] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [decisionGrid, setDecisionGrid] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [trainingState, setTrainingState] = useState(initialTrainingState);

  if (!engineRef.current) {
    engineRef.current = new NeuralNetworkEngine();
  }

  const validation = useMemo(() => withCustomValidation(config, customDataset), [config, customDataset]);
  const currentSignature = useMemo(() => {
    const customSignature = config.datasetType === 'custom' ? customDataset?.signature ?? 'missing' : '';
    return `${getModelSignature(config)}|custom:${customSignature}`;
  }, [config, customDataset]);
  const modelIsCurrent = modelInfo && modelSignatureRef.current === currentSignature;
  const isTraining = trainingState.status === 'training' || trainingState.status === 'stopping';

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    setDataset(getDatasetForConfig(config, customDataset));

    if (!isTraining && modelInfo && modelSignatureRef.current !== currentSignature) {
      setDecisionGrid(null);
      setTrainingState((state) => ({
        ...state,
        status: 'dirty',
        label: 'Параметры изменены',
        message: 'Создайте модель заново или запустите обучение для пересборки.',
      }));
    }
  }, [config, currentSignature, customDataset, isTraining, modelInfo]);

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

  const uploadCsvDataset = useCallback(async () => {
    const loader = new CSVDataLoader({
      onError: (message) => {
        setTrainingState((state) => ({
          ...state,
          status: 'invalid',
          label: 'Ошибка CSV',
          message,
        }));
      },
    });

    try {
      const result = await loader.upload();

      if (!result) {
        return;
      }

      setPendingCsvUpload(result);
      setTrainingState({
        status: 'ready',
        label: 'CSV загружен',
        currentEpoch: 0,
        loss: null,
        valLoss: null,
        accuracy: null,
        message: 'Настройте столбцы датасета и нажмите OK, чтобы создать модель.',
      });
    } catch (error) {
      const message = error.message || 'Не удалось загрузить CSV-датасет.';
      setTrainingState((state) => ({
        ...state,
        status: 'invalid',
        label: 'Ошибка CSV',
        message,
      }));
    }
  }, []);

  const cancelCsvDatasetSetup = useCallback(() => {
    setPendingCsvUpload(null);
  }, []);

  const confirmCsvDatasetSetup = useCallback(
    async (preparedDataset) => {
      const nextDataset = createCustomDatasetFromConfiguredCsv(preparedDataset, {
        seed: Number(config.datasetSeed) || 42,
      });
      const nextConfig = {
        ...config,
        datasetType: 'custom',
      };
      const nextSignature = `${getModelSignature(nextConfig)}|custom:${nextDataset.signature}`;

      engineRef.current.dispose();
      modelSignatureRef.current = '';

      const nextInfo = engineRef.current.createModel(
        nextConfig,
        nextDataset.featureCount,
        nextDataset.outputUnits,
      );
      const nextParameters = await engineRef.current.getParameters();
      const nextDecisionGrid = null;

      setPendingCsvUpload(null);
      setCustomDataset(nextDataset);
      setDataset(nextDataset);
      setModelInfo(nextInfo);
      setParameters(nextParameters);
      setDecisionGrid(nextDecisionGrid);
      setHistory([]);
      setConfig(nextConfig);
      modelSignatureRef.current = nextSignature;
      setTrainingState({
        status: 'ready',
        label: 'CSV-модель создана',
        currentEpoch: 0,
        loss: null,
        valLoss: null,
        accuracy: null,
        message: `Строк: ${nextDataset.rowCount}. Признаков после кодирования: ${nextDataset.featureCount}. Классов: ${nextDataset.classCount}.`,
      });
    },
    [config],
  );

  const createModel = useCallback(async () => {
    const check = validation;

    if (!check.isValid) {
      setTrainingState((state) => ({
        ...state,
        status: 'invalid',
        label: 'Ошибка параметров',
        message: check.messages[0],
      }));
      return false;
    }

    const nextDataset = getDatasetForConfig(config, customDataset);
    const nextInfo = engineRef.current.createModel(config, nextDataset.featureCount, nextDataset.outputUnits ?? 1);
    const nextParameters = await engineRef.current.getParameters();
    const nextDecisionGrid =
      nextDataset.type === 'custom' ? null : engineRef.current.getDecisionGrid(96, nextDataset.decisionBaseline);

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
  }, [config, currentSignature, customDataset, validation]);

  const startTraining = useCallback(async () => {
    if (isTraining) {
      return;
    }

    const check = validation;

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

    const nextDataset = getDatasetForConfig(config, customDataset);
    setDataset(nextDataset);
    setDecisionGrid(nextDataset.type === 'custom' ? null : engineRef.current.getDecisionGrid(96, nextDataset.decisionBaseline));
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
        label:
          result.status === 'completed'
            ? 'Обучение завершено'
            : result.status === 'accuracy-reached'
              ? 'Целевая точность достигнута'
              : 'Обучение остановлено',
        message:
          result.status === 'completed'
            ? 'Модель прошла заданное количество эпох.'
            : result.status === 'accuracy-reached'
              ? `Точность достигла ${Math.round(Number(result.accuracy) * 100)}% на эпохе ${result.epoch}.`
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
  }, [config, createModel, customDataset, isTraining, modelIsCurrent, validation]);

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
    setDataset(getDatasetForConfig(config, customDataset));
    setTrainingState({
      ...initialTrainingState,
      label: 'Состояние сброшено',
      message: 'Можно создать новую модель.',
    });
  }, [config, customDataset]);

  const predictValue = useCallback(
    (rawInput) => {
      const activeDataset = getDatasetForConfig(config, customDataset);
      return engineRef.current.predictRaw(rawInput, activeDataset);
    },
    [config, customDataset],
  );

  return {
    config,
    updateConfig,
    setHiddenLayerCount,
    setLayerNeurons,
    generateDataset,
    uploadCsvDataset,
    pendingCsvUpload,
    confirmCsvDatasetSetup,
    cancelCsvDatasetSetup,
    validation,
    dataset,
    customDatasetInfo: customDataset,
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
    predictValue,
  };
}
