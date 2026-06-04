import { memo, useState, useMemo } from 'react';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

function Step4Shares({ receiptGrandTotal, setStep }) {
  const bill = useBillStore((s) => s.bill);
  const updateBill = useBillStore((s) => s.updateBill);
  const assignments = useBillStore((s) => s.assignments);
  const toggleAssignment = useBillStore((s) => s.toggleAssignment);
  const updatePerson = useBillStore((s) => s.updatePerson);
  const [splitTab, setSplitTab] = useState('item');

  const persons = useMemo(() => bill.persons || [], [bill.persons]);
  const items = useMemo(() => bill.items || [], [bill.items]);
  const totalBillSubtotal = items.reduce((sum, item) => sum + item.price, 0);
  const payerName = useMemo(() => persons.find(p => p.id === bill.payerId)?.name || 'None selected', [persons, bill.payerId]);

  if (persons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 w-full text-slate-200 p-8">
        <Icon name="people_outline" className="text-6xl text-slate-800 mb-4" />
        <p className="text-sm font-bold text-slate-500 mb-1">No participants added</p>
        <p className="text-[10px] text-slate-600 mb-6">Go back to Step 3 and add people first.</p>
        <button onClick={() => setStep(3)}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-1.5 border-none outline-none cursor-pointer"
        >
          <Icon name="arrow_back" className="text-xs" /> Back: Add People
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 flex-1 min-h-0 w-full text-slate-200">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-8 bg-card border border-slate-900 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Grand Total</span>
            <span className="text-3xl font-black text-white font-numeric">Rp {receiptGrandTotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="hidden md:block w-px h-10 bg-slate-900" />
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Payer</span>
            <span className="text-sm font-extrabold text-indigo-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              {payerName}
            </span>
          </div>
        </div>
        <div className="col-span-12 md:col-span-4 bg-card border border-slate-900 rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2 text-center">Split Strategy</span>
          <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl">
            {['equal', 'item', 'percent', 'custom'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSplitTab(tab);
                  const splitMap = { equal: 'equal', percent: 'percentage', custom: 'custom' };
                  updateBill({ splitType: splitMap[tab] || 'equal' });
                }}
                className={cn(
                  "py-2 text-[9px] font-bold uppercase rounded-lg transition-all border-none outline-none cursor-pointer text-center",
                  splitTab === tab ? "bg-slate-900 text-indigo-400 shadow" : "text-slate-500 hover:text-slate-350"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-slate-900 rounded-2xl p-6 flex flex-col flex-1 min-h-[460px] justify-between">
        <div>
          {splitTab === 'equal' && (
            <div className="flex flex-col items-center justify-center text-center py-12 max-w-md mx-auto">
              <div className="w-16 h-16 bg-indigo-950/40 border border-indigo-900/60 text-indigo-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                <Icon name="call_split" className="text-2xl" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">Split Equal Shares</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-6">
                This will automatically divide the grand total of <span className="text-slate-300 font-bold">Rp {receiptGrandTotal.toLocaleString('id-ID')}</span> equally among all <span className="text-slate-300 font-bold">{persons.length}</span> participants.
              </p>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 w-full mb-6 font-numeric">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Share Per Person</span>
                <span className="text-xl font-black text-indigo-400">Rp {Math.round(receiptGrandTotal / (persons.length || 1)).toLocaleString('id-ID')}</span>
              </div>
              <button
                onClick={() => {
                  persons.forEach(p => {
                    items.forEach(item => {
                      if (!assignments[p.id]?.[item.id]) {
                        toggleAssignment(p.id, item.id);
                      }
                    });
                  });
                  setStep(5);
                }}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs shadow-md border-none outline-none cursor-pointer transition-all"
              >
                Apply Equal Split
              </button>
            </div>
          )}

          {splitTab === 'item' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">High-Density Spreadsheet Split Grid</h4>
                <button
                  onClick={() => {
                    persons.forEach(p => {
                      items.forEach(item => {
                        if (!assignments[p.id]?.[item.id]) toggleAssignment(p.id, item.id);
                      });
                    });
                  }}
                  className="text-[9px] font-extrabold uppercase text-indigo-400 hover:text-indigo-300 transition-colors border border-indigo-900/30 bg-indigo-950/20 px-2.5 py-1.5 rounded-lg cursor-pointer"
                >
                  Split ALL Items
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/30 hide-scrollbar">
                <table className="w-full border-collapse text-left text-xs font-semibold font-numeric">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900">
                      <th scope="col" className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-950 z-20 min-w-[200px]">Item name</th>
                      <th scope="col" className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right">Price</th>
                      <th scope="col" className="px-6 py-4 text-[9px] font-bold text-indigo-400 uppercase tracking-widest text-center w-20">Shared</th>
                      {persons.map(p => (
                        <th key={p.id} scope="col" className="px-4 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center min-w-[100px] truncate">{p.name || '...'}</th>
                      ))}
                      <th scope="col" className="px-6 py-4 text-[9px] font-bold text-indigo-400 uppercase tracking-widest text-right sticky right-0 bg-slate-950 z-20 w-32">Split Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {items.map(item => {
                      const assignedCount = persons.filter(p => assignments[p.id]?.[item.id]).length;
                      const costPerPerson = assignedCount > 0 ? Math.round(item.price / assignedCount) : 0;
                      const isShared = persons.length > 0 && persons.every(p => assignments[p.id]?.[item.id]);
                      return (
                        <tr key={item.id} className="hover:bg-slate-900/20 transition-colors group">
                          <td className="px-6 py-4 sticky left-0 bg-card group-hover:bg-table-hover z-10 transition-colors font-bold text-white truncate max-w-[200px]">{item.name || 'Unnamed Item'}</td>
                          <td className="px-6 py-4 text-right text-slate-400">Rp {item.price.toLocaleString('id-ID')}</td>
                          <td className="px-6 py-4 text-center">
                            <input type="checkbox" checked={isShared}
                              onChange={() => {
                                const targetVal = !isShared;
                                persons.forEach(p => {
                                  const currentlyAssigned = !!assignments[p.id]?.[item.id];
                                  if (currentlyAssigned !== targetVal) toggleAssignment(p.id, item.id);
                                });
                              }}
                              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          {persons.map(p => (
                            <td key={p.id} className="px-4 py-4 text-center">
                              <input type="checkbox" checked={assignments[p.id]?.[item.id] || false}
                                onChange={() => toggleAssignment(p.id, item.id)}
                                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
                              />
                            </td>
                          ))}
                          <td className="px-6 py-4 text-right text-indigo-400 font-bold sticky right-0 bg-card group-hover:bg-table-hover z-10 transition-colors">Rp {costPerPerson.toLocaleString('id-ID')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {splitTab === 'percent' && (
            <div className="max-w-2xl mx-auto w-full space-y-6 py-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Adjust Custom Percentages</span>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded">Total: 100% Recommended</span>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
                {persons.map((p) => {
                  const currentPercent = p.percentage || 0;
                  const allocatedAmount = Math.round(receiptGrandTotal * (currentPercent / 100));
                  return (
                    <div key={p.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col gap-3 font-numeric">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">{p.name || 'Unnamed'}</span>
                        <span className="text-xs font-black text-indigo-400">Rp {allocatedAmount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input type="range" min="0" max="100" value={currentPercent}
                          onChange={(e) => { const v = parseInt(e.target.value) || 0; updatePerson(p.id, { percentage: v }); }}
                          className="flex-1 accent-indigo-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="w-16 relative">
                          <input type="number" min="0" max="100"
                            value={currentPercent === 0 ? '' : currentPercent}
                            onChange={(e) => { const v = parseInt(e.target.value) || 0; updatePerson(p.id, { percentage: v }); }}
                            className="w-full text-right bg-slate-950 border border-slate-900 rounded-lg py-1 px-2 text-xs font-bold text-white outline-none focus:border-indigo-500" placeholder="0"
                          />
                          <span className="absolute right-2.5 top-1.5 text-[9px] font-bold text-slate-600">%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {splitTab === 'custom' && (
            <div className="max-w-xl mx-auto w-full space-y-6 py-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Key In Absolute Amounts</span>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded">Subtotal: Rp {totalBillSubtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
                {persons.map((p) => {
                  const currentAmount = p.customAmount || 0;
                  return (
                    <div key={p.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex justify-between items-center font-numeric">
                      <span className="text-xs font-bold text-white">{p.name || 'Unnamed'}</span>
                      <div className="w-44 relative">
                        <span className="absolute left-3 top-2.5 text-[9px] font-bold text-slate-600">Rp</span>
                        <input type="number" value={currentAmount === 0 ? '' : currentAmount}
                          onChange={(e) => { const v = parseFloat(e.target.value) || 0; updatePerson(p.id, { customAmount: v }); }}
                          className="w-full text-right bg-slate-950 border border-slate-900 rounded-xl py-2 pl-8 pr-3 text-xs font-bold text-white outline-none focus:border-indigo-500" placeholder="0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-900 flex justify-between items-center gap-3">
          <button onClick={() => setStep(3)}
            className="px-5 py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer outline-none"
          >
            <Icon name="arrow_back" className="text-xs" /> Back
          </button>
          <button onClick={() => setStep(5)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-1.5 border-none outline-none cursor-pointer"
          >
            Next: Settlement <Icon name="arrow_forward" className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(Step4Shares);
