import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

const ProcessHistory = ({ history }) => {
    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 mt-6 overflow-hidden">
            <h3 className="text-blue-400 text-lg font-bold mb-4 flex items-center">
                <Clock className="mr-2" size={24} /> Process History (Last 20)
            </h3>

            <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-900 text-gray-400 text-sm uppercase tracking-wider">
                            <th className="p-4 font-semibold border-b border-gray-700 w-1/6">Process ID</th>
                            <th className="p-4 font-semibold border-b border-gray-700 w-1/6">Textile ID</th>
                            <th className="p-4 font-semibold border-b border-gray-700 w-1/6">Start Time</th>
                            <th className="p-4 font-semibold border-b border-gray-700 w-1/6">End Time</th>
                            <th className="p-4 font-semibold border-b border-gray-700 w-1/6 text-right">Duration (min)</th>
                            <th className="p-4 font-semibold border-b border-gray-700 w-1/6 text-right">Production</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {(!history || history.length === 0) ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-500">No history available</td>
                            </tr>
                        ) : (
                            history.map((proc, index) => (
                                <tr key={proc._id || index} className="hover:bg-gray-700/50 transition-colors duration-150 group">
                                    <td className="p-4 text-white font-mono text-sm group-hover:text-blue-300 transition-colors" title={proc.processId}>{proc.processId}</td>
                                    <td className="p-4 text-gray-300 font-mono text-sm" title={proc.textileId}>{proc.textileId}</td>
                                    <td className="p-4 text-gray-400 text-sm">{new Date(proc.startTime).toLocaleString()}</td>
                                    <td className="p-4 text-gray-400 text-sm">{proc.endTime ? new Date(proc.endTime).toLocaleString() : '-'}</td>
                                    <td className="p-4 text-right text-yellow-300 font-mono text-sm font-bold">
                                        {proc.durationMinutes?.toFixed(1) || '-'}
                                    </td>
                                    <td className="p-4 text-right text-green-300 font-mono text-sm font-bold">
                                        {proc.fabricProcessed || proc.production || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProcessHistory;
