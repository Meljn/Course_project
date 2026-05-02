import { Minus, Plus } from 'lucide-react';
import {
  ACTIVATION_OPTIONS,
  LIMITS,
  LOSS_OPTIONS,
  OPTIMIZER_OPTIONS,
  REGULARIZATION_OPTIONS,
} from '../config/trainingConfig.js';

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="field-error">{message}</span>;
}

function SelectField({ label, value, options, disabled, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
        <h2>Параметры нейросети</h2>
      </div>

      <div className="form-block">
        <label className="field">
          <span>Количество скрытых слоев</span>
          <input
            type="number"
            min={LIMITS.minHiddenLayers}
            max={LIMITS.maxHiddenLayers}
            value={config.hiddenLayers.length}
            disabled={isTraining}
            onChange={(event) => onLayerCountChange(event.target.value)}
          />
          <FieldError message={validation.errors.hiddenLayers} />
        </label>

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
          value={config.activation}
          options={ACTIVATION_OPTIONS}
          disabled={isTraining}
          onChange={(value) => onUpdate({ activation: value })}
        />
        <SelectField
          label="Функция потерь"
          value={config.loss}
          options={LOSS_OPTIONS}
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
        <label className="field">
          <span>Скорость обучения</span>
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
        </label>
        <label className="field">
          <span>Количество эпох</span>
          <input
            type="number"
            min={LIMITS.minEpochs}
            max={LIMITS.maxEpochs}
            value={config.epochs}
            disabled={isTraining}
            onChange={(event) => onUpdate({ epochs: event.target.value })}
          />
          <FieldError message={validation.errors.epochs} />
        </label>
        <label className="field">
          <span>Размер батча</span>
          <input
            type="number"
            min={LIMITS.minBatchSize}
            max={LIMITS.maxBatchSize}
            value={config.batchSize}
            disabled={isTraining}
            onChange={(event) => onUpdate({ batchSize: event.target.value })}
          />
          <FieldError message={validation.errors.batchSize} />
        </label>
      </div>

      <div className="form-grid">
        <SelectField
          label="Метод регуляризации"
          value={config.regularization}
          options={REGULARIZATION_OPTIONS}
          disabled={isTraining}
          onChange={(value) => onUpdate({ regularization: value })}
        />
        <label className="field">
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
        </label>
      </div>
    </section>
  );
}

export default ConfigPanel;
