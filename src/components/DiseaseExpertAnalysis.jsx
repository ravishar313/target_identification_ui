import React from 'react';

const DiseaseExpertAnalysis = ({ disease, onNext }) => {
  // Dummy data for similar diseases and targets
  const similarDiseases = [
    {
      name: 'Type 1 Diabetes',
      targets: ['P11413', 'P14735', 'P35568'],
      description: 'Autoimmune disease affecting insulin production'
    },
    {
      name: 'Metabolic Syndrome',
      targets: ['P37231', 'P28482', 'Q13131'],
      description: 'Cluster of conditions affecting metabolism'
    },
    {
      name: 'Obesity',
      targets: ['P37231', 'P41159', 'P01189'],
      description: 'Chronic condition involving excess body fat'
    }
  ];

  const potentialTargets = [
    {
      uniprotId: 'P11413',
      proteinName: 'Glucose-6-phosphate 1-dehydrogenase',
      confidence: 'High',
      mechanism: 'Glucose metabolism regulation'
    },
    {
      uniprotId: 'P14735',
      proteinName: 'Insulin-degrading enzyme',
      confidence: 'Medium',
      mechanism: 'Insulin processing'
    },
    {
      uniprotId: 'P35568',
      proteinName: 'Insulin receptor substrate 1',
      confidence: 'High',
      mechanism: 'Insulin signaling pathway'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Disease Expert Analysis</h2>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Similar Diseases</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {similarDiseases.map((disease, index) => (
            <div key={index} className="p-4 border rounded-lg shadow-sm">
              <h4 className="font-bold">{disease.name}</h4>
              <p className="text-sm text-gray-600 mt-2">{disease.description}</p>
              <div className="mt-2">
                <p className="text-sm font-medium">Known Targets:</p>
                <ul className="text-sm text-gray-600">
                  {disease.targets.map((target, idx) => (
                    <li key={idx}>{target}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Potential Targets Identified</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">UniProt ID</th>
                <th className="px-4 py-2">Protein Name</th>
                <th className="px-4 py-2">Confidence</th>
                <th className="px-4 py-2">Mechanism</th>
              </tr>
            </thead>
            <tbody>
              {potentialTargets.map((target, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-2">{target.uniprotId}</td>
                  <td className="px-4 py-2">{target.proteinName}</td>
                  <td className="px-4 py-2">{target.confidence}</td>
                  <td className="px-4 py-2">{target.mechanism}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={onNext}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Proceed to Structure Analysis
      </button>
    </div>
  );
};

export default DiseaseExpertAnalysis; 