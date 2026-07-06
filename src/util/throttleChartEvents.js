export function throttleChartEvents(chart) {
  if (!chart || chart.__isThrottled) return chart;
  
  const throttle = (handler) => {
    let rafId = null;
    return (param) => {
      if (rafId) return; // Drop events that happen within the same frame
      rafId = requestAnimationFrame(() => {
        handler(param);
        rafId = null;
      });
    };
  };

  const wrapMethod = (obj, method, unsubMethod) => {
    if (!obj || !obj[method] || !obj[unsubMethod]) return;
    
    const original = obj[method].bind(obj);
    const originalUnsub = obj[unsubMethod].bind(obj);
    if (!obj.__throttled) obj.__throttled = new Map();
    
    obj[method] = (handler) => {
      if (obj.__throttled.has(handler)) return; // already wrapped
      const throttled = throttle(handler);
      obj.__throttled.set(handler, throttled);
      original(throttled);
    };
    
    obj[unsubMethod] = (handler) => {
      const throttled = obj.__throttled.get(handler);
      if (throttled) {
        originalUnsub(throttled);
        obj.__throttled.delete(handler);
      } else {
        originalUnsub(handler);
      }
    };
  };

  wrapMethod(chart, 'subscribeCrosshairMove', 'unsubscribeCrosshairMove');
  
  const ts = chart.timeScale();
  wrapMethod(ts, 'subscribeVisibleTimeRangeChange', 'unsubscribeVisibleTimeRangeChange');
  wrapMethod(ts, 'subscribeVisibleLogicalRangeChange', 'unsubscribeVisibleLogicalRangeChange');

  chart.__isThrottled = true;
  return chart;
}
