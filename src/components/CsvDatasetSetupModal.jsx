import { useEffect, useMemo, useState } from 'react';
import {
  buildConfiguredCsvDataset,
  getColumnNamesForHeaderMode,
  getRowsForHeaderMode,
  inferColumnKinds,
} from '../core/csvDatasetBuilder.js';

function getInitialFeatureSettings(dataRows, columnCount, targetIndex) {
  const inferred = inferColumnKinds(dataRows, columnCount);
  const settings = {};

  inferred.forEach((column) => {
    if (column.columnIndex === targetIndex) {
      return;
    }

    settings[column.columnIndex] = {
      type: column.isNumeric ? 'continuous' : 'categorical',
      encoding: 'oneHot',
    };
  });

  return settings;
}

function CsvDatasetSetupModal({ upload, task, isOpen, onCancel, onConfirm }) {
  const [columnNames, setColumnNames] = useState([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const [featureSettings, setFeatureSettings] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  const hasHeader = Boolean(upload?.hasHeader);
  const dataRows = useMemo(() => getRowsForHeaderMode(upload, hasHeader), [upload, hasHeader]);
  const columnCount = upload?.rawRows?.[0]?.length ?? 0;
  const inferredColumns = useMemo(
    () => inferColumnKinds(dataRows, columnCount),
    [columnCount, dataRows],
  );
  const targetLabel = task === 'regression' ? 'Зависимая переменная' : 'Метка класса';

  useEffect(() => {
    if (!upload || !isOpen) {
      return;
    }

    const nextColumnNames = getColumnNamesForHeaderMode(upload, hasHeader);
    const nextTargetIndex = Math.max(nextColumnNames.length - 1, 0);
    const nextDataRows = getRowsForHeaderMode(upload, hasHeader);

    setColumnNames(nextColumnNames);
    setTargetIndex(nextTargetIndex);
    setFeatureSettings(getInitialFeatureSettings(nextDataRows, nextColumnNames.length, nextTargetIndex));
    setErrorMessage('');
  }, [hasHeader, isOpen, upload]);

  if (!isOpen || !upload) {
    return null;
  }

  const updateColumnName = (index, value) => {
    setColumnNames((previous) => previous.map((name, columnIndex) => (columnIndex === index ? value : name)));
  };

  const updateFeatureSetting = (columnIndex, patch) => {
    setFeatureSettings((previous) => ({
      ...previous,
      [columnIndex]: {
        type: 'continuous',
        encoding: 'oneHot',
        ...(previous[columnIndex] ?? {}),
        ...patch,
      },
    }));
  };

  const handleTargetChange = (nextTargetIndex) => {
    const numericTargetIndex = Number(nextTargetIndex);

    setTargetIndex(numericTargetIndex);
    setFeatureSettings(getInitialFeatureSettings(dataRows, columnCount, numericTargetIndex));
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    try {
      const preparedDataset = buildConfiguredCsvDataset(
        upload,
        {
          hasHeader,
          columnNames,
          targetIndex,
          featureSettings,
        },
        task,
      );

      await onConfirm(preparedDataset);
    } catch (error) {
      setErrorMessage(error.message || 'Не удалось подготовить датасет.');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="csv-modal" role="dialog" aria-modal="true" aria-label="Настройка CSV-датасета">
        <div className="csv-modal__header">
          <div>
            <p className="eyebrow">CSV dataset</p>
            <h2>Настройка датасета</h2>
          </div>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Закрыть окно">
            x
          </button>
        </div>

        <div className="csv-modal__summary">
          <span>{hasHeader ? 'Шапка CSV определена автоматически' : 'Имена столбцов созданы автоматически'}</span>
          <span>{dataRows.length} строк данных</span>
          <span>{columnCount} столбцов</span>
        </div>

        <div className="field">
          <span>{targetLabel}</span>
          <select value={targetIndex} onChange={(event) => handleTargetChange(event.target.value)}>
            {columnNames.map((name, index) => (
              <option key={`${name}-${index}`} value={index}>
                {name || `column${index + 1}`}
              </option>
            ))}
          </select>
        </div>

        <div className="csv-config-grid">
          <div className="csv-config-grid__head">Столбец</div>
          <div className="csv-config-grid__head">Роль</div>
          <div className="csv-config-grid__head">Тип признака</div>
          <div className="csv-config-grid__head">Преобразование</div>

          {columnNames.map((name, index) => {
            const inferred = inferredColumns[index] ?? { isNumeric: false, uniqueValues: [] };
            const isTarget = index === Number(targetIndex);
            const setting = featureSettings[index] ?? {
              type: inferred.isNumeric ? 'continuous' : 'categorical',
              encoding: 'oneHot',
            };
            const type = inferred.isNumeric ? setting.type : 'categorical';

            return (
              <div className={`csv-config-row${isTarget ? ' is-target' : ''}`} key={`csv-column-${index}`}>
                <label className="field csv-name-field">
                  <span>Имя</span>
                  <input value={name} onChange={(event) => updateColumnName(index, event.target.value)} />
                </label>

                <div className="csv-role">
                  {isTarget ? targetLabel : 'Независимая переменная'}
                </div>

                <div className="field">
                  <span>Тип</span>
                  <select
                    value={isTarget ? 'target' : type}
                    disabled={isTarget || !inferred.isNumeric}
                    onChange={(event) => updateFeatureSetting(index, { type: event.target.value })}
                  >
                    {isTarget ? (
                      <option value="target">Целевая колонка</option>
                    ) : (
                      <>
                        <option value="continuous">Непрерывная</option>
                        <option value="categorical">Категориальная</option>
                      </>
                    )}
                  </select>
                  {!isTarget && !inferred.isNumeric && <small>Определена как категориальная</small>}
                </div>

                <div className="field">
                  <span>Encoding</span>
                  <select
                    value={setting.encoding ?? 'oneHot'}
                    disabled={isTarget || type !== 'categorical'}
                    onChange={(event) => updateFeatureSetting(index, { encoding: event.target.value })}
                  >
                    <option value="oneHot">One-Hot Encoding</option>
                    <option value="label">Label Encoding</option>
                  </select>
                  {!isTarget && type === 'categorical' && (
                    <small>{inferred.uniqueValues.length} категорий</small>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="csv-preview-table">
          <strong>Первые строки</strong>
          <div>
            <table>
              <tbody>
                {dataRows.slice(0, 4).map((row, rowIndex) => (
                  <tr key={`preview-${rowIndex}`}>
                    {row.map((value, columnIndex) => (
                      <td key={`${rowIndex}-${columnIndex}`}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {errorMessage && <div className="modal-error">{errorMessage}</div>}

        <div className="csv-modal__actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="primary-button" onClick={handleSubmit}>
            OK, создать модель
          </button>
        </div>
      </section>
    </div>
  );
}

export default CsvDatasetSetupModal;
