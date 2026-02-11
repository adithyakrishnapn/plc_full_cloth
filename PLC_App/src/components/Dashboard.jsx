import React, { useState, useEffect } from 'react';
import MachineStatus from './MachineStatus';
import LiveIndicators from './LiveIndicators';
import TodayStats from './TodayStats';
import DefectFeed from './DefectFeed';
import ProcessHistory from './ProcessHistory';

import socket from '../services/socket';
import {
    getLatestData,
    getCurrentProcess,
    getProcessHistory,
    getDefects,
    getStats
} from '../services/api';

const Dashboard = () => {
    const [telemetry, setTelemetry] = useState(null);
    const [currentProcess, setCurrentProcess] = useState(null);
    const [history, setHistory] = useState([]);
    const [defects, setDefects] = useState([]);
    const [stats, setStats] = useState({});

    const [isConnected, setIsConnected] = useState(socket.connected);

    const fetchData = async () => {
        try {
            const [
                latestRes,
                processRes,
                historyRes,
                defectsRes,
                statsRes
            ] = await Promise.all([
                getLatestData(),
                getCurrentProcess(),
                getProcessHistory(),
                getDefects(),
                getStats()
            ]);

            setTelemetry(latestRes.data);
            setCurrentProcess(processRes.data);
            setHistory(historyRes.data);
            setDefects(defectsRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Error fetching initial data:', err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await getStats();
            setStats(res.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchData();

        // Socket Listeners
        const onConnect = () => {
            console.log('Connected to socket');
            setIsConnected(true);
        };

        const onDisconnect = () => {
            console.log('Disconnected from socket');
            setIsConnected(false);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        socket.on('telemetry_update', (data) => {
            setTelemetry(data);
        });

        socket.on('process_started', (data) => {
            setCurrentProcess(data);
            fetchStats(); // Update running/downtime stats possibly
        });

        socket.on('process_ended', (data) => {
            setCurrentProcess(null);
            // Add to history
            setHistory(prev => [data, ...prev].slice(0, 20));
            fetchStats();
        });

        socket.on('defect_detected', (data) => {
            setDefects(prev => [data, ...prev]);
            fetchStats();
        });

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('telemetry_update');
            socket.off('process_started');
            socket.off('process_ended');
            socket.off('defect_detected');
        };
    }, []);

    // Determine machine running status
    const isRunning = telemetry?.machineRunning || false;
    // Get start time from current process OR telemetry if needed
    const startTime = currentProcess?.startTime || telemetry?.processStart;

    return (
        <div className="min-h-screen bg-[#0b0f1a] text-white p-6 font-sans">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">PLC Dashboard</h1>
                    <p className="text-gray-400 text-sm mt-1">Real-time Cloth Production Monitoring</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                    <span className="text-xs text-gray-400 font-mono">{isConnected ? 'LIVE' : 'DISCONNECTED'}</span>
                </div>
            </header>

            {/* 3 Columns Layout: MachineStatus (2 cols) | LiveIndicators (1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2">
                    <MachineStatus data={telemetry} />
                </div>
                <div className="lg:col-span-1 h-full">
                    <LiveIndicators isRunning={isRunning} startTime={startTime} />
                </div>
            </div>

            {/* Stats Row */}
            <TodayStats stats={stats} />

            {/* 2 Columns: Defect Feed | Process History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                <div className="lg:col-span-1 h-full">
                    <DefectFeed defects={defects} />
                </div>
                <div className="lg:col-span-2 h-full overflow-hidden">
                    <ProcessHistory history={history} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
