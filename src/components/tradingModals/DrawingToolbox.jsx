import React, { useRef, useEffect, useState } from 'react';
import { LuTrash2, LuX } from 'react-icons/lu';
import ColorPalettePanel from '../indicator/ColorPalettePanel';

const DrawingToolbox = ({ selectedLine, position, onUpdate, onDelete, onClose }) => {
  const toolboxRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 10, left: 10 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (toolboxRef.current && position) {
      // Use setTimeout to ensure DOM has painted the contents (specifically ColorPalettePanel) so we get the true height
      setTimeout(() => {
        if (!toolboxRef.current) return;
        const parentRect = toolboxRef.current.parentElement.getBoundingClientRect();
        const rect = toolboxRef.current.getBoundingClientRect();
        
        const panelWidth = rect.width > 0 ? rect.width : 320;
        const panelHeight = rect.height > 0 ? rect.height : 550; // Use actual height or fallback
        
        let left = position.x + 20;
        let top = position.y - 120;
        
        if (left + panelWidth > parentRect.width) {
          left = position.x - panelWidth - 20;
        }
        if (top + panelHeight > parentRect.height) {
          top = parentRect.height - panelHeight - 10;
        }
        
        left = Math.max(10, left);
        top = Math.max(10, top);
        
        setPanelPos({ top, left });
        setIsReady(true);
      }, 0);
    }
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolboxRef.current && !toolboxRef.current.contains(e.target)) {
        if (!e.target.closest('.color-palette-panel') && !e.target.closest('.drag-anchor')) {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);



  if (!selectedLine || !position) return null;

  return (
    <div
      ref={toolboxRef}
      className="color-palette-panel"
      style={{
        position: 'absolute',
        top: panelPos.top,
        left: panelPos.left,
        visibility: isReady ? 'visible' : 'hidden',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ position: 'relative' }}>
        <ColorPalettePanel
          mode="line"
          currentStyle={{
            color: selectedLine.color,
            width: selectedLine.width,
            lineStyle: selectedLine.style,
          }}
          onChange={(updates) => {
            const translatedUpdates = {};
            if (updates.color) translatedUpdates.color = updates.color;
            if (updates.width !== undefined) translatedUpdates.width = updates.width;
            if (updates.lineStyle !== undefined) translatedUpdates.style = updates.lineStyle;
            onUpdate(selectedLine.id, translatedUpdates);
          }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
          }}
          title="Close"
        >
          <LuX size={16} />
        </button>
      </div>
      
      <button
        onClick={() => onDelete(selectedLine.id)}
        style={{
          background: 'var(--bg-secondary, #f7f7f7)',
          border: 'none',
          color: '#ef4444',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          borderRadius: '8px',
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          width: '300px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #f7f7f7)'}
      >
        <LuTrash2 size={16} /> Delete Line
      </button>
    </div>
  );
};

export default DrawingToolbox;
