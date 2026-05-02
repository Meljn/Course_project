# Backend guide для проекта визуализации обучения нейросети

Этот документ предназначен для разработчика backend-части. Текущий проект уже содержит frontend на React + TensorFlow.js. Backend в рамках технического задания нужен только как статический сервер.

## Главная идея

Обучение нейросети выполняется полностью на стороне браузера.

Backend не должен:

- создавать нейронную сеть;
- запускать обучение;
- рассчитывать веса, смещения, loss или accuracy;
- хранить результаты обучения;
- обрабатывать пользовательские параметры модели;
- принимать параметры архитектуры через API.

Backend должен:

- отдать `index.html`;
- отдать JS/CSS/assets из production-сборки;
- отдать статические датасеты или изображения, если они появятся;
- корректно работать с обновлением страницы на frontend-маршрутах, если они будут добавлены позже.

## Как работает приложение

1. Пользователь открывает страницу приложения.
2. Backend отдаёт статические файлы из папки `dist`.
3. React-приложение запускается в браузере.
4. Пользователь настраивает модель и датасет.
5. TensorFlow.js создаёт модель прямо в браузере.
6. Обучение выполняется в браузере пользователя.
7. React обновляет графики, карту классификации, веса и структуру модели.

Backend в этом процессе не участвует в вычислениях.

## Структура frontend-проекта

```text
.
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── datasets/
├── src/
│   ├── App.jsx
│   ├── core/
│   │   ├── datasets.js
│   │   └── neuralNetworkEngine.js
│   ├── hooks/
│   │   └── useTrainingController.js
│   ├── components/
│   ├── config/
│   └── utils/
└── dist/
```

Ключевые части:

- `src/core/neuralNetworkEngine.js` - TensorFlow.js-ядро: создание модели, обучение, получение весов, смещений и карты решений.
- `src/core/datasets.js` - генерация учебных точек на клиенте.
- `src/hooks/useTrainingController.js` - контроллер между UI и ядром обучения.
- `src/components` - визуальные компоненты.
- `public` - статические ресурсы, которые попадут в `dist` при сборке.
- `dist` - готовая папка, которую должен отдавать backend.

## Как запустить frontend локально

Требуется Node.js.

```bash
npm install
npm run dev
```

По умолчанию Vite поднимает dev-сервер. В текущем проекте команда:

```bash
npm run dev
```

запускает:

```bash
vite --host 0.0.0.0
```

Обычно приложение доступно по адресу:

```text
http://127.0.0.1:5173/
```

## Как собрать frontend для backend

```bash
npm run build
```

После сборки появится или обновится папка:

```text
dist/
```

Именно её нужно отдавать backend-сервером.

Пример содержимого:

```text
dist/
├── index.html
├── assets/
│   ├── index-xxxxx.js
│   └── index-xxxxx.css
└── datasets/
```

## Требования к backend-серверу

Минимально backend должен уметь:

1. Отдавать статические файлы из `dist`.
2. Для неизвестных путей возвращать `dist/index.html`.
3. Не вмешиваться в параметры модели и процесс обучения.

Пункт 2 называется SPA fallback. Он нужен, чтобы при прямом открытии frontend-маршрута браузер не получал `404`. Сейчас в приложении нет сложной маршрутизации, но лучше сразу сделать правильно.

## Пример на Express

```js
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(3000, () => {
  console.log('Static server started: http://localhost:3000');
});
```

## Пример на Nginx

```nginx
server {
  listen 80;
  server_name _;

  root /var/www/neural-training-visualizer/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /assets/ {
    try_files $uri =404;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}
```

## Пример на Spring Boot

Можно положить собранные файлы из `dist` в:

```text
src/main/resources/static/
```

Тогда Spring Boot будет отдавать их как статику.

Если позже появятся frontend-маршруты, нужен fallback на `index.html`, например через контроллер:

```java
@Controller
public class SpaController {
    @RequestMapping(value = "/{path:[^\\.]*}")
    public String redirect() {
        return "forward:/index.html";
    }
}
```

