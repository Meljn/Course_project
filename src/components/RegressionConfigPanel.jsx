import { useEffect, useRef, useState } from 'react';
import { CircleHelp, Minus, Plus } from 'lucide-react';
import {
  ACTIVATION_OPTIONS,
  BIAS_INITIALIZER_OPTIONS,
  OPTIMIZER_OPTIONS,
  REGRESSION_LIMITS,
  REGRESSION_LOSS_OPTIONS,
  REGULARIZATION_OPTIONS,
  WEIGHT_INITIALIZER_OPTIONS,
} from '../config/regressionConfig.js';
import SettingsSection from './SettingsSection.jsx';

const HELP_CONTENT = {
  panel: {
    title: 'Параметры регрессии',
    description:
      'Эти настройки задают структуру модели, способ обучения и предобработку числовых данных для задачи предсказания непрерывного значения.',
  },
  hiddenLayers: {
    title: 'Количество скрытых слоев',
    description:
      'Скрытые слои позволяют модели приближать нелинейные функции. Для синуса и multi-modal функции обычно нужно больше емкости, чем для простой зависимости.',
    items: [
      '1 слой подходит для простых гладких зависимостей.',
      '2-3 слоя лучше справляются с изгибами и локальными пиками.',
      'Слишком большая сеть может начать подстраиваться под шум.',
    ],
  },
  activation: {
    title: 'Функция активации',
    description:
      'Активация добавляет нелинейность. В регрессии скрытые слои используют нелинейную активацию, а выходной слой остается линейным.',
    items: [
      'tanh: хороший базовый выбор для нормализованных X.',
      'ReLU: быстро обучается, но может хуже описывать плавные отрицательные участки.',
      'sigmoid: ограничивает значения слоя диапазоном 0..1 и может обучаться медленнее.',
      'ELU: мягче ReLU на отрицательных значениях.',
    ],
  },
  loss: {
    title: 'Функция потерь',
    description:
      'Показывает, насколько предсказания отличаются от истинных значений. Именно ее модель минимизирует при обучении.',
    items: [
      'MSE сильнее штрафует крупные ошибки и часто дает гладкую аппроксимацию.',
      'MAE устойчивее к выбросам, но может давать менее гладкую сходимость.',
    ],
  },
  optimizer: {
    title: 'Оптимизатор',
    description:
      'Определяет, как обновляются веса после расчета ошибки и градиентов.',
    items: [
      'Adam обычно стабилен и подходит как выбор по умолчанию.',
      'SGD проще, но чувствительнее к learning rate.',
      'RMSprop часто устойчив на шумных функциях.',
    ],
  },
  kernelInitializer: {
    title: 'Инициализация весов',
    description:
      'Начальные веса влияют на скорость старта обучения и на то, насколько разные функции начнут изучать нейроны.',
    items: [
      'Glorot/Xavier хорошо подходит для tanh и sigmoid.',
      'He часто используют с ReLU.',
      'Zeros для весов обычно плохой учебный вариант: нейроны стартуют одинаковыми.',
    ],
  },
  useBias: {
    title: 'Смещения в слоях',
    description:
      'Смещение добавляется к сумме входов нейрона и помогает модели сдвигать аппроксимируемую функцию вверх, вниз или относительно внутренних границ активаций.',
    items: [
      'Включено: у каждого нейрона есть обучаемое смещение.',
      'Выключено: слой использует только веса, поэтому параметров меньше.',
      'В регрессии отсутствие смещений может заметно ограничить сдвиг функции.',
    ],
  },
  biasInitializer: {
    title: 'Инициализация смещений',
    description:
      'Смещения помогают сдвигать аппроксимируемую функцию вверх, вниз и по внутренним границам активаций.',
    items: [
      'Zeros - стандартный выбор.',
      'Ones и случайные значения могут менять начальное положение функции.',
    ],
  },
  useInitializerSeed: {
    title: 'Seed инициализации',
    description:
      'Фиксирует случайность при создании начальных весов и смещений. При одинаковом seed и одинаковых настройках регрессионная модель стартует из повторяемого состояния.',
    items: [
      'Включено: веса и случайные смещения создаются воспроизводимо.',
      'Выключено: TensorFlow.js выбирает случайную инициализацию как обычно.',
      'Seed влияет только на инициализацию модели, а не на шум или разбиение датасета.',
    ],
  },
  initializerSeed: {
    title: 'Значение seed',
    description:
      'Целое число, которое используется как база для генерации начальных весов и смещений. Для разных слоев seed немного смещается, чтобы слои не получали одинаковые случайные матрицы.',
  },
  learningRate: {
    title: 'Скорость обучения',
    description:
      'Размер шага обновления весов. В регрессии слишком большой шаг часто дает скачущий loss.',
    items: [
      'Меньше значение - стабильнее, но медленнее.',
      'Больше значение - быстрее, но выше риск расходимости.',
      'Для Adam обычно удобно начинать с 0.001-0.01.',
    ],
  },
  epochs: {
    title: 'Количество эпох',
    description:
      'Одна эпоха - полный проход по train-выборке. Чем больше эпох, тем дольше модель подстраивает функцию.',
    items: [
      'Недостаточно эпох: модель недообучается.',
      'Слишком много эпох: модель может начать повторять шум.',
      'Сравнивайте train loss и validation loss.',
    ],
  },
  batchSize: {
    title: 'Размер батча',
    description:
      'Количество примеров, после которых модель обновляет веса.',
    items: [
      'Маленький батч дает более шумное обучение.',
      'Большой батч сглаживает градиенты, но требует больше памяти.',
    ],
  },
  scaleY: {
    title: 'Scale Y',
    description:
      'Если включено, целевые значения Y стандартизируются перед обучением, а при выводе предсказаний возвращаются в исходный масштаб.',
    items: [
      'Часто ускоряет обучение, когда Y имеет большой диапазон.',
      'Графики и ручное предсказание показывают значения в исходном масштабе.',
      'Для простых функций можно сравнить поведение с включенным и выключенным Scale Y.',
    ],
  },
  regularization: {
    title: 'Метод регуляризации',
    description:
      'Штрафует модель за большие веса и помогает не подстраиваться слишком точно под шум.',
    items: [
      'Без регуляризации: модель свободнее подстраивается под данные.',
      'L1 может занулять часть весов.',
      'L2 мягко ограничивает большие веса.',
      'L1 + L2 сочетает оба подхода.',
    ],
  },
  regularizationRate: {
    title: 'Коэффициент регуляризации',
    description:
      'Сила штрафа за веса. Чем выше значение, тем сильнее ограничивается модель.',
    items: [
      'Слишком маленькое значение почти не влияет.',
      'Слишком большое мешает аппроксимировать функцию.',
      'Начинайте с 0.0001-0.001.',
    ],
  },
};

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="field-error">{message}</span>;
}

