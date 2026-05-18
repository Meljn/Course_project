import {
  CSV_LIMITS,
  dedupeColumnNames,
  isFiniteNumberString,
  makeDefaultColumnNames,
} from './CSVDataLoader.js';

function trimRows(rows) {
  return rows.map((row) => row.map((value) => String(value ?? '').trim()));
}

function hashObject(value) {
  const source = JSON.stringify(value);
  let hash = 5381;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

function uniqueValues(values) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const key = String(value);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
  });

  return result;
}

function ensureUniqueColumnNames(columnNames) {
  const normalized = columnNames.map((name) => String(name ?? '').trim());
  const emptyIndex = normalized.findIndex((name) => name === '');

  if (emptyIndex !== -1) {
    throw new Error(`Укажите имя для столбца ${emptyIndex + 1}.`);
  }

  const lowered = normalized.map((name) => name.toLowerCase());
  const duplicateIndex = lowered.findIndex((name, index) => lowered.indexOf(name) !== index);

  if (duplicateIndex !== -1) {
    throw new Error(`Имя столбца "${normalized[duplicateIndex]}" повторяется. Сделайте имена уникальными.`);
  }

  return normalized;
}

export function getRowsForHeaderMode(upload, hasHeader) {
  const rows = trimRows(upload?.rawRows ?? []);
  return hasHeader ? rows.slice(1) : rows;
}

export function getColumnNamesForHeaderMode(upload, hasHeader) {
  const rows = trimRows(upload?.rawRows ?? []);
  const columnCount = rows[0]?.length ?? 0;

  if (hasHeader) {
    return dedupeColumnNames(rows[0] ?? []);
  }

  return makeDefaultColumnNames(columnCount);
}

export function inferColumnKinds(dataRows, columnCount) {
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const values = dataRows.map((row) => row[columnIndex]);
    const isNumeric = values.every((value) => isFiniteNumberString(value));

    return {
      columnIndex,
      isNumeric,
      uniqueValues: uniqueValues(values),
    };
  });
}

function validateRows(dataRows, columnCount) {
  if (dataRows.length < CSV_LIMITS.minRows) {
    throw new Error(`CSV должен содержать минимум ${CSV_LIMITS.minRows} строк данных.`);
  }

  if (dataRows.length > CSV_LIMITS.maxRows) {
    throw new Error(`CSV должен содержать не больше ${CSV_LIMITS.maxRows} строк данных.`);
  }

  dataRows.forEach((row, rowIndex) => {
    if (row.length !== columnCount) {
      throw new Error(`Строка ${rowIndex + 1} содержит неверное количество колонок.`);
    }

    row.forEach((value, columnIndex) => {
      if (String(value ?? '').trim() === '') {
        throw new Error(`Пустая ячейка в строке ${rowIndex + 1}, колонка ${columnIndex + 1}.`);
      }
    });
  });
}

function buildFeatureMatrix(dataRows, columnNames, settings) {
  const targetIndex = Number(settings.targetIndex);
  const featureSettings = settings.featureSettings ?? {};
  const rawFeatures = dataRows.map(() => []);
  const featureColumnNames = [];
  const transforms = [];

  columnNames.forEach((columnName, columnIndex) => {
    if (columnIndex === targetIndex) {
      return;
    }

    const columnValues = dataRows.map((row) => row[columnIndex]);
    const configured = featureSettings[columnIndex] ?? {};
    const forcedCategorical = !columnValues.every((value) => isFiniteNumberString(value));
    const type = forcedCategorical ? 'categorical' : configured.type ?? 'continuous';
    const encoding = configured.encoding ?? 'oneHot';

    if (type === 'continuous') {
      const numericValues = columnValues.map((value, rowIndex) => {
        if (!isFiniteNumberString(value)) {
          throw new Error(`Столбец "${columnName}" содержит нечисловое значение в строке ${rowIndex + 1}.`);
        }

        return Number(value);
      });

      numericValues.forEach((value, rowIndex) => {
        rawFeatures[rowIndex].push(value);
      });
      featureColumnNames.push(columnName);
      transforms.push({ sourceColumn: columnName, type: 'continuous' });
      return;
    }

    const categories = uniqueValues(columnValues);

    if (encoding === 'label') {
      const categoryToIndex = new Map(categories.map((value, index) => [value, index]));
      columnValues.forEach((value, rowIndex) => {
        rawFeatures[rowIndex].push(categoryToIndex.get(value));
      });
      featureColumnNames.push(`${columnName}_label`);
      transforms.push({ sourceColumn: columnName, type: 'categorical', encoding: 'label', categories });
      return;
    }

    columnValues.forEach((value, rowIndex) => {
      categories.forEach((category) => {
        rawFeatures[rowIndex].push(value === category ? 1 : 0);
      });
    });
    categories.forEach((category) => {
      featureColumnNames.push(`${columnName}=${category}`);
    });
    transforms.push({ sourceColumn: columnName, type: 'categorical', encoding: 'oneHot', categories });
  });

  if (featureColumnNames.length === 0) {
    throw new Error('Выберите хотя бы один независимый признак.');
  }

  return {
    rawFeatures,
    featureColumnNames,
    transforms,
  };
}

export function buildConfiguredCsvDataset(upload, settings, task) {
  const rawRows = trimRows(upload?.rawRows ?? []);
  const hasHeader = Boolean(settings.hasHeader);
  const dataRows = getRowsForHeaderMode({ rawRows }, hasHeader);
  const columnCount = rawRows[0]?.length ?? 0;
  const columnNames = ensureUniqueColumnNames(settings.columnNames ?? getColumnNamesForHeaderMode({ rawRows }, hasHeader));
  const targetIndex = Number(settings.targetIndex);

  if (columnCount < CSV_LIMITS.minColumns || columnCount > CSV_LIMITS.maxColumns) {
    throw new Error(`CSV должен содержать от ${CSV_LIMITS.minColumns} до ${CSV_LIMITS.maxColumns} столбцов.`);
  }

  if (columnNames.length !== columnCount) {
    throw new Error('Количество имен столбцов не совпадает с количеством колонок CSV.');
  }

  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= columnCount) {
    throw new Error('Выберите целевую колонку.');
  }

  validateRows(dataRows, columnCount);

  const targetColumnName = columnNames[targetIndex];
  const targetValues = dataRows.map((row) => row[targetIndex]);
  const { rawFeatures, featureColumnNames, transforms } = buildFeatureMatrix(dataRows, columnNames, settings);
  const base = {
    task,
    hasHeader,
    columnNames,
    targetColumnName,
    rawFeatures,
    featureColumnNames,
    rowCount: dataRows.length,
    transforms,
  };

  if (task === 'regression') {
    const rawTargets = targetValues.map((value, rowIndex) => {
      if (!isFiniteNumberString(value)) {
        throw new Error(`Целевая колонка "${targetColumnName}" должна быть числовой. Ошибка в строке ${rowIndex + 1}.`);
      }

      return Number(value);
    });

    return {
      ...base,
      rawTargets,
      signature: hashObject({ ...base, rawTargets }),
    };
  }

  const classNames = uniqueValues(targetValues);

  if (classNames.length < 2) {
    throw new Error(`Колонка "${targetColumnName}" должна содержать минимум два класса.`);
  }

  const classToIndex = new Map(classNames.map((value, index) => [value, index]));
  const classIndices = targetValues.map((value) => classToIndex.get(value));

  return {
    ...base,
    classNames,
    classCount: classNames.length,
    classIndices,
    signature: hashObject({ ...base, classNames, classIndices }),
  };
}