## Пример на ASP.NET Core

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapFallbackToFile("index.html");

app.Run();
```

Собранные файлы можно положить в `wwwroot`.

## Статические датасеты

Сейчас датасеты генерируются в браузере в файле:

```text
src/core/datasets.js
```

Если позже понадобятся заранее подготовленные файлы данных, их можно положить в:

```text
public/datasets/
```

После `npm run build` они попадут в:

```text
dist/datasets/
```

Frontend сможет загрузить их как обычные статические файлы, например:

```text
/datasets/example.json
```

Важно: даже если датасет загружается как статический файл, обучение всё равно остаётся на frontend.

## Что frontend ожидает от backend

На текущем этапе frontend не ожидает REST API.

Не нужны endpoints вроде:

```text
POST /train
POST /model
GET /weights
GET /loss
```

Такие endpoints противоречат текущему техническому заданию, потому что обучение и расчёты должны происходить в браузере.

Если backend всё-таки будет расширяться, допустимые функции:

- авторизация для доступа к приложению;
- отдача статических датасетов;
- отдача документации;
- логирование факта открытия страницы без параметров модели;
- health-check endpoint, например `GET /health`.

## Рекомендуемый health-check

Можно добавить простой endpoint:

```text
GET /health
```

Пример ответа:

```json
{
  "status": "ok",
  "service": "neural-training-visualizer-static"
}
```

Этот endpoint не связан с обучением модели.

## Интеграция frontend и backend в работе

Обычный сценарий:

1. Frontend-разработчик делает изменения.
2. Запускает:

   ```bash
   npm run build
   ```

3. Backend-разработчик берёт свежую папку `dist`.
4. Backend отдаёт `dist` как статику.
5. Проверяется открытие страницы в браузере.

Для совместной разработки можно договориться, что папка `dist` не коммитится, а backend сам запускает сборку перед запуском или деплоем. Если в учебном проекте удобнее коммитить `dist`, это допустимо, но нужно следить, чтобы сборка была свежей.

## Если backend отдаёт приложение не из корня сайта

Если приложение будет доступно не по:

```text
https://example.com/
```

а по подпути, например:

```text
https://example.com/neural-demo/
```

нужно настроить `base` в `vite.config.js`:

```js
export default defineConfig({
  base: '/neural-demo/',
  plugins: [react()],
});
```

После этого нужно заново выполнить:

```bash
npm run build
```

Если приложение отдаётся из корня домена, `base` менять не нужно.

## Проверка после интеграции

После запуска backend нужно проверить:

- открывается главная страница;
- загружаются JS и CSS из `assets`;
- кнопка создания модели работает;
- обучение запускается и останавливается;
- карта классификации обновляется;
- график ошибки обновляется;
- веса и смещения отображаются;
- перезагрузка страницы не даёт `404`;
- статические файлы из `dist/datasets`, если они есть, доступны по URL.

## Частые ошибки

### Backend возвращает 404 при обновлении страницы

Нужен SPA fallback на `index.html`.

### JS или CSS не загружаются

Проверить:

- правильно ли backend смотрит в папку `dist`;
- не изменён ли base path;
- доступны ли файлы из `dist/assets`.

### Backend пытается сделать обучение модели

Это не нужно. TensorFlow.js уже находится во frontend. Backend должен остаться статическим сервером.

### Параметры модели отправляются на сервер

В текущей архитектуре параметры модели хранятся в React-состоянии и используются только в браузере. Отправлять их на backend не требуется.

## Итоговая граница ответственности

Frontend:

- интерфейс;
- параметры модели;
- генерация или загрузка учебных данных;
- создание модели;
- обучение;
- визуализация;
- веса, смещения, loss, accuracy, карта решений.

Backend:

- статическая раздача собранного frontend;
- статические ресурсы;
- SPA fallback;
- необязательный health-check;
- деплой.

Если соблюдать эту границу, проект будет соответствовать техническому заданию и останется удобным для защиты курсовой работы.
