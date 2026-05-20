import { Activity, BarChart3, Cpu, Database, Gauge, Network } from 'lucide-react';
import ActualPredictedChart from '../components/ActualPredictedChart.jsx';
import LossChart from '../components/LossChart.jsx';
import NetworkGraph from '../components/NetworkGraph.jsx';
import RegressionConfigPanel from '../components/RegressionConfigPanel.jsx';
import RegressionDatasetPreview from '../components/RegressionDatasetPreview.jsx';
import RegressionPredictionPanel from '../components/RegressionPredictionPanel.jsx';
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
              <h2><BarChart3 size={18} /> Потери и остатки</h2>
            </div>
          </div>
          <div className="metrics-stack">
            <div className="metric-block">
              <h3>Потери</h3>
              <LossChart history={controller.history} validationLabel="validation loss" />
            </div>
            <div className="metric-block">
              <h3>Остатки</h3>
              <ResidualPlot diagnostics={controller.diagnostics} />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Диагностика</p>
              <h2><BarChart3 size={18} /> Истинные и предсказанные значения</h2>
            </div>
          </div>
          <ActualPredictedChart diagnostics={controller.diagnostics} />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Прогноз</p>
              <h2><BarChart3 size={18} /> Ручное значение</h2>
            </div>
          </div>
          <RegressionPredictionPanel
            dataset={controller.dataset}
            modelInfo={controller.modelInfo}
            modelIsCurrent={controller.modelIsCurrent}
            onPredict={controller.predictValue}
          />
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
            outputUnits={controller.modelInfo?.outputUnits ?? 1}
            inputNames={controller.dataset?.featureColumnNames}
            outputNames={[controller.dataset?.targetColumnName ?? 'y']}
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
