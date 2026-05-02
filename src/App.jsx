import { Activity, Cpu, Database, Gauge, LineChart, Network } from 'lucide-react';
import ConfigPanel from './components/ConfigPanel.jsx';
import DatasetPreview from './components/DatasetPreview.jsx';
import LossChart from './components/LossChart.jsx';
import NetworkGraph from './components/NetworkGraph.jsx';
import StatusStrip from './components/StatusStrip.jsx';
import TrainingControls from './components/TrainingControls.jsx';
import WeightsPanel from './components/WeightsPanel.jsx';
import { useTrainingController } from './hooks/useTrainingController.js';

function App() {
  const controller = useTrainingController();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">React + TensorFlow.js</p>
          <h1>Визуализация обучения нейронной сети</h1>
        </div>
        <StatusStrip
          config={controller.config}
          trainingState={controller.trainingState}
          modelInfo={controller.modelInfo}
          modelIsCurrent={controller.modelIsCurrent}
        />
      </header>

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
              decisionGrid={controller.decisionGrid}
              disabled={controller.isTraining}
              validation={controller.validation}
              onGenerate={controller.generateDataset}
              onUpdate={controller.updateConfig}
            />
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Метрики</p>
                <h2><LineChart size={18} /> Ошибка обучения</h2>
              </div>
            </div>
            <LossChart history={controller.history} />
          </section>

          <section className="panel panel-wide">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Структура</p>
                <h2><Network size={18} /> Архитектура модели</h2>
              </div>
            </div>
            <NetworkGraph config={controller.config} parameters={controller.parameters} />
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
    </div>
  );
}

export default App;
