import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function SettingsSection({ title, subtitle, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={`settings-section${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        className="settings-section__header"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span>
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>

      {isOpen && <div className="settings-section__body">{children}</div>}
    </section>
  );
}

export default SettingsSection;
