import React from 'react';
import { LuMousePointer2, LuTrash2, LuMinus } from 'react-icons/lu';
import { BsGraphUpArrow } from 'react-icons/bs';
import { MdTimeline } from 'react-icons/md';

const DrawingToolbar = ({ activeTool, setActiveTool, clearAllDrawings }) => {
  const tools = [
    {
      id: 'cursor',
      icon: <LuMousePointer2 size={20} />,
      title: 'Cursor'
    },
    {
      id: 'trendLine',
      icon: <MdTimeline size={20} />,
      title: 'Trend Line'
    },
    {
      id: 'horizontalLine',
      icon: <LuMinus size={20} />,
      title: 'Horizontal Line'
    }
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '50px',
        backgroundColor: 'transparent', // Inherit background from chart container
        borderRight: '1px solid #1e293b',
        padding: '10px 0',
        alignItems: 'center',
        gap: '15px'
      }}
    >
      {tools.map((tool) => (
        <button
          key={tool.id}
          title={tool.title}
          onClick={() => setActiveTool(tool.id)}
          style={{
            background: 'none',
            border: 'none',
            color: activeTool === tool.id ? '#2962FF' : '#94a3b8',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'all 0.2s',
            backgroundColor: activeTool === tool.id ? 'rgba(41, 98, 255, 0.1)' : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (activeTool !== tool.id) e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            if (activeTool !== tool.id) e.currentTarget.style.color = '#94a3b8';
          }}
        >
          {tool.icon}
        </button>
      ))}

      <div style={{ height: '1px', width: '30px', backgroundColor: '#1e293b', margin: '5px 0' }} />

      <button
        title="Clear All Drawings"
        onClick={clearAllDrawings}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
      >
        <LuTrash2 size={20} />
      </button>
    </div>
  );
};

export default DrawingToolbar;
