import { useEffect, useRef } from 'react';

/**
 * PDBViewer component using Mol* for visualization
 * @param {Object} props Component props
 * @param {string} props.pdbId The PDB ID to visualize
 * @param {number|string} props.width Width of the viewer (default 400px or can be percentage string)
 * @param {number|string} props.height Height of the viewer (default 400px)
 * @param {React.ReactNode} props.children Optional content to render below the viewer
 */
const PDBViewer = ({ pdbId, width = 400, height = 400, children }) => {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // If pdbId changes, we might need to refresh the iframe
    if (iframeRef.current) {
      // Update iframe src to load the new structure
      iframeRef.current.src = getMolstarUrl(pdbId);
    }
  }, [pdbId]);

  // Function to generate the Mol* URL with proper parameters
  const getMolstarUrl = (pdbId) => {
    // Use parameters to focus purely on the structure visualization 
    // Hide UI panels and toolbars to create a cleaner viewing experience
    return `https://molstar.org/viewer/?pdb=${pdbId}&expand-all=1&hide-controls=1&hide-settings=1&hide-sequence=1&hide-expanded=1&hide-inactive=1&collapse-left-panel=1&hide-animation-controls=1&snapshot-url=https://molstar.org/viewer/snapshot/preset-structure-representation.molj`;
  };

  // Convert width to proper CSS value
  const widthStyle = typeof width === 'string' ? width : `${width}px`;
  // Convert height to proper CSS value
  const heightStyle = typeof height === 'string' ? height : `${height}px`;

  return (
    <div className="flex flex-col">
      <div 
        ref={containerRef} 
        className="relative overflow-hidden flex flex-col mx-auto rounded-lg border dark:border-gray-700 shadow-molecule bg-white dark:bg-gray-800"
        style={{ 
          width: widthStyle, 
          height: heightStyle
        }}
        data-pdb-id={pdbId}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="molecule-icon text-4xl opacity-20">🧪</div>
        </div>
        <iframe
          ref={iframeRef}
          src={getMolstarUrl(pdbId)}
          className="absolute inset-0 w-full h-full border-none"
          title={`Mol* visualization of ${pdbId}`}
          allowFullScreen
          loading="eager"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
      
      {/* Render children if provided */}
      {children}
    </div>
  );
};

export default PDBViewer; 