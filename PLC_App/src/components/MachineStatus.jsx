import React from 'react';
import { Activity, AlertTriangle, Ruler, Database, Hash, Tag, Power } from 'lucide-react';

const MachineStatus = ({ data }) => {
    if (!data) return <div className="p-4 bg-gray-800 rounded-lg animate-pulse h-64">Loading Status...</div>;

    const isRunning = data.machineRunning;

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center text-white">
                <Activity className="mr-2 text-blue-400" /> Machine Status
            </h2>

            <div className="grid grid-cols-2 gap-4">
                {/* Connection Status / Running */}
                <div className={`p-4 rounded-lg flex items-center justify-between ${isRunning ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
                    <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <p className={`text-xl font-bold ${isRunning ? 'text-green-400' : 'text-red-400'}`}>
                            {isRunning ? 'RUNNING' : 'STOPPED'}
                        </p>
                    </div>
                    <Power className={isRunning ? 'text-green-400' : 'text-red-400'} size={32} />
                </div>

                {/* Alarm Code */}
                <div className={`p-4 rounded-lg flex items-center justify-between ${data.alarmCode > 0 ? 'bg-red-900/30 border border-red-500' : 'bg-gray-700/30 border border-gray-600'}`}>
                    <div>
                        <p className="text-sm text-gray-400">Alarm Code</p>
                        <p className="text-xl font-bold text-white">{data.alarmCode}</p>
                    </div>
                    <AlertTriangle className={data.alarmCode > 0 ? 'text-red-500' : 'text-gray-500'} size={32} />
                </div>

                {/* Fabric Length */}
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                    <div className="flex items-center mb-1">
                        <Ruler className="text-purple-400 mr-2" size={18} />
                        <p className="text-sm text-gray-400">Fabric Length</p>
                    </div>
                    <p className="text-2xl font-mono text-white">{data.fabricLength?.toFixed(1) || 0} m</p>
                </div>

                {/* Total Production */}
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                    <div className="flex items-center mb-1">
                        <Database className="text-yellow-400 mr-2" size={18} />
                        <p className="text-sm text-gray-400">Total Production</p>
                    </div>
                    <p className="text-2xl font-mono text-white">{data.totalProduction?.toFixed(0) || 0}</p>
                </div>

                {/* Process ID */}
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                    <div className="flex items-center mb-1">
                        <Hash className="text-blue-300 mr-2" size={18} />
                        <p className="text-sm text-gray-400">Process ID</p>
                    </div>
                    <p className="text-lg font-mono text-white truncate" title={data.processId}>{data.processId || 'N/A'}</p>
                </div>

                {/* Textile ID */}
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                    <div className="flex items-center mb-1">
                        <Tag className="text-pink-300 mr-2" size={18} />
                        <p className="text-sm text-gray-400">Textile ID</p>
                    </div>
                    <p className="text-lg font-mono text-white truncate" title={data.textileId}>{data.textileId || 'N/A'}</p>
                </div>
            </div>
        </div>
    );
};

export default MachineStatus;
