import { useState, useRef, useEffect } from 'react';

interface UseMorphingEditOptions {
  collapsedHeight?: number;
  expandedHeight?: number;
}

export function useMorphingEdit(options: UseMorphingEditOptions = {}) {
  const {
    collapsedHeight = 50,
    expandedHeight = 150,
  } = options;

  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const morphingProps = {
    initial: false as const,
    animate: {
      height: isEditing ? expandedHeight : collapsedHeight,
      borderRadius: isEditing ? 10 : 8,
    },
    transition: {
      type: 'spring' as const,
      stiffness: 550,
      damping: 45,
      mass: 0.7,
      delay: isEditing ? 0 : 0.08,
    },
  };

  const formProps = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      type: 'spring' as const,
      stiffness: 550,
      damping: 45,
      mass: 0.7,
    },
  };

  return {
    isEditing,
    setIsEditing,
    containerRef,
    morphingProps,
    formProps,
  };
}
