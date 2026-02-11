import React, { useState, useEffect } from 'react';
import { Timer, Zap } from 'lucide-react';

const LiveIndicators = ({ isRunning, startTime }) => {
    const [duration, setDuration] = useState('00:00:00');

    useEffect(() => {
        let interval;
        if (isRunning && startTime) {
            const updateTimer = () => {
                const now = new Date();
                const start = new Date(startTime);

                // Handle invalid date
                if (isNaN(start.getTime())) {
                    return;
                }

                const diff = Math.max(0, now - start);

                const seconds = Math.floor((diff / 1000) % 60);
                const minutes = Math.floor((diff / (1000 * 60)) % 60);
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

                setDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            };

            updateTimer(); // Initial call
            interval = setInterval(updateTimer, 1000);
        } else {
            setDuration('00:00:00');
        }
        return () => clearInterval(interval);
    }, [isRunning, startTime]);

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col justify-center items-center text-center h-full">
            <h3 className="text-gray-400 text-sm mb-4 uppercase tracking-wide font-semibold flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                Live Execution
            </h3>

            <div className={`relative w-40 h-40 rounded-full flex items-center justify-center mb-6 transition-all duration-500 border-4 ${isRunning ? 'bg-green-900/10 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'bg-red-900/10 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]'}`}>
                <Zap size={64} className={`transition-colors duration-300 ${isRunning ? 'text-green-400 animate-pulse' : 'text-red-400'}`} />
                {isRunning && (
                    <div className="absolute inset-0 rounded-full border-4 border-green-400 opacity-20 animate-ping"></div>
                )}
            </div>

            <div className={`text-3xl font-bold tracking-wider mb-4 ${isRunning ? 'text-green-400' : 'text-red-400'}`}>
                {isRunning ? 'ACTIVE' : 'IDLE'}
            </div>

            <div className="bg-gray-900 px-8 py-4 rounded-xl border border-gray-800 w-full max-w-xs flex justify-center items-center">
                <Timer className="text-blue-400 mr-3" size={24} />
                <span className="text-3xl font-mono text-blue-100 font-bold">{duration}</span>
            </div>
        </div>
    );
};

export default LiveIndicators;
