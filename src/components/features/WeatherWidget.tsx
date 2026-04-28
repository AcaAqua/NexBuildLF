'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Cloud, CloudRain, CloudLightning, Thermometer } from 'lucide-react';

interface WeatherData {
  temp: number;
  code: number;
  rainProb: number;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    // 鶴岡市の座標付近をデフォルトに設定
    const lat = 38.7231;
    const lon = 139.8247;
    
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation_probability`)
      .then(res => res.json())
      .then(data => {
        setWeather({
          temp: Math.round(data.current_weather.temperature),
          code: data.current_weather.weathercode,
          rainProb: data.hourly.precipitation_probability[0]
        });
      })
      .catch(err => console.error("Weather fetch failed", err));
  }, []);

  if (!weather) return null;

  const getWeatherIcon = (code: number) => {
    if (code <= 1) return <Sun className="text-orange-500" size={24} />;
    if (code <= 3) return <Cloud className="text-gray-400" size={24} />;
    if (code <= 65) return <CloudRain className="text-blue-500" size={24} />;
    return <CloudLightning className="text-purple-500" size={24} />;
  };

  const getWeatherLabel = (code: number) => {
    if (code <= 1) return "快晴";
    if (code <= 3) return "晴れ / 曇り";
    if (code <= 65) return "雨";
    return "雷雨";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="weather-card glass"
    >
      <div className="weather-main">
        <div className="weather-icon-box">
          {getWeatherIcon(weather.code)}
        </div>
        <div className="weather-info">
          <span className="location">山形県 庄内地方</span>
          <span className="condition">{getWeatherLabel(weather.code)}</span>
        </div>
      </div>
      
      <div className="weather-stats">
        <div className="stat">
          <Thermometer size={14} />
          <span>{weather.temp}°C</span>
        </div>
        <div className="stat">
          <CloudRain size={14} />
          <span>{weather.rainProb}%</span>
        </div>
      </div>

      <style jsx>{`
        .weather-card {
          padding: 16px 20px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid var(--border-light);
          margin-bottom: 8px;
          box-shadow: var(--shadow-sm);
        }

        .weather-main {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .weather-icon-box {
          width: 44px;
          height: 44px;
          background: var(--surface);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
        }

        .weather-info {
          display: flex;
          flex-direction: column;
        }

        .location {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-sub);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .condition {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-main);
        }

        .weather-stats {
          display: flex;
          gap: 16px;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-main);
          background: var(--surface-hover);
          padding: 6px 12px;
          border-radius: 20px;
        }

        @media (max-width: 480px) {
          .weather-stats {
            gap: 8px;
          }
          .stat span { font-size: 13px; }
        }
      `}</style>
    </motion.div>
  );
}
