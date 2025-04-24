import React, { useState } from 'react';

const TargetFiltering = ({ onNext, onBack, data, setData }) => {
  const [selectedStructure, setSelectedStructure] = useState(null);

  // Dummy data for PDB structures
  const pdbStructures = [
    {
      pdbId: '1HK4',
      description: 'Crystal structure of human insulin-degrading enzyme in complex with insulin',
      ligands: ['INS', 'ATP', 'MG'],
      abstract: 'The crystal structure reveals the molecular basis for substrate recognition and cleavage by IDE.',
      resolution: '2.6Å'
    },
    {
      pdbId: '2B4S',
      description: 'Structure of the insulin receptor tyrosine kinase in complex with inhibitor',
      ligands: ['ATP', 'ADP', 'Mg2+'],
      abstract: 'Structure determination provides insights into insulin receptor activation mechanism.',
      resolution: '1.9Å'
    },
    {
      pdbId: '3EKK',
      description: 'Crystal structure of glucose-6-phosphate dehydrogenase',
      ligands: ['NADP', 'G6P'],
      abstract: 'The structure reveals the catalytic mechanism of G6PD.',
      resolution: '2.3Å'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Target Filtering</h2>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">PDB Structures</h3>
          <div className="space-y-4">
            {pdbStructures.map((structure) => (
              <div
                key={structure.pdbId}
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedStructure?.pdbId === structure.pdbId
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:border-gray-400'
                }`}
                onClick={() => setSelectedStructure(structure)}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold">{structure.pdbId}</h4>
                  <span className="text-sm text-gray-500">{structure.resolution}</span>
                </div>
                <p className="text-sm mt-2">{structure.description}</p>
                <div className="mt-2">
                  <p className="text-sm font-medium">Co-crystal Ligands:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {structure.ligands.map((ligand, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                      >
                        {ligand}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Structure Details</h3>
          {selectedStructure ? (
            <div className="p-4 border rounded-lg">
              <h4 className="font-bold text-lg">{selectedStructure.pdbId}</h4>
              <p className="mt-2">{selectedStructure.description}</p>
              <div className="mt-4">
                <h5 className="font-medium">Abstract</h5>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedStructure.abstract}
                </p>
              </div>
              <div className="mt-4">
                <h5 className="font-medium">Resolution</h5>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedStructure.resolution}
                </p>
              </div>
              <div className="mt-4">
                <h5 className="font-medium">Ligands</h5>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedStructure.ligands.map((ligand, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full"
                    >
                      {ligand}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border rounded-lg bg-gray-50">
              <p className="text-gray-500 text-center">
                Select a structure to view details
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Proceed to PDB Filtering
        </button>
      </div>
    </div>
  );
};

export default TargetFiltering; 