import React, { useState } from 'react';

const PDBFiltering = ({ onNext }) => {
  const [activeTab, setActiveTab] = useState('group');

  // Dummy data for filtering results
  const filteringResults = {
    group: [
      { pdbId: '1HK4', score: 0.95, group: 1 },
      { pdbId: '2B4S', score: 0.92, group: 1 },
      { pdbId: '3EKK', score: 0.88, group: 1 },
      { pdbId: '4XYZ', score: 0.85, group: 2 },
      { pdbId: '5ABC', score: 0.82, group: 2 }
    ],
    reverse: [
      { pdbId: '1HK4', score: 0.94 },
      { pdbId: '2B4S', score: 0.91 },
      { pdbId: '3EKK', score: 0.89 },
      { pdbId: '5ABC', score: 0.86 },
      { pdbId: '4XYZ', score: 0.83 }
    ],
    uniprot: {
      'P11413': ['1HK4', '2B4S'],
      'P14735': ['3EKK'],
      'P35568': ['4XYZ', '5ABC']
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">PDB Filtering Results</h2>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['group', 'reverse', 'uniprot'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Filtering
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'group' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Group Filtering Results</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2">PDB ID</th>
                      <th className="px-4 py-2">Score</th>
                      <th className="px-4 py-2">Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteringResults.group.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-2">{item.pdbId}</td>
                        <td className="px-4 py-2">{item.score.toFixed(2)}</td>
                        <td className="px-4 py-2">{item.group}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reverse' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Reverse Order Results</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2">PDB ID</th>
                      <th className="px-4 py-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteringResults.reverse.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-2">{item.pdbId}</td>
                        <td className="px-4 py-2">{item.score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'uniprot' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">UniProt Filtering Results</h3>
              <div className="space-y-4">
                {Object.entries(filteringResults.uniprot).map(([uniprotId, pdbIds]) => (
                  <div key={uniprotId} className="p-4 border rounded-lg">
                    <h4 className="font-medium">UniProt ID: {uniprotId}</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pdbIds.map((pdbId) => (
                        <span
                          key={pdbId}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {pdbId}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Generate Research Report
        </button>
      </div>
    </div>
  );
};

export default PDBFiltering; 