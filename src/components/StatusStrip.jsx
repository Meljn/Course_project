import { formatMetric, formatPercent } from '../utils/formatters.js';

function StatusStrip({ config, trainingState, modelInfo, modelIsCurrent }) {
  const progress = Math.min(100, Math.round((trainingState.currentEpoch / Math.max(Number(config.epochs), 1)) * 100));

  return (
    <section className="status-strip" aria-label="Текущее состояние обучения">
      <div className="status-strip__row">
        <div>
          <span>Эпоха</span>
          <strong>
            {trainingState.currentEpoch}/{config.epochs}
          </strong>
        </div>
        <div>
          <span>Train loss</span>
          <strong>{formatMetric(trainingState.loss)}</strong>
        </div>
        <div>
          <span>Test loss</span>
          <strong>{formatMetric(trainingState.valLoss)}</strong>
        </div>
        <div>
          <span>Точность</span>
          <strong>{formatPercent(trainingState.accuracy)}</strong>
        </div>
        <div>
          <span>Параметры</span>
          <strong>{modelInfo ? modelInfo.trainableParams : 0}</strong>
        </div>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className={modelIsCurrent ? 'model-current' : 'model-dirty'}>
        {modelIsCurrent ? 'Модель соответствует настройкам' : 'Модель нужно создать или обновить'}
      </p>
    </section>
  );
}

export default StatusStrip;
