import { useEffect, useRef } from "react";

export default function VPPlot({
  result,
  chart,
  containerRef,
  indicatorConfigs,
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    console.log("📊 VPPlot INIT");

    if (!chart) {
      console.log("❌ VP: chart missing");
      return;
    }

    if (!containerRef) {
      console.log("❌ VP: containerRef missing");
      return;
    }

    if (!result) {
      console.log("❌ VP: result missing");
      return;
    }

    /* ================= FLEXIBLE DATA ACCESS ================= */

    const data = result.data || result; // 🔥 KEY FIX

    const volumeProfile = data.volumeprofile;

    if (!Array.isArray(volumeProfile)) {
      console.log("❌ VP: volumeprofile not array", volumeProfile);
      console.log("🔍 FULL RESULT:", result);
      return;
    }

    if (!volumeProfile.length) {
      console.log("❌ VP: volumeprofile empty");
      return;
    }

    console.log("✅ VP data length:", volumeProfile.length);


    /* ================= CREATE CANVAS ================= */

    let canvas = canvasRef.current;

    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "10";

      canvasRef.current = canvas;
      containerRef.appendChild(canvas);

      ctxRef.current = canvas.getContext("2d");
    }

    const ctx = ctxRef.current;

    /* ================= RESIZE ================= */

    const resize = () => {
      const rect = containerRef.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();

    /* ================= OTHER DATA ================= */

    const poc = data.volumePoc;
    const vah = data.volumevah;
    const val = data.volumeval;

    const config = indicatorConfigs?.VOLUME_PROFILE || {};
    const profileWidth = config.width || 120;

    const priceScale = chart.priceScale("right");

    /* ================= DRAW ================= */

    const draw = () => {
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const maxVolume = Math.max(...volumeProfile.map((d) => d.volume));

      if (!maxVolume) return;

      let drawn = 0;

      volumeProfile.forEach((d, i) => {
        const y = priceScale.priceToCoordinate(Number(d.price));

        if (y == null) return;

        const barWidth = (Number(d.volume) / maxVolume) * profileWidth;

        ctx.fillStyle = config.color || "var(--accent-color)";

        ctx.fillRect(canvas.width - barWidth, y - 2, barWidth, 4);

        drawn++;
      });

      console.log("🎯 VP bars drawn:", drawn);

      /* ===== POC ===== */
      if (poc != null) {
        const y = priceScale.priceToCoordinate(Number(poc));
        if (y != null) {
          ctx.fillStyle = config.pocColor || "red";
          ctx.fillRect(canvas.width - profileWidth, y - 1, profileWidth, 2);
        }
      }

      /* ===== VAH ===== */
      if (vah != null) {
        const y = priceScale.priceToCoordinate(Number(vah));
        if (y != null) {
          ctx.fillStyle = config.vaColor || "#00bcd4";
          ctx.fillRect(canvas.width - profileWidth, y - 1, profileWidth, 1);
        }
      }

      /* ===== VAL ===== */
      if (val != null) {
        const y = priceScale.priceToCoordinate(Number(val));
        if (y != null) {
          ctx.fillStyle = config.vaColor || "#00bcd4";
          ctx.fillRect(canvas.width - profileWidth, y - 1, profileWidth, 1);
        }
      }
    };

    const drawRAF = () => requestAnimationFrame(draw);

    drawRAF();

    chart.timeScale().subscribeVisibleTimeRangeChange(drawRAF);
    chart.subscribeCrosshairMove(drawRAF);

    window.addEventListener("resize", () => {
      resize();
      drawRAF();
    });

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(drawRAF);
      chart.unsubscribeCrosshairMove(drawRAF);

      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
    };
  }, [result, chart]);

  return null;
}