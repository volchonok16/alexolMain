import { motion } from 'framer-motion';

interface Module {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  connections: string[];
  title: string;
  description: string;
  cta: string;
}

interface TechModuleProps {
  module: Module;
  isHovered: boolean;
  isActive: boolean;
  isConnected: boolean;
  onHover: (id: string | null) => void;
  onClick: (module: Module) => void;
}

export const TechModule = ({ module, isHovered, isActive, isConnected, onHover, onClick }: TechModuleProps) => {
  return (
    <motion.div
      className={`tech-module ${isActive ? 'tech-module--active' : ''} ${isConnected ? 'tech-module--connected' : ''}`}
      style={{
        left: `${module.x}%`,
        top: `${module.y}%`,
      }}
      animate={{
        scale: isHovered || isActive ? 1.3 : 1,
        x: isActive ? '-50%' : '-50%',
        y: isActive ? '-50%' : '-50%',
      }}
      whileHover={{ scale: 1.2 }}
      onHoverStart={() => onHover(module.id)}
      onHoverEnd={() => onHover(null)}
      onClick={() => onClick(module)}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="tech-module__icon">{module.icon}</div>
      <div className="tech-module__name">{module.name}</div>

      {isHovered && (
        <motion.div
          className="tech-module__tooltip"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          {module.description}
        </motion.div>
      )}

      <div className="tech-module__glow" />
    </motion.div>
  );
};
