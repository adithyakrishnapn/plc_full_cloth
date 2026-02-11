import React from 'react';
import { Package, Clock, Activity, BarChart2 } from 'lucide-react';

const TodayStats = ({ stats }) => {
    if (!stats) return <div className="p-4 bg-gray-800 rounded-lg h-32 animate-pulse mb-6"></div>;

    const items = [
        { label: 'Today Production', value: stats.todayProduction || 0, unit: 'm', color: 'text-blue-400', icon: Package },
        { label: 'Total Defects', value: stats.totalDefectsToday || 0, unit: '', color: 'text-red-400', icon: Activity },
        { label: 'Utilization', value: stats.utilizationPercent || 0, unit: '%', color: 'text-green-400', icon: BarChart2 },
        { label: 'Downtime', value: stats.totalDowntime || 0, unit: 'min', color: 'text-yellow-400', icon: Clock },
    ];

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 mb-6">
            <h3 className="text-gray-400 text-sm mb-4 uppercase tracking-wide font-semibold">Today's Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {items.map((item, index) => (
                    <div key={index} className="bg-gray-700/30 p-4 rounded-xl border border-gray-600 flex items-center shadow-lg transition-transform hover:scale-105">
                        <div className={`p-3 rounded-full bg-gray-600/50 mr-4 ${item.color}`}>
                            <item.icon size={24} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs uppercase mb-1">{item.label}</p>
                            <p className={`text-2xl font-bold font-mono text-white ${item.color}`}>
                                {item.value} <span className="text-sm text-gray-400 ml-1">{item.unit}</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TodayStats;
