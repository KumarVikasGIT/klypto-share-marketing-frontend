import React, { useRef, useEffect, useState } from 'react';
import { LuTrash2, LuGripVertical } from 'react-icons/lu';

const DrawingToolbox = ({ selectedLine, position, onUpdate, onDelete, onClose }) => {
  const toolboxRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 10, left: 10 });
  const [isReady, setIsReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (toolboxRef.current && position && !isDragging) {
      setTimeout(() => {
        if (!toolboxRef.current) return;
        const parentRect = toolboxRef.current.parentElement.getBoundingClientRect();
        const rect = toolboxRef.current.getBoundingClientRect();
        
        const panelWidth = rect.width > 0 ? rect.width : 280;
        const panelHeight = rect.height > 0 ? rect.height : 48;
        
        let left = position.x - (panelWidth / 2);
        let top = position.y - 60; // Just above the anchor
        
        if (left + panelWidth > parentRect.width) {
          left = parentRect.width - panelWidth - 10;
        }
        if (top + panelHeight > parentRect.height) {
          top = parentRect.height - panelHeight - 10;
        }
        if (top < 10) top = position.y + 20; // below the anchor if too high
        
        left = Math.max(10, left);
        top = Math.max(10, top);
        
        setPanelPos({ top, left });
        setIsReady(true);
      }, 0);
    }
  }, [position, isDragging]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolboxRef.current && !toolboxRef.current.contains(e.target)) {
        if (!e.target.closest('.drag-anchor') && !isDragging) {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, isDragging]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = toolboxRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && toolboxRef.current) {
        const parentRect = toolboxRef.current.parentElement.getBoundingClientRect();
        let left = e.clientX - parentRect.left - dragOffset.x;
        let top = e.clientY - parentRect.top - dragOffset.y;
        setPanelPos({ top, left });
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!selectedLine || !position) return null;

  return (
    <div
      ref={toolboxRef}
      className="floating-toolbar"
      style={{
        position: 'absolute',
        top: panelPos.top,
        left: panelPos.left,
        visibility: isReady ? 'visible' : 'hidden',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        background: '#1e222d',
        borderRadius: '8px',
        padding: '6px 12px',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        border: '1px solid #2a2e39',
        color: '#d1d4dc',
        userSelect: 'none',
      }}
    >
      <div 
        onMouseDown={handleMouseDown}
        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', opacity: 0.6 }}
      >
        <LuGripVertical size={16} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
         <input 
            type="color" 
            value={selectedLine.color || '#2962FF'} 
            onChange={(e) => onUpdate(selectedLine.id, { color: e.target.value })}
            style={{ 
               padding: 0, 
               width: '24px', 
               height: '24px', 
               border: 'none', 
               borderRadius: '4px', 
               background: 'transparent',
               cursor: 'pointer' 
            }}
         />
      </div>
      
      <div style={{ width: '1px', height: '24px', background: '#2a2e39' }} />
      
      <select 
         value={selectedLine.width || 2}
         onChange={(e) => onUpdate(selectedLine.id, { width: parseInt(e.target.value) })}
         style={{ background: 'transparent', color: '#d1d4dc', border: 'none', outline: 'none', cursor: 'pointer' }}
      >
         <option value={1}>1px</option>
         <option value={2}>2px</option>
         <option value={3}>3px</option>
         <option value={4}>4px</option>
      </select>

      <div style={{ width: '1px', height: '24px', background: '#2a2e39' }} />
      
      <select 
         value={selectedLine.style !== undefined ? selectedLine.style : 0}
         onChange={(e) => onUpdate(selectedLine.id, { style: parseInt(e.target.value) })}
         style={{ background: 'transparent', color: '#d1d4dc', border: 'none', outline: 'none', cursor: 'pointer' }}
      >
         <option value={0}>Solid</option>
         <option value={1}>Dashed</option>
         <option value={2}>Dotted</option>
      </select>

      <div style={{ width: '1px', height: '24px', background: '#2a2e39' }} />

      <button
        onClick={() => onDelete(selectedLine.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#d1d4dc',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#d1d4dc'; e.currentTarget.style.background = 'transparent'; }}
        title="Delete"
      >
        <LuTrash2 size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', opacity: 0.6, cursor: 'pointer', padding: '4px' }}>
         ...
      </div>
    </div>
  );
};

export default DrawingToolbox;
