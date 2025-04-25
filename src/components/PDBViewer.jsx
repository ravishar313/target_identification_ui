import { useEffect, useRef } from 'react';

/**
 * PDBViewer component using Mol* for visualization
 * @param {Object} props Component props
 * @param {string} props.pdbId The PDB ID to visualize
 * @param {number|string} props.width Width of the viewer (default 400px or can be percentage string)
 * @param {number|string} props.height Height of the viewer (default 400px)
 */
const PDBViewer = ({ pdbId, width = 400, height = 400 }) => {
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

  // Additional style for 100% height to work properly
  const containerStyle = {
    width: widthStyle,
    height: heightStyle,
    position: 'relative',
    border: '1px solid #e2e8f0',
    borderRadius: '0.375rem',
    overflow: 'hidden',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column'
  };

  // Use position absolute for the iframe to fill the container completely
  const iframeStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none'
  };

  return (
    <div 
      ref={containerRef} 
      style={containerStyle} 
      data-pdb-id={pdbId}
    >
      <iframe
        ref={iframeRef}
        src={getMolstarUrl(pdbId)}
        style={iframeStyle}
        title={`Mol* visualization of ${pdbId}`}
        allowFullScreen
        loading="eager"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
};

export default PDBViewer; 