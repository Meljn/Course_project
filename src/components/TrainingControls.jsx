import { Play, RotateCcw, Square, Wand2 } from 'lucide-react';

function TrainingControls({ isTraining, status, validation, onCreate, onStart, onStop, onReset }) {
  const hasErrors = !validation.isValid;

  return (
    <section className="control-panel">
      <div className="control-panel__header">
        <div>
          <p className="eyebrow">Управление</p>
          <h2>Обучение</h2>
        </div>
        <span className={`status-pill status-pill--${status}`}>{status}</span>
      </div>

      <div className="button-grid">
        <button type="button" className="button button-primary" onClick={onCreate} disabled={isTraining || hasErrors}>
          <Wand2 size={18} />
          Создать
        </button>
        <button type="button" className="button button-success" onClick={onStart} disabled={isTraining || hasErrors}>
          <Play size={18} />
          Запустить
        </button>
        <button type="button" className="button button-warning" onClick={onStop} disabled={!isTraining}>
          <Square size={18} />
          Остановить
        </button>
        <button type="button" className="button button-ghost" onClick={onReset}>
          <RotateCcw size={18} />
          Сбросить
        </button>
      </div>

      {!validation.isValid && (
        <div className="validation-box" role="alert">
          {validation.messages[0]}
        </div>
      )}
    </section>
  );
}

export default TrainingControls;
