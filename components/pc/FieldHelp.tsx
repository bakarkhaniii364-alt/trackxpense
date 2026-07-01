import React, { useState, useEffect, useRef } from 'react';

interface FieldHelpProps {
  text: string;
  ariaLabel?: string;
}

export const FieldHelp: React.FC<FieldHelpProps> = ({ text, ariaLabel }) => {
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsActive(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`field-help ${isActive ? 'field-help--active' : ''}`} 
      aria-label={ariaLabel || 'field help'}
    >
      <button 
        type="button" 
        className="field-help__btn" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsActive(!isActive);
        }}
        tabIndex={0}
      >
        ?
      </button>
      <div role="tooltip" className="field-help__tooltip" aria-hidden={!isActive}>
        {text}
      </div>
    </div>
  );
};

export default FieldHelp;