function InfoHint({ content }) {
  const [isOpen, setIsOpen] = useState(false);
  const hintRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!hintRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span className="info-hint" ref={hintRef}>
      <button
        type="button"
        className="info-button"
        aria-label={`Описание параметра: ${content.title}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <CircleHelp size={15} />
      </button>
      {isOpen && (
        <span className="info-popover" role="dialog" aria-label={content.title}>
          <strong>{content.title}</strong>
          <span>{content.description}</span>
          {content.items?.length > 0 && (
            <ul>
              {content.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </span>
      )}
    </span>
  );
}

function FieldLabel({ children, help }) {
  return (
    <span className="field-label">
      <span>{children}</span>
      {help && <InfoHint content={help} />}
    </span>
  );
}

function SelectField({ label, help, value, options, disabled, errorMessage, onChange }) {
  return (
    <div className="field">
      <FieldLabel help={help}>{label}</FieldLabel>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError message={errorMessage} />
    </div>
  );
}

function RegressionConfigPanel({
  config,
  validation,
  isTraining,
  onUpdate,
  onLayerCountChange,
  onLayerNeuronsChange,
}) {
  const isBiasEnabled = config.useBias !== false;

  return (
    <section className="config-panel">
      <div className="panel-title">
        <p className="eyebrow">Настройка</p>
        <h2>
          Параметры регрессии
          <InfoHint content={HELP_CONTENT.panel} />
        </h2>
      </div>

      <div className="settings-stack">
        <SettingsSection title="Архитектура" defaultOpen>
          <div className="form-block">
            <div className="field">
              <FieldLabel help={HELP_CONTENT.hiddenLayers}>Количество скрытых слоев</FieldLabel>
              <input
                type="number"
                min={REGRESSION_LIMITS.minHiddenLayers}
                max={REGRESSION_LIMITS.maxHiddenLayers}
                value={config.hiddenLayers.length}
                disabled={isTraining}
                onChange={(event) => onLayerCountChange(event.target.value)}
              />
              <FieldError message={validation.errors.hiddenLayers} />
            </div>

            <div className="layer-list">
              {config.hiddenLayers.map((neurons, index) => (
                <div className="layer-stepper" key={`regression-layer-${index}`}>
                  <span>Слой {index + 1}</span>
                  <button
                    type="button"
                    aria-label={`Уменьшить нейроны в слое ${index + 1}`}
                    disabled={isTraining || Number(neurons) <= REGRESSION_LIMITS.minNeurons}
                    onClick={() => onLayerNeuronsChange(index, Number(neurons) - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={REGRESSION_LIMITS.minNeurons}
                    max={REGRESSION_LIMITS.maxNeurons}
                    value={neurons}
                    disabled={isTraining}
                    onChange={(event) => onLayerNeuronsChange(index, event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`Увеличить нейроны в слое ${index + 1}`}
                    disabled={isTraining || Number(neurons) >= REGRESSION_LIMITS.maxNeurons}
                    onClick={() => onLayerNeuronsChange(index, Number(neurons) + 1)}
                  >
                    <Plus size={16} />
                  </button>
                  <FieldError message={validation.errors[`layer-${index}`]} />
                </div>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <SelectField
              label="Функция активации"
              help={HELP_CONTENT.activation}
              value={config.activation}
              options={ACTIVATION_OPTIONS}
              disabled={isTraining}
              onChange={(value) => onUpdate({ activation: value })}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Обучение" defaultOpen>
          <div className="form-grid">
            <SelectField
              label="Функция потерь"
              help={HELP_CONTENT.loss}
              value={config.loss}
              options={REGRESSION_LOSS_OPTIONS}
              disabled={isTraining}
              onChange={(value) => onUpdate({ loss: value })}
            />
            <SelectField
              label="Оптимизатор"
              help={HELP_CONTENT.optimizer}
              value={config.optimizer}
              options={OPTIMIZER_OPTIONS}
              disabled={isTraining}
              onChange={(value) => onUpdate({ optimizer: value })}
            />
            <div className="field">
              <FieldLabel help={HELP_CONTENT.learningRate}>Скорость обучения</FieldLabel>
              <input
                type="number"
                min={REGRESSION_LIMITS.minLearningRate}
                max={REGRESSION_LIMITS.maxLearningRate}
                step="0.0001"
                value={config.learningRate}
                disabled={isTraining}
                onChange={(event) => onUpdate({ learningRate: event.target.value })}
              />
              <FieldError message={validation.errors.learningRate} />
            </div>
            <div className="field">
              <FieldLabel help={HELP_CONTENT.epochs}>Количество эпох</FieldLabel>
              <input
                type="number"
                min={REGRESSION_LIMITS.minEpochs}
                max={REGRESSION_LIMITS.maxEpochs}
                value={config.epochs}
                disabled={isTraining}
                onChange={(event) => onUpdate({ epochs: event.target.value })}
              />
              <FieldError message={validation.errors.epochs} />
            </div>
            <div className="field">
              <FieldLabel help={HELP_CONTENT.batchSize}>Размер батча</FieldLabel>
              <input
                type="number"
                min={REGRESSION_LIMITS.minBatchSize}
                max={REGRESSION_LIMITS.maxBatchSize}
                value={config.batchSize}
                disabled={isTraining}
                onChange={(event) => onUpdate({ batchSize: event.target.value })}
              />
              <FieldError message={validation.errors.batchSize} />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Инициализация">
          <div className="form-grid">
            <SelectField
              label="Инициализация весов"
              help={HELP_CONTENT.kernelInitializer}
              value={config.kernelInitializer}
              options={WEIGHT_INITIALIZER_OPTIONS}
              disabled={isTraining}
              errorMessage={validation.errors.kernelInitializer}
              onChange={(value) => onUpdate({ kernelInitializer: value })}
            />
            <div className="field">
              <FieldLabel help={HELP_CONTENT.useBias}>Смещения в слоях</FieldLabel>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={isBiasEnabled}
                  disabled={isTraining}
                  onChange={(event) => onUpdate({ useBias: event.target.checked })}
                />
                <span>{isBiasEnabled ? 'Включены' : 'Отключены'}</span>
              </label>
            </div>
            <SelectField
              label="Инициализация смещений"
              help={HELP_CONTENT.biasInitializer}
              value={config.biasInitializer}
              options={BIAS_INITIALIZER_OPTIONS}
              disabled={isTraining || !isBiasEnabled}
              errorMessage={validation.errors.biasInitializer}
              onChange={(value) => onUpdate({ biasInitializer: value })}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Seed инициализации">
          <div className="form-grid">
            <div className="field">
              <FieldLabel help={HELP_CONTENT.useInitializerSeed}>Использовать seed</FieldLabel>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={Boolean(config.useInitializerSeed)}
                  disabled={isTraining}
                  onChange={(event) => onUpdate({ useInitializerSeed: event.target.checked })}
                />
                <span>{config.useInitializerSeed ? 'Включен' : 'Случайно'}</span>
              </label>
            </div>
            <div className="field">
              <FieldLabel help={HELP_CONTENT.initializerSeed}>Seed</FieldLabel>
              <input
                type="number"
                min={REGRESSION_LIMITS.minInitializerSeed}
                max={REGRESSION_LIMITS.maxInitializerSeed}
                step="1"
                value={config.initializerSeed}
                disabled={isTraining || !config.useInitializerSeed}
                onChange={(event) => onUpdate({ initializerSeed: event.target.value })}
              />
              <FieldError message={validation.errors.initializerSeed} />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Предобработка">
          <div className="form-grid">
            <div className="field">
              <FieldLabel help={HELP_CONTENT.scaleY}>Scale Y</FieldLabel>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={Boolean(config.scaleY)}
                  disabled={isTraining}
                  onChange={(event) => onUpdate({ scaleY: event.target.checked })}
                />
                <span>{config.scaleY ? 'Включено' : 'Выключено'}</span>
              </label>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Регуляризация">
          <div className="form-grid">
            <SelectField
              label="Метод регуляризации"
              help={HELP_CONTENT.regularization}
              value={config.regularization}
              options={REGULARIZATION_OPTIONS}
              disabled={isTraining}
              onChange={(value) => onUpdate({ regularization: value })}
            />
            <div className="field">
              <FieldLabel help={HELP_CONTENT.regularizationRate}>Коэффициент</FieldLabel>
              <input
                type="number"
                min="0.00001"
                max="0.1"
                step="0.0001"
                value={config.regularizationRate}
                disabled={isTraining || config.regularization === 'none'}
                onChange={(event) => onUpdate({ regularizationRate: event.target.value })}
              />
              <FieldError message={validation.errors.regularizationRate} />
            </div>
          </div>
        </SettingsSection>
      </div>
    </section>
  );
}

export default RegressionConfigPanel;
