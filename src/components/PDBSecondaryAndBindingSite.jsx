import { useState, useEffect } from 'react';

/**
 * Component to display secondary structure and binding site information for a PDB structure
 * @param {Object} props Component props
 * @param {string} props.pdbId The PDB ID to fetch data for
 * @param {boolean} props.isFullScreen Whether the component is being displayed in full-screen mode
 */
const PDBSecondaryAndBindingSite = ({ pdbId, isFullScreen = false }) => {
  const [secondaryStructure, setSecondaryStructure] = useState(null);
  const [bindingSites, setBindingSites] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('secondary');
  // State to track selected chains for each entity
  const [selectedChains, setSelectedChains] = useState({});
  // State to track selected chain for binding sites
  const [selectedBindingChain, setSelectedBindingChain] = useState('all');

  useEffect(() => {
    if (!pdbId) return;
    
    setLoading(true);
    setError(null);
    // Reset chain selections on PDB change
    setSelectedChains({});
    setSelectedBindingChain('all');
    
    const fetchData = async () => {
      try {
        // Fetch secondary structure data
        const secondaryResponse = await fetch(`https://www.ebi.ac.uk/pdbe/api/pdb/entry/secondary_structure/${pdbId.toLowerCase()}`);
        if (!secondaryResponse.ok) {
          throw new Error(`Failed to fetch secondary structure data: ${secondaryResponse.status}`);
        }
        const secondaryData = await secondaryResponse.json();
        setSecondaryStructure(secondaryData);
        
        // Initialize selectedChains with first chain of each entity
        if (secondaryData[pdbId.toLowerCase()]) {
          const initialSelectedChains = {};
          secondaryData[pdbId.toLowerCase()].molecules.forEach(molecule => {
            if (molecule.chains && molecule.chains.length > 0) {
              initialSelectedChains[molecule.entity_id] = molecule.chains[0].chain_id;
            }
          });
          setSelectedChains(initialSelectedChains);
        }
        
        // Fetch binding site data
        const bindingSiteResponse = await fetch(`https://www.ebi.ac.uk/pdbe/api/pdb/entry/binding_sites/${pdbId.toLowerCase()}`);
        if (!bindingSiteResponse.ok) {
          throw new Error(`Failed to fetch binding site data: ${bindingSiteResponse.status}`);
        }
        const bindingSiteData = await bindingSiteResponse.json();
        setBindingSites(bindingSiteData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching PDB data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [pdbId]);

  // Handle chain selection change for secondary structure
  const handleChainChange = (entityId, chainId) => {
    setSelectedChains(prev => ({
      ...prev,
      [entityId]: chainId
    }));
  };

  // Get available binding site chains
  const getBindingSiteChains = () => {
    if (!bindingSites || !bindingSites[pdbId.toLowerCase()]) return [];
    
    const sites = bindingSites[pdbId.toLowerCase()];
    const chains = new Set();
    
    sites.forEach(site => {
      if (site.site_residues) {
        site.site_residues.forEach(residue => {
          chains.add(residue.chain_id);
        });
      }
    });
    
    return Array.from(chains);
  };

  const renderSecondaryStructure = () => {
    if (!secondaryStructure || !secondaryStructure[pdbId.toLowerCase()]) {
      return <p className="text-gray-500 dark:text-gray-400">No secondary structure information available.</p>;
    }
    
    const data = secondaryStructure[pdbId.toLowerCase()];
    
    return (
      <div className="space-y-4">
        {data.molecules.map((molecule, molIndex) => {
          // Get all available chains for this entity
          const availableChains = molecule.chains.map(chain => chain.chain_id);
          const selectedChain = selectedChains[molecule.entity_id] || (availableChains.length > 0 ? availableChains[0] : null);
          
          // Find the selected chain data
          const chainData = molecule.chains.find(chain => chain.chain_id === selectedChain);
          
          return (
            <div key={`molecule-${molIndex}`} className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex flex-wrap items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Entity {molecule.entity_id}
                </h4>
                
                {/* Chain selection dropdown */}
                {availableChains.length > 1 && (
                  <div className="flex items-center mt-1 sm:mt-0">
                    <label htmlFor={`chain-select-${molecule.entity_id}`} className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">
                      Chain:
                    </label>
                    <select
                      id={`chain-select-${molecule.entity_id}`}
                      className="text-xs border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={selectedChain}
                      onChange={(e) => handleChainChange(molecule.entity_id, e.target.value)}
                    >
                      {availableChains.map(chainId => (
                        <option key={chainId} value={chainId}>Chain {chainId}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {chainData && chainData.secondary_structure && (
                <div className="mt-2 space-y-3">
                  {/* Helices */}
                  {chainData.secondary_structure.helices && chainData.secondary_structure.helices.length > 0 && (
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Helices ({chainData.secondary_structure.helices.length})</h6>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                        {chainData.secondary_structure.helices.map((helix, helixIndex) => (
                          <div key={`helix-${helixIndex}`} className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800/30">
                            <div className="flex justify-between">
                              <span className="font-medium">Residues:</span>
                              <span>{helix.start.residue_number} - {helix.end.residue_number}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Length:</span>
                              <span>{helix.end.residue_number - helix.start.residue_number + 1} residues</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Strands */}
                  {chainData.secondary_structure.strands && chainData.secondary_structure.strands.length > 0 && (
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">β-Strands ({chainData.secondary_structure.strands.length})</h6>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                        {chainData.secondary_structure.strands.map((strand, strandIndex) => (
                          <div key={`strand-${strandIndex}`} className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-100 dark:border-yellow-800/30">
                            <div className="flex justify-between">
                              <span className="font-medium">Residues:</span>
                              <span>{strand.start.residue_number} - {strand.end.residue_number}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Sheet ID:</span>
                              <span>{strand.sheet_id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Length:</span>
                              <span>{strand.end.residue_number - strand.start.residue_number + 1} residues</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(!chainData.secondary_structure.helices || chainData.secondary_structure.helices.length === 0) && 
                   (!chainData.secondary_structure.strands || chainData.secondary_structure.strands.length === 0) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No secondary structure elements found for Chain {chainData.chain_id}.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBindingSites = () => {
    if (!bindingSites || !bindingSites[pdbId.toLowerCase()] || bindingSites[pdbId.toLowerCase()].length === 0) {
      return <p className="text-gray-500 dark:text-gray-400">No binding site information available.</p>;
    }
    
    const sites = bindingSites[pdbId.toLowerCase()];
    const bindingSiteChains = getBindingSiteChains();
    
    // Filter sites based on selected chain
    const filteredSites = sites.map(site => {
      if (selectedBindingChain === 'all') {
        return site;
      }
      
      return {
        ...site,
        site_residues: site.site_residues ? 
          site.site_residues.filter(residue => residue.chain_id === selectedBindingChain) : [],
        ligand_residues: site.ligand_residues ? 
          site.ligand_residues.filter(residue => residue.chain_id === selectedBindingChain) : []
      };
    }).filter(site => 
      selectedBindingChain === 'all' || 
      (site.site_residues && site.site_residues.length > 0) || 
      (site.ligand_residues && site.ligand_residues.length > 0)
    );
    
    return (
      <div className="space-y-4">
        {/* Chain selection for binding sites */}
        <div className="flex items-center mb-2">
          <label htmlFor="binding-chain-select" className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">
            Filter by Chain:
          </label>
          <select
            id="binding-chain-select"
            className="text-xs border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            value={selectedBindingChain}
            onChange={(e) => setSelectedBindingChain(e.target.value)}
          >
            <option value="all">All Chains</option>
            {bindingSiteChains.map(chainId => (
              <option key={chainId} value={chainId}>Chain {chainId}</option>
            ))}
          </select>
        </div>
        
        {filteredSites.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No binding sites found for the selected chain.</p>
        ) : (
          filteredSites.map((site, siteIndex) => (
            <div key={`site-${siteIndex}`} className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Site ID: {site.site_id}
                </h4>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {site.evidence_code}
                </span>
              </div>
              
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                {site.details}
              </p>
              
              {/* Ligand Residues */}
              {site.ligand_residues && site.ligand_residues.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ligand Residues
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Chain</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Residue</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Number</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Entity</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {site.ligand_residues.map((residue, residueIndex) => (
                          <tr key={`ligand-${residueIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2 whitespace-nowrap">{residue.chain_id}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{residue.chem_comp_id}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{residue.author_residue_number}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{residue.entity_id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Site Residues */}
              {site.site_residues && site.site_residues.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Site Residues
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Chain</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Residue</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Number</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Symmetry</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {site.site_residues.map((residue, residueIndex) => (
                          <tr key={`site-residue-${residueIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2 whitespace-nowrap">{residue.chain_id}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{residue.chem_comp_id}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{residue.author_residue_number}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{residue.symmetry_symbol}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className={`${isFullScreen ? 'mt-6' : 'mt-4'} bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4`}>
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">Structure Details</h3>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'secondary'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('secondary')}
        >
          Secondary Structure
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'binding'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('binding')}
        >
          Binding Sites
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">Please try again or check if the PDB ID is valid.</p>
        </div>
      ) : (
        <div className={`${isFullScreen ? 'max-h-[50vh]' : 'max-h-[400px]'} overflow-y-auto pr-1`}>
          {activeTab === 'secondary' ? renderSecondaryStructure() : renderBindingSites()}
        </div>
      )}
    </div>
  );
};

export default PDBSecondaryAndBindingSite; 