import { useEffect, useState } from 'react';
import { Activity, Cpu, Database, Gauge, LineChart, Network } from 'lucide-react';
import AccuracyChart from './components/AccuracyChart.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';
import DatasetPreview from './components/DatasetPreview.jsx';
import LossChart from './components/LossChart.jsx';
import NetworkGraph from './components/NetworkGraph.jsx';
import RegressionStatusStrip from './components/RegressionStatusStrip.jsx';
import StatusStrip from './components/StatusStrip.jsx';
import TrainingControls from './components/TrainingControls.jsx';
import WeightsPanel from './components/WeightsPanel.jsx';
import RegressionPage from './pages/RegressionPage.jsx';
import { useRegressionController } from './hooks/useRegressionController.js';
import { useTrainingController } from './hooks/useTrainingController.js';

function getPageFromHash() {
  return window.location.hash === '#regression' ? 'regression' : 'classification';
}

function App() {
  const controller = useTrainingController();
  const regressionController = useRegressionController();
  const [activePage, setActivePage] = useState(() => getPageFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setActivePage(getPageFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const switchPage = (page) => {
    window.location.hash = page === 'regression' ? 'regression' : 'classification';
    setActivePage(page);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">React + TensorFlow.js</p>
          <h1>{activePage === 'regression' ? 'Регрессия нейронной сетью' : 'Визуализация обучения нейронной сети'}</h1>
          <nav className="page-switcher" aria-label="Разделы приложения">
            <button
              type="button"
              className={activePage === 'classification' ? 'is-active' : ''}
              onClick={() => switchPage('classification')}
            >
              Классификация
            </button>
            <button
              type="button"
              className={activePage === 'regression' ? 'is-active' : ''}
              onClick={() => switchPage('regression')}
            >
              Регрессия
            </button>
          </nav>
        </div>
        {activePage === 'regression' ? (
          <RegressionStatusStrip
            config={regressionController.config}
            dataset={regressionController.dataset}
            trainingState={regressionController.trainingState}
            modelInfo={regressionController.modelInfo}
            modelIsCurrent={regressionController.modelIsCurrent}
          />
        ) : (
          <StatusStrip
            config={controller.config}
            trainingState={controller.trainingState}
            modelInfo={controller.modelInfo}
            modelIsCurrent={controller.modelIsCurrent}
          />
        )}
      </header>

      {activePage === 'regression' ? (
        <RegressionPage controller={regressionController} />
      ) : (
      <main className="workspace">
        <aside className="sidebar">
          <TrainingControls
            isTraining={controller.isTraining}
            status={controller.trainingState.status}
            validation={controller.validation}
            onCreate={controller.createModel}
            onStart={controller.startTraining}
            onStop={controller.stopTraining}
            onReset={controller.resetTraining}
          />
          <ConfigPanel
            config={controller.config}
            validation={controller.validation}
            isTraining={controller.isTraining}
            onUpdate={controller.updateConfig}
            onLayerCountChange={controller.setHiddenLayerCount}
            onLayerNeuronsChange={controller.setLayerNeurons}
          />
        </aside>

        <section className="content-grid">
          <section className="panel panel-focus">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Классификация</p>
                <h2><Database size={18} /> Точки и области решений</h2>
              </div>
            </div>
            <DatasetPreview
              config={controller.config}
              dataset={controller.dataset}
              customDatasetInfo={controller.customDatasetInfo}
              decisionGrid={controller.decisionGrid}
              disabled={controller.isTraining}
              validation={controller.validation}
              onGenerate={controller.generateDataset}
              onUploadCsv={controller.uploadCsvDataset}
              onUpdate={controller.updateConfig}
            />
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Метрики</p>
                <h2><LineChart size={18} /> Обучение по эпохам</h2>
              </div>
            </div>
            <div className="metrics-stack">
              <div className="metric-block">
                <h3>Ошибка</h3>
                <LossChart history={controller.history} />
              </div>
              <div className="metric-block">
                <h3>Точность</h3>
                <AccuracyChart history={controller.history} />
              </div>
            </div>
          </section>

          <section className="panel panel-wide">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Структура</p>
                <h2><Network size={18} /> Архитектура модели</h2>
              </div>
            </div>
            <NetworkGraph
              config={controller.config}
              inputUnits={controller.modelInfo?.inputUnits ?? controller.dataset?.featureCount ?? 2}
              parameters={controller.parameters}
            />
          </section>

          <section className="panel panel-wide">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Параметры</p>
                <h2><Cpu size={18} /> Веса и смещения</h2>
              </div>
              <p className="panel-note">Откройте нужный слой, чтобы посмотреть численные значения.</p>
            </div>
            <WeightsPanel parameters={controller.parameters} />
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Состояние</p>
                <h2><Activity size={18} /> Процесс</h2>
              </div>
            </div>
            <div className="state-card">
              <Gauge size={26} />
              <div>
                <strong>{controller.trainingState.label}</strong>
                <span>{controller.trainingState.message}</span>
              </div>
            </div>
          </section>
        </section>
      </main>
      )}
    </div>
  );
}

export default App;
