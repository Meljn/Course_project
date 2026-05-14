import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { formatMetric } from '../utils/formatters.js';

function RegressionPredictionPanel({ dataset, modelInfo, modelIsCurrent, onPredict }) {
  const [values, setValues] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const nextValues = (dataset?.xScaler ?? []).map((stat) => formatMetric(stat.mean, 3));
    setValues(nextValues);
    setResult(null);
    setError('');
  }, [dataset?.signature, dataset?.featureCount]);

  const updateValue = (index, value) => {
    setValues((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const handlePredict = () => {
    try {
      const numericValues = values.map((value) => Number(value));

      if (numericValues.some((value) => !Number.isFinite(value))) {
        throw new Error('Введите числовые значения для всех признаков.');
      }

      setResult(onPredict(numericValues));
      setError('');
    } catch (predictError) {
      setResult(null);
      setError(predictError.message || 'Не удалось выполнить предсказание.');
    }
  };

  return (
    <div className="prediction-panel">
      <div className="prediction-grid">
        {(dataset?.featureColumnNames ?? ['x']).map((name, index) => (
          <label className="field" key={name}>
            <span>{name}</span>
            <input
              type="number"
              step="0.01"
              value={values[index] ?? ''}
              disabled={!modelInfo}
              onChange={(event) => updateValue(index, event.target.value)}
            />
          </label>
        ))}
      </div>

      <button type="button" className="button button-primary prediction-button" disabled={!modelInfo} onClick={handlePredict}>
        <Calculator size={18} />
        Предсказать
      </button>

      {!modelInfo && <div className="validation-box">Создайте и обучите модель перед ручным предсказанием.</div>}
      {modelInfo && !modelIsCurrent && (
        <div className="validation-box">Параметры изменены. Для актуального результата пересоздайте модель.</div>
      )}
      {error && <div className="validation-box" role="alert">{error}</div>}

      {result && (
        <div className="prediction-result">
          <div>
            <span>Предсказание</span>
            <strong>{formatMetric(result.predicted, 5)}</strong>
          </div>
          <div>
            <span>Истинная функция</span>
            <strong>{result.actual === null ? 'нет для CSV' : formatMetric(result.actual, 5)}</strong>
          </div>
          <div>
            <span>Ошибка</span>
            <strong>{result.residual === null ? 'нет данных' : formatMetric(result.residual, 5)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegressionPredictionPanel;
