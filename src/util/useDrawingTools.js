import { useState, useEffect, useRef, useCallback } from 'react';
import { LineSeries } from "lightweight-charts";

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
        if (parsed.trendLines && parsed.trendLines.length > 0) {
          parsed.trendLines = parsed.trendLines.map(tl => {
            if (Array.isArray(tl)) {
              return { id: Math.random().toString(36).substr(2, 9), points: tl, color: '#2962FF', width: 2, style: 0 };
            }
            return tl;
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

    const getTimeValue = (t) => {
      if (!t) return 0;
      if (typeof t === 'number') return t;
      if (typeof t === 'string') return new Date(t).getTime();
      if (t.year !== undefined) return new Date(t.year, t.month - 1, t.day).getTime();
      return 0;
    };

    trendLines.forEach(tl => {
      // SVG drawing is handled in updateAnchors
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

  const updateTrendLine = useCallback((id, updates) => {
    const lines = drawingsRef.current.trendLines;
    const index = lines.findIndex(l => l.id === id);
    if (index !== -1) {
      lines[index] = { ...lines[index], ...updates };
      saveDrawings();
      renderDrawings();
      setSelectedLine(lines[index]);
    }
  }, [saveDrawings, renderDrawings]);

  const deleteTrendLine = useCallback((id) => {
    drawingsRef.current.trendLines = drawingsRef.current.trendLines.filter(l => l.id !== id);
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
      anchorsContainer.style.zIndex = '40'; // Lower z-index so it doesn't overlap modals
      container.appendChild(anchorsContainer);
    }

    let frameId;
    const updateAnchors = () => {
      if (!seriesRef.current || !chartRef.current) {
        frameId = requestAnimationFrame(updateAnchors);
        return;
      }
      const chart = chartRef.current;
      const { horizontalLines, trendLines } = drawingsRef.current;

      let svgContainer = anchorsContainer.querySelector('svg');
      if (!svgContainer) {
         svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
         svgContainer.style.position = 'absolute';
         svgContainer.style.top = '0';
         svgContainer.style.left = '0';
         svgContainer.style.width = '100%';
         svgContainer.style.height = '100%';
         svgContainer.style.pointerEvents = 'none'; // pass clicks through to anchors and chart
         anchorsContainer.insertBefore(svgContainer, anchorsContainer.firstChild);
      }

      // Remove deleted lines
      Object.keys(anchorsRef.current).forEach(key => {
        let exists = false;
        if (key.includes('_')) {
           const id = key.split('_')[0];
           exists = trendLines.some(l => l.id === id);
        } else {
           exists = horizontalLines.some(l => l.id === key);
        }
        if (!exists) {
          anchorsRef.current[key].remove();
          delete anchorsRef.current[key];
        }
      });

      const createAnchor = (id, color, type, dragData) => {
        let anchor = anchorsRef.current[id];
        if (!anchor) {
          anchor = document.createElement('div');
          anchor.className = 'drag-anchor';
          anchor.style.position = 'absolute';
          anchor.style.left = '50%';
          anchor.style.transform = 'translate(-50%, -50%)';
          anchor.style.width = '10px';
          anchor.style.height = '10px';
          anchor.style.backgroundColor = '#020617';
          anchor.style.border = `2px solid ${color}`;
          anchor.style.borderRadius = '2px';
          anchor.style.cursor = 'move';
          anchor.style.pointerEvents = 'auto'; // allow dragging directly

          anchor.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const latestLines = type === 'horizontalLine' ? drawingsRef.current.horizontalLines : drawingsRef.current.trendLines;
            const currentLine = latestLines.find(l => l.id === dragData.line.id) || dragData.line;
            setSelectedLine(currentLine);
            
            // Calculate a safe toolbox position
            const rect = container.getBoundingClientRect();
            setToolboxPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            
            draggingStateRef.current = { 
               isDragging: true, 
               lineId: dragData.line.id, 
               fromAnchor: true, 
               type: type,
               pointIndex: dragData.pointIndex // only for trendlines
            };
            chart.applyOptions({ handleScroll: false, handleScale: false });
          });

          anchorsContainer.appendChild(anchor);
          anchorsRef.current[id] = anchor;
        }
        anchor.style.border = `2px solid ${color}`;
        return anchor;
      };

      // Update or create horizontal anchors
      horizontalLines.forEach(hl => {
        const anchor = createAnchor(hl.id, hl.color || '#2962FF', 'horizontalLine', { line: hl });
        const y = seriesRef.current.priceToCoordinate(hl.price);
        if (y !== null) {
          anchor.style.top = `${y}px`;
          anchor.style.left = '50%'; // horizontal center
          anchor.style.display = 'block';
        } else {
          anchor.style.display = 'none';
        }
      });

      // Update or create trend line anchors and draw SVG lines
      const existingLines = svgContainer.querySelectorAll('line');
      const currentLineIds = trendLines.map(tl => `svg_line_${tl.id}`);
      if (drawingStateRef.current.isDrawing && drawingStateRef.current.tempParam) currentLineIds.push('svg_line_temp');
      existingLines.forEach(line => {
         if (!currentLineIds.includes(line.id)) line.remove();
      });

      trendLines.forEach(tl => {
        if (tl.points.length !== 2) return;
        const x1 = chart.timeScale().timeToCoordinate(tl.points[0].time);
        const y1 = seriesRef.current.priceToCoordinate(tl.points[0].value);
        const x2 = chart.timeScale().timeToCoordinate(tl.points[1].time);
        const y2 = seriesRef.current.priceToCoordinate(tl.points[1].value);

        const isSelected = selectedLine && selectedLine.id === tl.id;

        tl.points.forEach((point, index) => {
           const anchorId = `${tl.id}_${index}`;
           const anchor = createAnchor(anchorId, tl.color || '#2962FF', 'trendLineAnchor', { line: tl, pointIndex: index });
           const x = index === 0 ? x1 : x2;
           const y = index === 0 ? y1 : y2;
           if (x !== null && y !== null) {
              anchor.style.left = `${x}px`;
              anchor.style.top = `${y}px`;
              anchor.style.display = isSelected ? 'block' : 'none';
           } else {
              anchor.style.display = 'none';
           }
        });

        // Draw SVG Line
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
           let line = svgContainer.querySelector(`#svg_line_${tl.id}`);
           if (!line) {
              line = document.createElementNS("http://www.w3.org/2000/svg", "line");
              line.id = `svg_line_${tl.id}`;
              line.style.pointerEvents = 'auto'; // allow clicking the SVG line
              line.addEventListener('mousedown', (e) => {
                 e.stopPropagation();
                 const currentLine = drawingsRef.current.trendLines.find(l => l.id === tl.id) || tl;
                 setSelectedLine(currentLine);
                 const rect = containerRef.current.getBoundingClientRect();
                 setToolboxPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              });
              svgContainer.appendChild(line);
           }
           line.setAttribute('x1', x1);
           line.setAttribute('y1', y1);
           line.setAttribute('x2', x2);
           line.setAttribute('y2', y2);
           line.setAttribute('stroke', tl.color || '#2962FF');
           line.setAttribute('stroke-width', tl.width !== undefined ? tl.width : 2);
           if (tl.style === 1) line.setAttribute('stroke-dasharray', '5,5');
           else if (tl.style === 2) line.setAttribute('stroke-dasharray', '2,2');
           else line.removeAttribute('stroke-dasharray');
           
           line.style.cursor = 'pointer';
        }
      });

      // Draw Temp Line
      if (drawingStateRef.current.isDrawing && drawingStateRef.current.tempParam) {
         const { startPoint, tempParam } = drawingStateRef.current;
         const x1 = chart.timeScale().timeToCoordinate(startPoint.time);
         const y1 = seriesRef.current.priceToCoordinate(startPoint.value);
         const x2 = chart.timeScale().timeToCoordinate(tempParam.time);
         const y2 = seriesRef.current.priceToCoordinate(tempParam.value);
         
         if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
            let line = svgContainer.querySelector(`#svg_line_temp`);
            if (!line) {
               line = document.createElementNS("http://www.w3.org/2000/svg", "line");
               line.id = `svg_line_temp`;
               svgContainer.appendChild(line);
            }
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#2962FF');
            line.setAttribute('stroke-width', 2);
         }
      }

      frameId = requestAnimationFrame(updateAnchors);
    };

    frameId = requestAnimationFrame(updateAnchors);
    return () => cancelAnimationFrame(frameId);
  }, [containerRef, selectedLine]);

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
        const x = e.clientX - rect.left;
        
        if (draggingStateRef.current.type === 'trendLineAnchor') {
           const time = chartRef.current.timeScale().coordinateToTime(x);
           const price = seriesRef.current.coordinateToPrice(y);
           if (time && price !== null) {
              const tlIndex = drawingsRef.current.trendLines.findIndex(l => l.id === draggingStateRef.current.lineId);
              if (tlIndex !== -1) {
                 drawingsRef.current.trendLines[tlIndex].points[draggingStateRef.current.pointIndex] = { time, value: price };
                 saveDrawings();
                 renderDrawings();
                 setToolboxPos(null);
              }
           }
        } else {
           const price = seriesRef.current.coordinateToPrice(y);
           if (price !== null) {
             updateHorizontalLine(draggingStateRef.current.lineId, { price });
             // Hide toolbox during drag
             setToolboxPos(null);
           }
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

    const getTimeValue = (t) => {
      if (!t) return 0;
      if (typeof t === 'number') return t;
      if (typeof t === 'string') return new Date(t).getTime();
      if (t.year !== undefined) return new Date(t.year, t.month - 1, t.day).getTime();
      return 0;
    };

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
        if (price === null) return;
        const time = param.time;

        if (!drawingStateRef.current.isDrawing) {
          drawingStateRef.current = {
            isDrawing: true,
            startPoint: { time, value: price },
            tempParam: null
          };
        } else {
          const startPoint = drawingStateRef.current.startPoint;
          const endPoint = { time, value: price };
          
          drawingStateRef.current = { isDrawing: false, startPoint: null, tempParam: null };
          
          if (getTimeValue(startPoint.time) !== getTimeValue(endPoint.time) || startPoint.value !== endPoint.value) {
            const newTl = {
              id: Math.random().toString(36).substr(2, 9),
              points: [startPoint, endPoint],
              color: '#2962FF',
              width: 2,
              style: 0
            };
            drawingsRef.current.trendLines.push(newTl);
            saveDrawings();
            renderDrawings();
            // Auto select so anchors and toolbar show up
            setSelectedLine(newTl);
            setToolboxPos({ x: param.point.x, y: param.point.y });
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
        if (price === null) return;
        
        const time = param.time;
        drawingStateRef.current.tempParam = { time, value: price };
      }
    };

    chart.subscribeClick(clickHandler);
    chart.subscribeCrosshairMove(moveHandler);

    return () => {
      chart.unsubscribeClick(clickHandler);
      chart.unsubscribeCrosshairMove(moveHandler);
    };
  }, [activeTool, saveDrawings, renderDrawings, chartRef, seriesRef]);

  const getAnchorY = useCallback(() => {
    if (seriesRef.current && selectedLine) {
      return seriesRef.current.priceToCoordinate(selectedLine.price);
    }
    return null;
  }, [selectedLine, seriesRef]);

    const updateLine = useCallback((id, updates) => {
      const hlIndex = drawingsRef.current.horizontalLines.findIndex(l => l.id === id);
      if (hlIndex !== -1) {
        updateHorizontalLine(id, updates);
        return;
      }
      const tlIndex = drawingsRef.current.trendLines.findIndex(l => l.id === id);
      if (tlIndex !== -1) {
        updateTrendLine(id, updates);
      }
    }, [updateHorizontalLine, updateTrendLine]);

    const deleteLine = useCallback((id) => {
      const hlIndex = drawingsRef.current.horizontalLines.findIndex(l => l.id === id);
      if (hlIndex !== -1) {
        deleteHorizontalLine(id);
        return;
      }
      const tlIndex = drawingsRef.current.trendLines.findIndex(l => l.id === id);
      if (tlIndex !== -1) {
        deleteTrendLine(id);
      }
    }, [deleteHorizontalLine, deleteTrendLine]);

  return {
    activeTool,
    setActiveTool,
    clearAllDrawings,
    selectedLine,
    toolboxPos,
    updateLine,
    deleteLine,
    closeToolbox: () => { setSelectedLine(null); setToolboxPos(null); }
  };
}
