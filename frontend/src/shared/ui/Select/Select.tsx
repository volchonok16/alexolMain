import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Select.scss';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const Select = ({ options, value, onChange, placeholder = 'Выберите...' }: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.label === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const updatePosition = () => {
      if (selectRef.current && isOpen) {
        const rect = selectRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    updatePosition();

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const handleSelect = (option: SelectOption) => {
    onChange(option.label);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen && selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="select" ref={selectRef}>
      <div
        className={`select__trigger ${isOpen ? 'select__trigger--open' : ''} ${!selectedOption ? 'select__trigger--placeholder' : ''}`}
        onClick={handleToggle}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`select__icon ${isOpen ? 'select__icon--open' : ''}`} size={20} />
      </div>

      {isOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="select__dropdown select__dropdown--portal"
              style={{
                position: 'absolute',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
              }}
            >
              {options.map(option => (
                <div
                  key={option.value}
                  className={`select__option ${option.value === value ? 'select__option--selected' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
