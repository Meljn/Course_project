const DEFAULT_OPTIONS = {
  onLoadSuccess: () => {},
  onError: () => {},
  papa: null,
  tf: null,
};

function isFiniteNumberString(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return false;
  }

  const number = Number(trimmed);
  return Number.isFinite(number);
}

function stripBom(value) {
  return value.replace(/^\uFEFF/, '');
}

function makeDefaultColumnNames(columnCount) {
  return Array.from({ length: columnCount }, (_, index) => `column${index + 1}`);
}

function dedupeColumnNames(names) {
  const usedNames = new Map();

  return names.map((rawName, index) => {
    const fallbackName = `column${index + 1}`;
    const baseName = String(rawName ?? '').trim() || fallbackName;
    const count = usedNames.get(baseName) ?? 0;
    usedNames.set(baseName, count + 1);

    if (count === 0) {
      return baseName;
    }

    return `${baseName}_${count + 1}`;
  });
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r\n|\n|\r/).find((line) => line.trim() !== '') ?? '';
  const candidates = [',', ';', '\t'];
  let bestDelimiter = ',';
  let bestCount = -1;

  for (const delimiter of candidates) {
    let count = 0;
    let inQuotes = false;

    for (let index = 0; index < firstLine.length; index += 1) {
      const char = firstLine[index];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        count += 1;
      }
    }

    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function fallbackParseCsv(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  const pushRow = () => {
    row.push(cell);

    if (row.some((value) => value.trim() !== '')) {
      rows.push(row);
    }

    row = [];
    cell = '';
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1;
      }

      pushRow();
    } else {
      cell += char;
    }
  }

  if (inQuotes) {
    throw new Error('CSV содержит незакрытую кавычку.');
  }

  if (cell !== '' || row.length > 0) {
    pushRow();
  }

  return rows;
}

function normalizeRows(rows) {
  return rows
    .filter((row) => Array.isArray(row))
    .map((row, rowIndex) =>
      row.map((value, columnIndex) => {
        const stringValue = String(value ?? '');
        return rowIndex === 0 && columnIndex === 0 ? stripBom(stringValue) : stringValue;
      }),
    )
    .filter((row) => row.some((value) => value.trim() !== ''));
}

function detectHeader(firstRow) {
  return firstRow.some((value) => {
    const trimmed = value.trim();
    return trimmed !== '' && !isFiniteNumberString(trimmed);
  });
}

function calculateStats(data, columnNames) {
  return columnNames.map((columnName, columnIndex) => {
    const values = data.map((row) => row[columnIndex]);
    const sum = values.reduce((total, value) => total + value, 0);

    return {
      column: columnName,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: sum / values.length,
    };
  });
}

