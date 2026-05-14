import { Activity, BarChart3, Cpu, Database, Gauge, Network } from 'lucide-react';
import ActualPredictedChart from '../components/ActualPredictedChart.jsx';
import LossChart from '../components/LossChart.jsx';
import NetworkGraph from '../components/NetworkGraph.jsx';
import RegressionConfigPanel from '../components/RegressionConfigPanel.jsx';
import RegressionDatasetPreview from '../components/RegressionDatasetPreview.jsx';
import ResidualPlot from '../components/ResidualPlot.jsx';
import TrainingControls from '../components/TrainingControls.jsx';
import WeightsPanel from '../components/WeightsPanel.jsx';

function RegressionPage({ controller }) {
  return (
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
        <RegressionConfigPanel
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
              <p className="eyebrow">Регрессия</p>
              <h2><Database size={18} /> Данные</h2>
            </div>
          </div>
          <RegressionDatasetPreview
            config={controller.config}
            dataset={controller.dataset}
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
              <h2><BarChart3 size={18} /> Потери</h2>
            </div>
          </div>
          <LossChart history={controller.history} validationLabel="validation loss" />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Диагностика</p>
              <h2><BarChart3 size={18} /> Actual vs Predicted</h2>
            </div>
          </div>
          <ActualPredictedChart diagnostics={controller.diagnostics} />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Диагностика</p>
              <h2><BarChart3 size={18} /> Residual plot</h2>
            </div>
          </div>
          <ResidualPlot diagnostics={controller.diagnostics} />
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
            inputUnits={controller.modelInfo?.inputUnits ?? controller.dataset?.featureCount ?? 1}
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
  );
}

export default RegressionPage;
