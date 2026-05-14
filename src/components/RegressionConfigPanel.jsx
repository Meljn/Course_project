import { Minus, Plus } from 'lucide-react';
import {
  ACTIVATION_OPTIONS,
  BIAS_INITIALIZER_OPTIONS,
  OPTIMIZER_OPTIONS,
  REGRESSION_LIMITS,
  REGRESSION_LOSS_OPTIONS,
  REGULARIZATION_OPTIONS,
  WEIGHT_INITIALIZER_OPTIONS,
} from '../config/regressionConfig.js';

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="field-error">{message}</span>;
}

function SelectField({ label, value, options, disabled, errorMessage, onChange }) {
  return (
    <div className="field">
      <span>{label}</span>
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
  return (
    <section className="config-panel">
      <div className="panel-title">
        <p className="eyebrow">Настройка</p>
        <h2>Параметры регрессии</h2>
      </div>

      <div className="form-block">
        <div className="field">
          <span>Количество скрытых слоев</span>
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
          value={config.activation}
          options={ACTIVATION_OPTIONS}
          disabled={isTraining}
          onChange={(value) => onUpdate({ activation: value })}
        />
        <SelectField
          label="Функция потерь"
          value={config.loss}
          options={REGRESSION_LOSS_OPTIONS}
          disabled={isTraining}
          onChange={(value) => onUpdate({ loss: value })}
        />
        <SelectField
          label="Оптимизатор"
          value={config.optimizer}
          options={OPTIMIZER_OPTIONS}
          disabled={isTraining}
          onChange={(value) => onUpdate({ optimizer: value })}
        />
      </div>

      <div className="form-grid">
        <SelectField
          label="Инициализация весов"
          value={config.kernelInitializer}
          options={WEIGHT_INITIALIZER_OPTIONS}
          disabled={isTraining}
          errorMessage={validation.errors.kernelInitializer}
          onChange={(value) => onUpdate({ kernelInitializer: value })}
        />
        <SelectField
          label="Инициализация смещений"
          value={config.biasInitializer}
          options={BIAS_INITIALIZER_OPTIONS}
          disabled={isTraining}
          errorMessage={validation.errors.biasInitializer}
          onChange={(value) => onUpdate({ biasInitializer: value })}
        />
      </div>

      <div className="form-grid">
        <div className="field">
          <span>Скорость обучения</span>
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
          <span>Количество эпох</span>
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
          <span>Размер батча</span>
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
        <div className="field">
          <span>Scale Y</span>
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

      <div className="form-grid">
        <SelectField
          label="Метод регуляризации"
          value={config.regularization}
          options={REGULARIZATION_OPTIONS}
          disabled={isTraining}
          onChange={(value) => onUpdate({ regularization: value })}
        />
        <div className="field">
          <span>Коэффициент</span>
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

export default RegressionConfigPanel;
