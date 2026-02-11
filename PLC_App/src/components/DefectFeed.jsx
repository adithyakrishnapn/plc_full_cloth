import React from 'react';
import { AlertCircle } from 'lucide-react';

const DefectFeed = ({ defects }) => {
    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 h-full flex flex-col">
            <h3 className="text-red-400 text-lg font-bold mb-4 flex items-center">
                <AlertCircle className="mr-2" size={24} /> Live Defect Feed
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {(!defects || defects.length === 0) ? (
                    <div className="text-gray-500 text-center py-8 italic flex flex-col items-center">
                        <span className="text-4xl mb-2">✓</span>
                        No defects detected currently
                    </div>
                ) : (
                    defects.map((defect, index) => (
                        <div key={defect._id || index} className="p-3 bg-red-900/10 border-l-4 border-red-500 rounded flex justify-between items-center transition-all hover:bg-red-900/20 animate-fade-in-up">
                            <div>
                                <p className="text-xs text-red-300 font-bold uppercase mb-1">
                                    {new Date(defect.timestamp).toLocaleTimeString()}
                                </p>
                                <p className="text-gray-300 text-sm">
                                    Pos: <span className="font-mono font-bold text-white">{defect.lengthAtDetection?.toFixed(2)} m</span>
                                </p>
                            </div>
                            <div className="bg-red-500/20 px-3 py-1 rounded text-red-400 font-bold border border-red-500/50">
                                Count: {defect.count}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DefectFeed;
