import React from 'react'

export default function ProductionLog({ rows = [] }) {
  const hasData = rows && rows.length > 0

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-[0_12px_40px_rgba(2,6,23,0.55)]">
      <h3 className="text-sm font-semibold text-slate-200">Production & Defect Log</h3>
      {hasData ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-sm text-slate-300">
            <thead className="bg-white/5 text-xs uppercase text-slate-500">
              <tr>
                {['Date', 'Batch ID', 'Fabric Length', 'Defects', 'Status'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.batch} className="border-t border-white/5">
                  <td className="px-4 py-3">{row.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">{row.batch}</td>
                  <td className="px-4 py-3">{row.length}</td>
                  <td className="px-4 py-3">{row.defects}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        row.status === 'OK'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-white/5 bg-slate-900/40 text-sm text-slate-500">
          No production log data available
        </div>
      )}
    </div>
  )
}