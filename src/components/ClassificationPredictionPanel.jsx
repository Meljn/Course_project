import { useEffect, useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { formatMetric } from '../utils/formatters.js';

function getPredictionFields(dataset) {
  if (dataset?.type === 'custom' && Array.isArray(dataset.transforms) && dataset.transforms.length > 0) {
    return dataset.transforms.map((transform, index) => {
      if (transform.type === 'categorical') {
        return {
          key: `${transform.sourceColumn}-${index}`,
          name: transform.sourceColumn,
          kind: 'categorical',
          encoding: transform.encoding,
          categories: transform.categories ?? [],
          defaultValue: transform.categories?.[0] ?? '',
        };
      }

      const encodedIndex = dataset.featureColumnNames?.findIndex((name) => name === transform.sourceColumn) ?? index;
      const fallbackValue = dataset.stats?.[encodedIndex]?.mean ?? 0;

      return {
        key: `${transform.sourceColumn}-${index}`,
        name: transform.sourceColumn,
        kind: 'continuous',
        defaultValue: formatMetric(fallbackValue, 3),
      };
    });
  }

  return (dataset?.featureColumnNames ?? ['x', 'y']).map((name, index) => ({
    key: `${name}-${index}`,
    name,
    kind: 'continuous',
    defaultValue: index === 0 || index === 1 ? '0' : '',
  }));
}

function encodePredictionValues(fields, values) {
  const rawInput = [];

  fields.forEach((field, index) => {
    const value = values[index];

    if (field.kind === 'continuous') {
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        throw new Error(`Введите числовое значение для "${field.name}".`);
      }

      rawInput.push(numericValue);
      return;
    }

    const selectedCategory = String(value ?? '');
    const categoryIndex = field.categories.indexOf(selectedCategory);

    if (categoryIndex === -1) {
      throw new Error(`Выберите категорию для "${field.name}".`);
    }

    if (field.encoding === 'label') {
      rawInput.push(categoryIndex);
      return;
    }

    field.categories.forEach((category) => {
      rawInput.push(category === selectedCategory ? 1 : 0);
    });
  });

  return rawInput;
}

function ClassificationPredictionPanel({ dataset, modelInfo, modelIsCurrent, onPredict }) {
  const fields = useMemo(() => getPredictionFields(dataset), [dataset]);
  const [values, setValues] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setValues(fields.map((field) => field.defaultValue));
    setResult(null);
    setError('');
  }, [dataset?.signature, fields]);

  const updateValue = (index, value) => {
    setValues((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const handlePredict = () => {
    try {
      const rawInput = encodePredictionValues(fields, values);
      setResult(onPredict(rawInput));
      setError('');
    } catch (predictError) {
      setResult(null);
      setError(predictError.message || 'Не удалось выполнить предсказание.');
    }
  };

  return (
    <div className="prediction-panel classification-prediction-panel">
      <div className="prediction-grid">
        {fields.map((field, index) => (
          <label className="field" key={field.key}>
            <span>{field.name}</span>
            {field.kind === 'categorical' ? (
              <select
                value={values[index] ?? ''}
                disabled={!modelInfo}
                onChange={(event) => updateValue(index, event.target.value)}
              >
                {field.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                step="0.01"
                value={values[index] ?? ''}
                disabled={!modelInfo}
                onChange={(event) => updateValue(index, event.target.value)}
              />
            )}
          </label>
        ))}
      </div>

      <button type="button" className="button button-primary prediction-button" disabled={!modelInfo} onClick={handlePredict}>
        <Calculator size={18} />
        Предсказать класс
      </button>

      {!modelInfo && <div className="validation-box">Создайте модель перед ручным предсказанием.</div>}
      {modelInfo && !modelIsCurrent && (
        <div className="validation-box">Параметры изменены. Для актуального результата пересоздайте модель.</div>
      )}
      {error && <div className="validation-box" role="alert">{error}</div>}

      {result && (
        <div className="classification-result">
          <div className="classification-result__main">
            <span>Предсказанный класс</span>
            <strong>{result.predictedClass}</strong>
          </div>
          <div className="class-probabilities">
            {result.probabilities.map((item) => (
              <div className="class-probability" key={item.className}>
                <span>
                  {item.className}
                  <strong>{formatMetric(item.probability * 100, 1)}%</strong>
                </span>
                <i style={{ width: `${Math.max(0, Math.min(item.probability * 100, 100))}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClassificationPredictionPanel;
