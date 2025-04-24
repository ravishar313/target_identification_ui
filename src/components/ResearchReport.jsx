import React from 'react';

const ResearchReport = () => {
  // Dummy data for research report
  const reportData = {
    disease: 'Type 2 Diabetes',
    summary: 'Based on our comprehensive analysis of similar diseases and their targets, we have identified several promising protein targets for Type 2 Diabetes treatment.',
    similarDiseases: [
      {
        name: 'Type 1 Diabetes',
        relevance: 'High correlation in metabolic pathways and insulin signaling'
      },
      {
        name: 'Metabolic Syndrome',
        relevance: 'Shared insulin resistance mechanisms'
      },
      {
        name: 'Obesity',
        relevance: 'Common metabolic dysregulation patterns'
      }
    ],
    identifiedTargets: [
      {
        uniprotId: 'P11413',
        name: 'Glucose-6-phosphate 1-dehydrogenase',
        rationale: 'Key enzyme in glucose metabolism pathway',
        confidence: 'High'
      },
      {
        uniprotId: 'P14735',
        name: 'Insulin-degrading enzyme',
        rationale: 'Direct involvement in insulin processing',
        confidence: 'Medium'
      }
    ],
    structuralAnalysis: {
      bestStructures: [
        {
          pdbId: '1HK4',
          resolution: '2.6Å',
          ligands: ['INS', 'ATP'],
          significance: 'Shows key binding interactions with insulin'
        },
        {
          pdbId: '2B4S',
          resolution: '1.9Å',
          ligands: ['ATP'],
          significance: 'Reveals active site configuration'
        }
      ]
    },
    recommendations: [
      'Focus on glucose metabolism pathway targets',
      'Consider dual-targeting approaches',
      'Investigate allosteric binding sites'
    ]
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Research Report</h2>

      <div className="space-y-8">
        {/* Disease and Summary */}
        <section className="bg-white p-6 rounded-lg border">
          <h3 className="text-xl font-semibold mb-4">Disease Analysis: {reportData.disease}</h3>
          <p className="text-gray-700">{reportData.summary}</p>
        </section>

        {/* Similar Diseases */}
        <section className="bg-white p-6 rounded-lg border">
          <h3 className="text-xl font-semibold mb-4">Similar Diseases Analysis</h3>
          <div className="space-y-4">
            {reportData.similarDiseases.map((disease, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">{disease.name}</h4>
                <p className="text-sm text-gray-600 mt-2">{disease.relevance}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Identified Targets */}
        <section className="bg-white p-6 rounded-lg border">
          <h3 className="text-xl font-semibold mb-4">Identified Targets</h3>
          <div className="space-y-4">
            {reportData.identifiedTargets.map((target, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{target.name}</h4>
                    <p className="text-sm text-gray-500">UniProt ID: {target.uniprotId}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    target.confidence === 'High' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {target.confidence}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{target.rationale}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Structural Analysis */}
        <section className="bg-white p-6 rounded-lg border">
          <h3 className="text-xl font-semibold mb-4">Structural Analysis</h3>
          <div className="space-y-4">
            {reportData.structuralAnalysis.bestStructures.map((structure, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">PDB ID: {structure.pdbId}</h4>
                  <span className="text-sm text-gray-500">{structure.resolution}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{structure.significance}</p>
                <div className="mt-2">
                  <span className="text-sm font-medium">Ligands: </span>
                  {structure.ligands.map((ligand, i) => (
                    <span key={i} className="text-sm text-gray-600">
                      {ligand}{i < structure.ligands.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommendations */}
        <section className="bg-white p-6 rounded-lg border">
          <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
          <ul className="list-disc list-inside space-y-2">
            {reportData.recommendations.map((rec, idx) => (
              <li key={idx} className="text-gray-700">{rec}</li>
            ))}
          </ul>
        </section>

        {/* Export Options */}
        <div className="flex justify-end space-x-4">
          <button className="px-4 py-2 border rounded-md hover:bg-gray-50">
            Export as PDF
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Share Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchReport; 