export class CSVDataLoader {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    this.data = [];
    this.columnNames = [];
    this.stats = [];
    this.featureShape = [0, 0];
    this.inputElement = null;
    this.lastError = null;
  }

  upload() {
    if (typeof document === 'undefined') {
      return Promise.reject(this.handleError('Загрузка CSV-файла доступна только в браузере.'));
    }

    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.style.display = 'none';
      this.inputElement = input;

      const cleanup = () => {
        input.remove();
        this.inputElement = null;
      };

      input.addEventListener(
        'change',
        async () => {
          const file = input.files?.[0];
          cleanup();

          if (!file) {
            resolve(null);
            return;
          }

          if (!file.name.toLowerCase().endsWith('.csv')) {
            const error = this.handleError('Выберите файл с расширением .csv.');
            reject(error);
            return;
          }

          try {
            const csvText = await this.readFile(file);
            const result = this.loadFromText(csvText);
            this.options.onLoadSuccess(this.getData(), this.getColumnNames());
            resolve(result);
          } catch (error) {
            const handledError = this.handleError(error.message);
            reject(handledError);
          }
        },
        { once: true },
      );

      document.body.appendChild(input);
      input.click();
    });
  }

  loadFromText(csvText) {
    if (typeof csvText !== 'string' || csvText.trim() === '') {
      throw new Error('CSV-файл пуст.');
    }

    const parsedRows = this.parse(csvText);
    const normalizedRows = normalizeRows(parsedRows);
    const { data, columnNames } = this.validateAndTransform(normalizedRows);

    this.data = data;
    this.columnNames = columnNames;
    this.stats = calculateStats(data, columnNames);
    this.featureShape = [data.length, columnNames.length];
    this.lastError = null;

    return {
      data: this.getData(),
      columnNames: this.getColumnNames(),
      stats: this.getStats(),
      featureShape: this.getFeatureShape(),
    };
  }

  getData(options = {}) {
    if (options.format === 'tf.data.Dataset' || options.format === 'tfDataset') {
      return this.toTensorFlowDataset();
    }

    return this.data.map((row) => [...row]);
  }

  getColumnNames() {
    return [...this.columnNames];
  }

  getStats() {
    return this.stats.map((item) => ({ ...item }));
  }

  getFeatureShape() {
    return [...this.featureShape];
  }

  toTensorFlowDataset() {
    const tf = this.options.tf ?? globalThis.tf;

    if (!tf?.data?.array) {
      throw new Error('TensorFlow.js не найден. Подключите tfjs или используйте getData() для получения массива.');
    }

    return tf.data.array(this.getData());
  }

  parse(csvText) {
    const papa = this.options.papa ?? globalThis.Papa;

    if (papa?.parse) {
      const result = papa.parse(csvText, {
        dynamicTyping: false,
        skipEmptyLines: 'greedy',
      });

      if (result.errors?.length) {
        const firstError = result.errors[0];
        const rowInfo = Number.isInteger(firstError.row) ? ` Строка: ${firstError.row + 1}.` : '';
        throw new Error(`Ошибка разбора CSV: ${firstError.message}.${rowInfo}`);
      }

      return result.data;
    }

    return fallbackParseCsv(csvText);
  }

  validateAndTransform(rows) {
    if (rows.length === 0) {
      throw new Error('CSV-файл не содержит данных.');
    }

    const columnCount = rows[0].length;

    if (columnCount < 2) {
      throw new Error('CSV должен содержать минимум 2 колонки.');
    }

    rows.forEach((row, index) => {
      if (row.length !== columnCount) {
        throw new Error(
          `Строка ${index + 1} содержит ${row.length} колонок, ожидалось ${columnCount}. Проверьте разделители CSV.`,
        );
      }
    });

    const hasHeader = detectHeader(rows[0]);
    const rawColumnNames = hasHeader ? rows[0] : makeDefaultColumnNames(columnCount);
    const columnNames = dedupeColumnNames(rawColumnNames);
    const dataRows = hasHeader ? rows.slice(1) : rows;

    if (dataRows.length < 10) {
      throw new Error('CSV должен содержать минимум 10 строк данных.');
    }

    const data = dataRows.map((row, rowIndex) =>
      row.map((value, columnIndex) => {
        const trimmed = value.trim();
        const readableRow = hasHeader ? rowIndex + 2 : rowIndex + 1;
        const readableColumn = columnNames[columnIndex];

        if (trimmed === '') {
          throw new Error(`Пустая ячейка в строке ${readableRow}, колонка "${readableColumn}".`);
        }

        if (!isFiniteNumberString(trimmed)) {
          throw new Error(
            `Некорректное числовое значение "${value}" в строке ${readableRow}, колонка "${readableColumn}". Допустимы только числа.`,
          );
        }

        return Number(trimmed);
      }),
    );

    return {
      data,
      columnNames,
    };
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener('load', () => resolve(String(reader.result ?? '')));
      reader.addEventListener('error', () => reject(new Error('Не удалось прочитать CSV-файл.')));
      reader.readAsText(file, 'utf-8');
    });
  }

  handleError(message) {
    const error = new Error(message || 'Неизвестная ошибка загрузки CSV.');
    this.lastError = error.message;
    this.options.onError(error.message);
    return error;
  }
}

export default CSVDataLoader;

/*
Пример использования:

import CSVDataLoader from './core/CSVDataLoader.js';

const loader = new CSVDataLoader({
  onLoadSuccess: (data, columnNames) => {
    console.log('CSV загружен:', data);
    console.log('Колонки:', columnNames);
    console.log('Форма признаков:', loader.getFeatureShape());
    console.log('Статистика:', loader.getStats());

    // Если последняя колонка является целевой переменной:
    // const xs = data.map((row) => row.slice(0, -1));
    // const ys = data.map((row) => [row[row.length - 1]]);
    // const inputTensor = tf.tensor2d(xs);
    // const labelTensor = tf.tensor2d(ys);
  },
  onError: (errorMessage) => {
    console.error(errorMessage);
  },
});

document.querySelector('#uploadCsvButton').addEventListener('click', () => {
  loader.upload();
});

// Также можно получить tf.data.Dataset, если TensorFlow.js подключен глобально:
// const dataset = loader.getData({ format: 'tfDataset' });
*/
