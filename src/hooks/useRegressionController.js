import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_REGRESSION_CONFIG, getRegressionModelSignature } from '../config/regressionConfig.js';
import CSVDataLoader from '../core/CSVDataLoader.js';
import {
  createRegressionDataset,
  createRegressionDatasetFromConfiguredCsv,
  evaluateRegressionFunction,
} from '../core/regressionDatasets.js';
import { RegressionEngine } from '../core/regressionEngine.js';
import { validateRegressionConfig } from '../utils/regressionValidation.js';

const initialRegressionState = {
  status: 'idle',
  label: 'Модель не создана',
  currentEpoch: 0,
  loss: null,
  valLoss: null,
  message: 'Настройте параметры регрессии и создайте модель.',
};

function createDatasetForConfig(config) {
  return createRegressionDataset({
    type: config.datasetType,
    sampleCount: Number(config.sampleCount),
    noise: Number(config.noise),
    seed: Number(config.datasetSeed) || 42,
    scaleY: Boolean(config.scaleY),
  });
}

function getDatasetForConfig(config, customDataset) {
  if (config.datasetType === 'custom') {
    return customDataset;
  }

  return createDatasetForConfig(config);
}

function toNumber(value) {
  if (value === '') {
    return value;
  }

  return Number(value);
}

export function useRegressionController() {
  const engineRef = useRef(null);
  const modelSignatureRef = useRef('');
  const [config, setConfig] = useState(DEFAULT_REGRESSION_CONFIG);
  const [customSource, setCustomSource] = useState(null);
  const [pendingCsvUpload, setPendingCsvUpload] = useState(null);
  const customDataset = useMemo(() => {
    if (!customSource) {
      return null;
    }

    return createRegressionDatasetFromConfiguredCsv(customSource, {
      seed: Number(config.datasetSeed) || 42,
      scaleY: Boolean(config.scaleY),
    });
  }, [config.datasetSeed, config.scaleY, customSource]);
  const [dataset, setDataset] = useState(() => createDatasetForConfig(DEFAULT_REGRESSION_CONFIG));
  const [history, setHistory] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [trainingState, setTrainingState] = useState(initialRegressionState);

  if (!engineRef.current) {
    engineRef.current = new RegressionEngine();
  }

  const validation = useMemo(() => validateRegressionConfig(config, customDataset), [config, customDataset]);
  const currentSignature = useMemo(() => {
    const customSignature = config.datasetType === 'custom' ? customDataset?.signature ?? 'missing' : '';
    return `${getRegressionModelSignature(config)}|custom:${customSignature}`;
  }, [config, customDataset]);
  const modelIsCurrent = modelInfo && modelSignatureRef.current === currentSignature;
  const isTraining = trainingState.status === 'training' || trainingState.status === 'stopping';

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const nextDataset = getDatasetForConfig(config, customDataset);

    if (nextDataset) {
      setDataset(nextDataset);
    }

    if (!isTraining && modelInfo && modelSignatureRef.current !== currentSignature) {
      setDiagnostics([]);
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
      const nextLayers = Array.from({ length: Math.max(safeCount, 0) }, (_, index) => previous.hiddenLayers[index] ?? 8);

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
    setDiagnostics([]);
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
        message: 'Настройте столбцы датасета и нажмите OK, чтобы создать модель.',
      });
    } catch (error) {
      setTrainingState((state) => ({
        ...state,
        status: 'invalid',
        label: 'Ошибка CSV',
        message: error.message || 'Не удалось загрузить CSV-датасет.',
      }));
    }
  }, []);

  const cancelCsvDatasetSetup = useCallback(() => {
    setPendingCsvUpload(null);
  }, []);

  const confirmCsvDatasetSetup = useCallback(
    async (preparedDataset) => {
      const nextDataset = createRegressionDatasetFromConfiguredCsv(preparedDataset, {
        seed: Number(config.datasetSeed) || 42,
        scaleY: Boolean(config.scaleY),
      });
      const nextConfig = {
        ...config,
        datasetType: 'custom',
      };
      const nextSignature = `${getRegressionModelSignature(nextConfig)}|custom:${nextDataset.signature}`;

      engineRef.current.dispose();
      modelSignatureRef.current = '';

      const nextInfo = engineRef.current.createModel(nextConfig, nextDataset.featureCount);
      const nextParameters = await engineRef.current.getParameters();

      setPendingCsvUpload(null);
      setCustomSource(preparedDataset);
      setDataset(nextDataset);
      setModelInfo(nextInfo);
      setParameters(nextParameters);
      setDiagnostics([]);
      setHistory([]);
      setConfig(nextConfig);
      modelSignatureRef.current = nextSignature;
      setTrainingState({
        status: 'ready',
        label: 'CSV-модель создана',
        currentEpoch: 0,
        loss: null,
        valLoss: null,
        message: `Строк: ${nextDataset.rowCount}. Признаков после кодирования: ${nextDataset.featureCount}. Цель: ${nextDataset.targetColumnName}.`,
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

    if (!nextDataset) {
      return false;
    }

    const nextInfo = engineRef.current.createModel(config, nextDataset.featureCount);
    const nextParameters = await engineRef.current.getParameters();

    setDataset(nextDataset);
    setModelInfo(nextInfo);
    setParameters(nextParameters);
    setDiagnostics([]);
    setHistory([]);
    modelSignatureRef.current = currentSignature;
    setTrainingState({
      status: 'ready',
      label: 'Модель создана',
      currentEpoch: 0,
      loss: null,
      valLoss: null,
      message: `Параметров модели: ${nextInfo.trainableParams}.`,
    });

    return true;
  }, [config, currentSignature, customDataset, validation]);

  const startTraining = useCallback(async () => {
    if (isTraining) {
      return;
    }

    if (!validation.isValid) {
      setTrainingState((state) => ({
        ...state,
        status: 'invalid',
        label: 'Ошибка параметров',
        message: validation.messages[0],
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
    setHistory([]);
    setDiagnostics([]);
    setTrainingState({
      status: 'training',
      label: 'Обучение идет',
      currentEpoch: 0,
      loss: null,
      valLoss: null,
      message: 'TensorFlow.js обучает регрессионную модель в браузере.',
    });

    try {
      const result = await engineRef.current.train(config, nextDataset, {
        onEpochEnd: ({ epoch, loss, valLoss, parameters: nextParameters, diagnostics: nextDiagnostics }) => {
          const point = { epoch, loss, valLoss };
          setHistory((previous) => [...previous, point]);

          if (nextParameters) {
            setParameters(nextParameters);
          }

          setDiagnostics(nextDiagnostics);
          setTrainingState({
            status: 'training',
            label: 'Обучение идет',
            currentEpoch: epoch,
            loss,
            valLoss,
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
    setDiagnostics([]);
    setHistory([]);
    setDataset(getDatasetForConfig(config, customDataset) ?? createDatasetForConfig(config));
    setTrainingState({
      ...initialRegressionState,
      label: 'Состояние сброшено',
      message: 'Можно создать новую регрессионную модель.',
    });
  }, [config, customDataset]);

  const predictValue = useCallback(
    (rawInput) => {
      const activeDataset = getDatasetForConfig(config, customDataset) ?? dataset;
      const predicted = engineRef.current.predictRaw(rawInput, activeDataset);
      const actual =
        config.datasetType === 'custom' ? null : evaluateRegressionFunction(config.datasetType, Number(rawInput[0]));

      return {
        predicted,
        actual,
        residual: actual === null ? null : actual - predicted,
      };
    },
    [config, customDataset, dataset],
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
    diagnostics,
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
