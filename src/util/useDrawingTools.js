import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'klypto_drawings_';

export default function useDrawingTools({ chartRef, seriesRef, containerRef, symbol, interval }) {
  const [activeTool, setActiveTool] = useState('cursor'); // 'cursor', 'trendLine', 'horizontalLine'
  
  // State for the floating toolbox
  const [selectedLine, setSelectedLine] = useState(null); // { id, price, color, width, style }
  const [toolboxPos, setToolboxPos] = useState(null); // { x, y }

  const drawingsRef = useRef({
    horizontalLines: [], // array of { id, price, color, width, style }
    trendLines: []
  });
  
  const renderedItemsRef = useRef({
    horizontalLines: [], // array of { id, priceLineObj }
    trendLines: []
  });

  const drawingStateRef = useRef({
    isDrawing: false,
    startPoint: null,
    tempSeries: null
  });

  const getStorageKey = useCallback(() => {
    return `${STORAGE_KEY_PREFIX}${symbol}_${interval}`;
  }, [symbol, interval]);

  const saveDrawings = useCallback(() => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(drawingsRef.current));
    } catch (e) {
      console.error('Failed to save drawings to localStorage', e);
    }
  }, [getStorageKey]);

  const loadDrawings = useCallback(() => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old horizontal lines (which were just numbers) to objects
        if (parsed.horizontalLines && parsed.horizontalLines.length > 0) {
          parsed.horizontalLines = parsed.horizontalLines.map(hl => {
            if (typeof hl === 'number') {
              return { id: Math.random().toString(36).substr(2, 9), price: hl, color: '#2962FF', width: 2, style: 0 };
            }
            return hl;
          });
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load drawings from localStorage', e);
    }
    return { horizontalLines: [], trendLines: [] };
  }, [getStorageKey]);

  const clearRenderedItems = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) return;

    renderedItemsRef.current.horizontalLines.forEach(item => {
      try {
        seriesRef.current.removePriceLine(item.priceLineObj);
      } catch (e) { /* ignore */ }
    });
    renderedItemsRef.current.horizontalLines = [];

    renderedItemsRef.current.trendLines.forEach(series => {
      try {
        chartRef.current.removeSeries(series);
      } catch (e) { /* ignore */ }
    });
    renderedItemsRef.current.trendLines = [];
  }, [chartRef, seriesRef]);

  const renderDrawings = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) return;
    
    clearRenderedItems();

    const { horizontalLines, trendLines } = drawingsRef.current;

    horizontalLines.forEach(hl => {
      const priceLineObj = seriesRef.current.createPriceLine({
        price: hl.price,
        color: hl.color || '#2962FF',
        lineWidth: hl.width || 2,
        lineStyle: hl.style !== undefined ? hl.style : 0,
        axisLabelVisible: true,
      });
      renderedItemsRef.current.horizontalLines.push({ id: hl.id, priceLineObj });
    });

    trendLines.forEach(lineData => {
      const lineSeries = chartRef.current.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const sortedData = [...lineData].sort((a, b) => a.time - b.time);
      lineSeries.setData(sortedData);
      renderedItemsRef.current.trendLines.push(lineSeries);
    });
  }, [chartRef, seriesRef, clearRenderedItems]);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    
    drawingsRef.current = loadDrawings();
    renderDrawings();
  }, [symbol, interval, loadDrawings, renderDrawings]);

  const clearAllDrawings = useCallback(() => {
    drawingsRef.current = { horizontalLines: [], trendLines: [] };
    saveDrawings();
    renderDrawings();
    setSelectedLine(null);
    setToolboxPos(null);
  }, [saveDrawings, renderDrawings]);

  const updateHorizontalLine = useCallback((id, updates) => {
    const lines = drawingsRef.current.horizontalLines;
    const index = lines.findIndex(l => l.id === id);
    if (index !== -1) {
      lines[index] = { ...lines[index], ...updates };
      saveDrawings();
      renderDrawings();
      setSelectedLine(lines[index]);
    }
  }, [saveDrawings, renderDrawings]);

  const deleteHorizontalLine = useCallback((id) => {
    drawingsRef.current.horizontalLines = drawingsRef.current.horizontalLines.filter(l => l.id !== id);
    saveDrawings();
    renderDrawings();
    setSelectedLine(null);
    setToolboxPos(null);
  }, [saveDrawings, renderDrawings]);

  const anchorsRef = useRef({});
  const draggingStateRef = useRef({
    isDragging: false,
    lineId: null
  });

  // Sync DOM anchors for horizontal lines
  useEffect(() => {
    if (!containerRef || !containerRef.current) return;
    const container = containerRef.current;
    const chart = chartRef.current;

    let anchorsContainer = container.querySelector('.drawing-anchors-container');
    if (!anchorsContainer) {
      anchorsContainer = document.createElement('div');
      anchorsContainer.className = 'drawing-anchors-container';
      anchorsContainer.style.position = 'absolute';
      anchorsContainer.style.top = '0';
      anchorsContainer.style.left = '0';
      anchorsContainer.style.width = '100%';
      anchorsContainer.style.height = '100%';
      anchorsContainer.style.pointerEvents = 'none';
      anchorsContainer.style.zIndex = '999';
      container.appendChild(anchorsContainer);
    }

    let frameId;
    const updateAnchors = () => {
      if (!seriesRef.current || !chartRef.current) {
        frameId = requestAnimationFrame(updateAnchors);
        return;
      }
      const chart = chartRef.current;
      const { horizontalLines } = drawingsRef.current;

      // Remove deleted lines
      Object.keys(anchorsRef.current).forEach(id => {
        if (!horizontalLines.find(l => l.id === id)) {
          anchorsRef.current[id].remove();
          delete anchorsRef.current[id];
        }
      });

      // Update or create anchors
      horizontalLines.forEach(hl => {
        let anchor = anchorsRef.current[hl.id];
        if (!anchor) {
          anchor = document.createElement('div');
          anchor.style.position = 'absolute';
          anchor.style.left = '50%';
          anchor.style.transform = 'translate(-50%, -50%)';
          anchor.style.width = '10px';
          anchor.style.height = '10px';
          anchor.style.backgroundColor = '#020617';
          anchor.style.border = `2px solid ${hl.color || '#2962FF'}`;
          anchor.style.borderRadius = '2px';
          anchor.style.cursor = 'ns-resize';
          anchor.style.pointerEvents = 'auto'; // allow dragging directly

          anchor.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            setSelectedLine(hl);
            
            // Calculate a safe toolbox position
            const rect = container.getBoundingClientRect();
            setToolboxPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            
            draggingStateRef.current = { isDragging: true, lineId: hl.id, fromAnchor: true };
            chart.applyOptions({ handleScroll: false, handleScale: false });
          });

          anchorsContainer.appendChild(anchor);
          anchorsRef.current[hl.id] = anchor;
        }

        anchor.style.border = `2px solid ${hl.color || '#2962FF'}`;

        const y = seriesRef.current.priceToCoordinate(hl.price);
        if (y !== null) {
          anchor.style.top = `${y}px`;
          anchor.style.display = 'block';
        } else {
          anchor.style.display = 'none';
        }
      });

      frameId = requestAnimationFrame(updateAnchors);
    };

    frameId = requestAnimationFrame(updateAnchors);
    return () => cancelAnimationFrame(frameId);
  }, [containerRef]);

  // Handle global mouse move for drag and double-click logic for chart canvas
  useEffect(() => {
    if (!containerRef || !containerRef.current || !seriesRef.current || !chartRef.current) return;
    const container = containerRef.current;
    const chart = chartRef.current;

    const handleDblClick = (e) => {
      if (activeTool !== 'cursor' || !selectedLine) return;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const price = seriesRef.current.coordinateToPrice(y);
      if (price !== null) {
        const threshold = Math.abs((seriesRef.current.coordinateToPrice(y - 10) - seriesRef.current.coordinateToPrice(y + 10)) / 2);
        if (Math.abs(selectedLine.price - price) < threshold) {
          if (!draggingStateRef.current.isDragging) {
            draggingStateRef.current = { isDragging: true, lineId: selectedLine.id };
            chart.applyOptions({ handleScroll: false, handleScale: false });
          } else {
            draggingStateRef.current = { isDragging: false, lineId: null };
            chart.applyOptions({
              handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
              handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true }
            });
          }
        }
      }
    };

    const handleMouseMove = (e) => {
      if (draggingStateRef.current.isDragging && draggingStateRef.current.lineId) {
        const rect = container.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const price = seriesRef.current.coordinateToPrice(y);
        
        if (price !== null) {
          updateHorizontalLine(draggingStateRef.current.lineId, { price });
          // Hide toolbox during drag
          setToolboxPos(null);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      // If we are dragging from anchor, stop drag on mouseup
      if (draggingStateRef.current.isDragging && draggingStateRef.current.fromAnchor) {
        draggingStateRef.current = { isDragging: false, lineId: null, fromAnchor: false };
        chart.applyOptions({
          handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
          handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true }
        });
      }
    };

    const handleClick = () => {
      // If we are dragging from dblclick, clicking drops it
      if (draggingStateRef.current.isDragging && !draggingStateRef.current.fromAnchor) {
        draggingStateRef.current = { isDragging: false, lineId: null, fromAnchor: false };
        chart.applyOptions({
          handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
          handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true }
        });
      }
    };

    container.addEventListener('dblclick', handleDblClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    container.addEventListener('mousedown', handleClick); 

    return () => {
      container.removeEventListener('dblclick', handleDblClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      container.removeEventListener('mousedown', handleClick);
    };
  }, [activeTool, selectedLine, updateHorizontalLine, seriesRef, chartRef, containerRef]);

  const onDragLine = useCallback((y) => {
    if (!seriesRef.current || !selectedLine) return;
    const price = seriesRef.current.coordinateToPrice(y);
    if (price !== null) {
      updateHorizontalLine(selectedLine.id, { price });
      setToolboxPos(prev => prev ? { ...prev, y } : null);
    }
  }, [selectedLine, updateHorizontalLine, seriesRef]);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    const chart = chartRef.current;

    const clickHandler = (param) => {
      if (!param || !param.point || !param.time) {
        setSelectedLine(null);
        setToolboxPos(null);
        return;
      }

      if (activeTool === 'horizontalLine') {
        const price = seriesRef.current.coordinateToPrice(param.point.y);
        if (price !== null) {
          const newLine = {
            id: Math.random().toString(36).substr(2, 9),
            price: price,
            color: '#2962FF',
            width: 2,
            style: 0
          };
          drawingsRef.current.horizontalLines.push(newLine);
          saveDrawings();
          renderDrawings();
          setActiveTool('cursor');
        }
      } else if (activeTool === 'trendLine') {
        const price = seriesRef.current.coordinateToPrice(param.point.y);
        const time = param.time;

        if (!drawingStateRef.current.isDrawing) {
          drawingStateRef.current = {
            isDrawing: true,
            startPoint: { time, value: price },
            tempSeries: chart.addLineSeries({
              color: '#2962FF',
              lineWidth: 2,
              crosshairMarkerVisible: false,
              priceLineVisible: false,
              lastValueVisible: false,
              lineStyle: 2
            })
          };
        } else {
          const startPoint = drawingStateRef.current.startPoint;
          const endPoint = { time, value: price };
          
          if (drawingStateRef.current.tempSeries) {
            chart.removeSeries(drawingStateRef.current.tempSeries);
          }
          
          drawingStateRef.current = { isDrawing: false, startPoint: null, tempSeries: null };
          
          if (startPoint.time !== endPoint.time) {
            drawingsRef.current.trendLines.push([startPoint, endPoint]);
            saveDrawings();
            renderDrawings();
          }
          setActiveTool('cursor');
        }
      } else if (activeTool === 'cursor') {
        // Check if we clicked on an existing horizontal line
        const clickedPrice = seriesRef.current.coordinateToPrice(param.point.y);
        if (clickedPrice !== null) {
          const threshold = (seriesRef.current.coordinateToPrice(param.point.y - 10) - seriesRef.current.coordinateToPrice(param.point.y + 10)) / 2; // rough threshold
          const absThreshold = Math.abs(threshold);
          
          const clickedLine = drawingsRef.current.horizontalLines.find(
            l => Math.abs(l.price - clickedPrice) < absThreshold
          );

          if (clickedLine) {
            setSelectedLine(clickedLine);
            setToolboxPos({ x: param.point.x, y: param.point.y });
          } else {
            setSelectedLine(null);
            setToolboxPos(null);
          }
        }
      }
    };

    const moveHandler = (param) => {
      if (activeTool === 'trendLine' && drawingStateRef.current.isDrawing) {
        if (!param || !param.point || !param.time) return;
        const price = seriesRef.current.coordinateToPrice(param.point.y);
        const time = param.time;
        
        const startPoint = drawingStateRef.current.startPoint;
        if (startPoint.time !== time) {
          const sortedData = [startPoint, { time, value: price }].sort((a, b) => a.time - b.time);
          drawingStateRef.current.tempSeries.setData(sortedData);
        }
      }
    };

    chart.subscribeClick(clickHandler);
    chart.subscribeCrosshairMove(moveHandler);

    return () => {
      chart.unsubscribeClick(clickHandler);
      chart.unsubscribeCrosshairMove(moveHandler);
      if (drawingStateRef.current.tempSeries) {
        try {
          chart.removeSeries(drawingStateRef.current.tempSeries);
        } catch (e) { /* ignore */ }
      }
    };
  }, [activeTool, saveDrawings, renderDrawings, chartRef, seriesRef]);

  const getAnchorY = useCallback(() => {
    if (seriesRef.current && selectedLine) {
      return seriesRef.current.priceToCoordinate(selectedLine.price);
    }
    return null;
  }, [selectedLine, seriesRef]);

  return {
    activeTool,
    setActiveTool,
    clearAllDrawings,
    selectedLine,
    toolboxPos,
    updateHorizontalLine,
    deleteHorizontalLine,
    closeToolbox: () => { setSelectedLine(null); setToolboxPos(null); }
  };
}
