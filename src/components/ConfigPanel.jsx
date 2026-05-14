import { useEffect, useRef, useState } from 'react';
import { CircleHelp, Minus, Plus } from 'lucide-react';
import {
  ACTIVATION_OPTIONS,
  BIAS_INITIALIZER_OPTIONS,
  LIMITS,
  LOSS_OPTIONS,
  OPTIMIZER_OPTIONS,
  REGULARIZATION_OPTIONS,
  WEIGHT_INITIALIZER_OPTIONS,
} from '../config/trainingConfig.js';

const HELP_CONTENT = {
  panel: {
    title: 'Параметры нейросети',
    description:
      'Эти настройки определяют архитектуру модели, способ обучения и начальное состояние весов. При изменении таких параметров модель нужно создать заново.',
  },
  hiddenLayers: {
    title: 'Количество скрытых слоев',
    description:
      'Скрытые слои находятся между входом и выходом сети. Чем их больше, тем более сложные зависимости может выучить модель, но тем выше риск переобучения и медленнее обучение.',
    items: [
      '1 слой подходит для простых разделяющих границ.',
      '2-3 слоя обычно достаточно для учебных двумерных задач.',
      'Слишком много слоев для маленького датасета может ухудшить обобщение.',
    ],
  },
  layerNeurons: {
    title: 'Нейроны в скрытом слое',
    description:
      'Нейрон преобразует входные признаки через веса, смещение и функцию активации. Количество нейронов задает емкость конкретного слоя.',
    items: [
      'Мало нейронов: модель может не уловить форму данных.',
      'Больше нейронов: модель гибче, но может запоминать шум.',
      'Для XOR и круга часто хватает 4-8 нейронов.',
    ],
  },
  activation: {
    title: 'Функция активации',
    description:
      'Активация добавляет нелинейность. Без нее несколько Dense-слоев свелись бы почти к одной линейной модели.',
    items: [
      'tanh: выдает значения от -1 до 1, хорошо работает с нормализованными признаками.',
      'ReLU: обнуляет отрицательные значения и быстро обучается, но часть нейронов может перестать обновляться.',
      'sigmoid: сжимает значения в диапазон 0..1, но на глубоких сетях может замедлять обучение.',
      'ELU: похожа на ReLU, но мягче работает с отрицательными значениями.',
    ],
  },
  loss: {
    title: 'Функция потерь',
    description:
      'Функция потерь измеряет ошибку модели. Оптимизатор изменяет веса так, чтобы это значение уменьшалось.',
    items: [
      'Binary crossentropy: основной выбор для бинарной классификации с выходом sigmoid.',
      'Mean squared error: измеряет среднеквадратичную ошибку; чаще используется в регрессии, но может работать и здесь.',
    ],
  },
  optimizer: {
    title: 'Оптимизатор',
    description:
      'Оптимизатор решает, как именно менять веса после расчета ошибки и градиентов.',
    items: [
      'Adam: адаптивный и устойчивый вариант по умолчанию.',
      'SGD: простой градиентный спуск; сильнее зависит от скорости обучения.',
      'RMSprop: адаптирует шаги по параметрам, часто стабилен на шумных данных.',
    ],
  },
  kernelInitializer: {
    title: 'Инициализация весов',
    description:
      'Инициализация задает стартовые значения весов. От нее зависит, насколько быстро сеть начнет учиться и не окажутся ли нейроны в одинаковом состоянии.',
    items: [
      'Glorot/Xavier: универсальный выбор для tanh и sigmoid.',
      'He: часто лучше для ReLU и похожих функций.',
      'LeCun: полезен для некоторых нормализованных входов и self-normalizing подходов.',
      'Random normal/uniform: случайные значения без учета архитектуры.',
      'Zeros: учебный вариант; обычно плох для весов, потому что нейроны стартуют одинаковыми.',
    ],
  },
  biasInitializer: {
    title: 'Инициализация смещений',
    description:
      'Смещение добавляется к взвешенной сумме перед активацией и помогает двигать границу решения.',
    items: [
      'Zeros: стандартный и безопасный выбор для большинства задач.',
      'Ones: может быстрее сдвинуть активации, но иногда мешает старту.',
      'Random normal/uniform: добавляет случайность в стартовые смещения.',
      'Truncated normal: случайные значения без слишком больших выбросов.',
    ],
  },
  learningRate: {
    title: 'Скорость обучения',
    description:
      'Определяет размер шага при обновлении весов. Это один из самых чувствительных параметров обучения.',
    items: [
      'Слишком маленькая: обучение идет медленно.',
      'Слишком большая: loss может прыгать или расти.',
      'Для Adam обычно разумно начинать с 0.001-0.03.',
    ],
  },
  epochs: {
    title: 'Количество эпох',
    description:
      'Эпоха означает один полный проход по обучающей выборке. Больше эпох дает модели больше попыток подстроить веса.',
    items: [
      'Мало эпох: модель может недообучиться.',
      'Слишком много эпох: может появиться переобучение.',
      'Сравнивайте train loss и test loss, чтобы видеть разрыв.',
    ],
  },
  batchSize: {
    title: 'Размер батча',
    description:
      'Батч задает, сколько примеров используется перед одним обновлением весов.',
    items: [
      'Маленький батч дает шумные, но частые обновления.',
      'Большой батч дает более стабильный градиент, но требует больше памяти.',
      'Для небольших учебных датасетов 8-32 обычно достаточно.',
    ],
  },
  stopByAccuracy: {
    title: 'Остановка по точности',
    description:
      'Если включено, обучение завершается раньше заданного числа эпох, когда точность на test-наборе достигает выбранного порога.',
    items: [
      'Помогает не тратить время после достижения нужного качества.',
      'Используется test accuracy, а не train accuracy.',
      'Проверка выполняется после каждой завершенной эпохи.',
    ],
  },
  targetAccuracy: {
    title: 'Целевая точность',
    description:
      'Порог accuracy, при достижении которого обучение остановится автоматически.',
    items: [
      '95% означает, что не менее 95 из 100 test-примеров классифицированы правильно.',
      'Слишком высокий порог может быть недостижимым на шумных данных.',
      'Если критерий выключен, это поле не влияет на обучение.',
    ],
  },
  regularization: {
    title: 'Метод регуляризации',
    description:
      'Регуляризация штрафует модель за слишком большие веса и помогает снизить переобучение.',
    items: [
      'Без регуляризации: модель учится только по ошибке.',
      'L1: подталкивает часть весов к нулю.',
      'L2: мягко ограничивает большие веса.',
      'L1 + L2: сочетает оба штрафа.',
    ],
  },
  regularizationRate: {
    title: 'Коэффициент регуляризации',
    description:
      'Задает силу штрафа за веса. Чем больше коэффициент, тем сильнее модель ограничивает веса.',
    items: [
      'Слишком маленький почти не влияет.',
      'Слишком большой мешает модели обучаться.',
      'Начинайте с малых значений вроде 0.0001-0.001.',
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
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
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

function ConfigPanel({
  config,
  validation,
  isTraining,
  onUpdate,
  onLayerCountChange,
  onLayerNeuronsChange,
}) {
  return (
    <section className="config-panel">
      <div className="panel-title">
        <p className="eyebrow">Настройка</p>
        <h2>
          Параметры нейросети
          <InfoHint content={HELP_CONTENT.panel} />
        </h2>
      </div>

      <div className="form-block">
        <div className="field">
          <FieldLabel help={HELP_CONTENT.hiddenLayers}>Количество скрытых слоев</FieldLabel>
          <input
            type="number"
            min={LIMITS.minHiddenLayers}
            max={LIMITS.maxHiddenLayers}
            value={config.hiddenLayers.length}
            disabled={isTraining}
            onChange={(event) => onLayerCountChange(event.target.value)}
          />
          <FieldError message={validation.errors.hiddenLayers} />
        </div>

        <div className="layer-list">
          {config.hiddenLayers.map((neurons, index) => (
            <div className="layer-stepper" key={`layer-${index}`}>
              <span>Слой {index + 1}</span>
              <button
                type="button"
                aria-label={`Уменьшить нейроны в слое ${index + 1}`}
                disabled={isTraining || Number(neurons) <= LIMITS.minNeurons}
                onClick={() => onLayerNeuronsChange(index, Number(neurons) - 1)}
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                min={LIMITS.minNeurons}
                max={LIMITS.maxNeurons}
                value={neurons}
                disabled={isTraining}
                onChange={(event) => onLayerNeuronsChange(index, event.target.value)}
              />
              <button
                type="button"
                aria-label={`Увеличить нейроны в слое ${index + 1}`}
                disabled={isTraining || Number(neurons) >= LIMITS.maxNeurons}
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
        <SelectField
          label="Функция потерь"
          help={HELP_CONTENT.loss}
          value={config.loss}
          options={LOSS_OPTIONS}
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
      </div>

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
        <SelectField
          label="Инициализация смещений"
          help={HELP_CONTENT.biasInitializer}
          value={config.biasInitializer}
          options={BIAS_INITIALIZER_OPTIONS}
          disabled={isTraining}
          errorMessage={validation.errors.biasInitializer}
          onChange={(value) => onUpdate({ biasInitializer: value })}
        />
      </div>

      <div className="form-grid">
        <div className="field">
          <FieldLabel help={HELP_CONTENT.learningRate}>Скорость обучения</FieldLabel>
          <input
            type="number"
            min={LIMITS.minLearningRate}
            max={LIMITS.maxLearningRate}
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
            min={LIMITS.minEpochs}
            max={LIMITS.maxEpochs}
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
            min={LIMITS.minBatchSize}
            max={LIMITS.maxBatchSize}
            value={config.batchSize}
            disabled={isTraining}
            onChange={(event) => onUpdate({ batchSize: event.target.value })}
          />
          <FieldError message={validation.errors.batchSize} />
        </div>
        <div className="field">
          <FieldLabel help={HELP_CONTENT.stopByAccuracy}>Остановка по точности</FieldLabel>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={Boolean(config.stopByAccuracy)}
              disabled={isTraining}
              onChange={(event) => onUpdate({ stopByAccuracy: event.target.checked })}
            />
            <span>{config.stopByAccuracy ? 'Включена' : 'Выключена'}</span>
          </label>
        </div>
        <div className="field">
          <FieldLabel help={HELP_CONTENT.targetAccuracy}>Целевая точность, %</FieldLabel>
          <input
            type="number"
            min={Math.round(LIMITS.minTargetAccuracy * 100)}
            max={Math.round(LIMITS.maxTargetAccuracy * 100)}
            step="1"
            value={config.targetAccuracy === '' ? '' : Math.round(Number(config.targetAccuracy) * 100)}
            disabled={isTraining || !config.stopByAccuracy}
            onChange={(event) =>
              onUpdate({
                targetAccuracy: event.target.value === '' ? '' : Number(event.target.value) / 100,
              })
            }
          />
          <FieldError message={validation.errors.targetAccuracy} />
        </div>
      </div>

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
    </section>
  );
}

export default ConfigPanel;
