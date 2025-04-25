import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2pdf from 'html2pdf.js';
import { endpoints } from '../constants/api';
import { exportToCSV } from '../utils/csvExport';

const ResearchReport = ({ data, setIsLoading, onBack }) => {
  const [report, setReport] = useState(null);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const reportRef = useRef(null);

  const fetchReport = async () => {
    if (!data.projectId) {
      setError('Missing project ID. Please go back and complete previous steps.');
      return;
    }

    setIsLocalLoading(true);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoints.generateReportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: data.projectId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate research report');
      }

      const reportData = await response.json();
      setReport(reportData);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.message || 'An error occurred while generating the research report');
    } finally {
      setIsLocalLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (data.projectId && !report) {
      fetchReport();
    }
  }, [data.projectId]);

  const handleDownloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: [15, 15, 15, 15],
      filename: `${data.projectName || 'Research'}_Report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };
  
  const handleDownloadAllDataCSV = () => {
    // Create project summary with all data
    const projectData = [{
      project_name: data.projectName,
      disease: data.disease,
      project_id: data.projectId,
      similar_diseases_count: data.similarDiseases?.length || 0,
      targets_count: data.targets?.length || 0,
      structures_count: data.structures?.length || 0,
      created_at: data.createdAt ? new Date(data.createdAt * 1000).toISOString() : 'Unknown'
    }];
    
    const headers = [
      { label: 'Project Name', key: 'project_name' },
      { label: 'Disease', key: 'disease' },
      { label: 'Project ID', key: 'project_id' },
      { label: 'Similar Diseases Count', key: 'similar_diseases_count' },
      { label: 'Targets Count', key: 'targets_count' },
      { label: 'Structures Count', key: 'structures_count' },
      { label: 'Created At', key: 'created_at' }
    ];
    
    exportToCSV(projectData, headers, `${data.projectName || 'Research'}_project_summary.csv`);
  };

  // Custom components for ReactMarkdown to handle special links
  const components = {
    a: ({ node, ...props }) => {
      const href = props.href || '';
      
      // Handle PDB IDs
      if (props.children && typeof props.children[0] === 'string' && 
          props.children[0].match(/^[0-9][A-Za-z0-9]{3}$/) && 
          !href.startsWith('http')) {
        return (
          <a 
            href={`https://www.rcsb.org/structure/${props.children[0]}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {props.children}
          </a>
        );
      }
      
      // Handle PMID references
      if (href.includes('PMID:') || href.includes('PMID: ') || 
          (props.children && props.children[0] && props.children[0].toString().includes('PMID:'))) {
        const pmid = href.includes('PMID:') 
          ? href.split('PMID:')[1].trim() 
          : props.children[0].toString().split('PMID:')[1].trim();
        return (
          <a 
            href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {props.children}
          </a>
        );
      }
      
      // Handle UniProt IDs
      if (props.children && typeof props.children[0] === 'string' &&
          props.children[0].match(/^[A-Z][0-9][A-Z0-9]{3}[0-9][A-Z][A-Z0-9]{2}[0-9]$/) && 
          !href.startsWith('http')) {
        return (
          <a 
            href={`https://www.uniprot.org/uniprotkb/${props.children[0]}/entry`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {props.children}
          </a>
        );
      }
      
      // Default link behavior
      return <a {...props} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" />;
    },
    // Custom rendering for code blocks to add proper styling
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="bg-gray-50 rounded-md p-4 my-4 overflow-auto">
          <pre className={className}>
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      ) : (
        <code className={`${className} bg-gray-100 px-1 py-0.5 rounded`} {...props}>
          {children}
        </code>
      );
    },
    // Enhanced styling for headings
    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-5 mb-2" {...props} />,
    h4: ({ node, ...props }) => <h4 className="text-lg font-semibold mt-4 mb-2" {...props} />,
    // Style for paragraphs
    p: ({ node, ...props }) => <p className="my-3 text-gray-800 leading-relaxed" {...props} />,
    // Style for lists
    ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-3" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-3" {...props} />,
    li: ({ node, ...props }) => <li className="my-1" {...props} />,
    // Style for blockquotes
    blockquote: ({ node, ...props }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600" {...props} />
    ),
    // Enhanced styling for strong (bold)
    strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
    // Enhanced styling for emphasis (italics)
    em: ({ node, ...props }) => <em className="italic text-gray-900" {...props} />,
  };

  // Function to process text and add hyperlinks for PDB, PubMed and UniProt IDs
  const processMarkdownText = (text) => {
    if (!text) return '';
    
    // Process PDB IDs (format: 4 characters, first is digit, rest are alphanumeric)
    let processed = text.replace(/\b([0-9][A-Za-z0-9]{3})\b/g, '[$1](https://www.rcsb.org/structure/$1)');
    
    // Process PubMed IDs with multiple references
    // First, find all PMID reference patterns
    processed = processed.replace(/\bPMID:\s*((?:\d+(?:,\s*\d+)*)+)/g, (match, pmidGroup) => {
      // Split the PMID group by commas and create links for each
      const pmids = pmidGroup.split(/,\s*/);
      return pmids.map(pmid => 
        `[PMID: ${pmid}](https://pubmed.ncbi.nlm.nih.gov/${pmid.trim()}/)`
      ).join(', ');
    });
    
    // Process UniProt IDs (format like P11413, P14735)
    processed = processed.replace(/\b([A-Z][0-9][A-Z0-9]{3}[0-9][A-Z][A-Z0-9]{2}[0-9])\b/g, 
                              '[$1](https://www.uniprot.org/uniprotkb/$1/entry)');
    
    return processed;
  };

  // Special processing for target section to remove code block formatting 
  // when it contains markdown, but keep actual code blocks
  const processTargetSection = (text) => {
    if (!text) return '';
    
    // Check if the target section is wrapped in a code block
    if (text.startsWith('```markdown') && text.endsWith('```')) {
      // Extract content from within the code block
      return text.slice('```markdown'.length, -3).trim();
    }
    
    return text;
  };

  // Display loading state
  if (isLocalLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold mb-6">Research Report</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg text-gray-700">Generating comprehensive research report...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments to complete</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Research Report</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 mt-2">{error}</p>
          <button
            onClick={fetchReport}
            className="mt-4 bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If no report data yet, show placeholder
  if (!report) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Research Report</h2>
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="bg-blue-50 inline-block rounded-full p-4 mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold">Preparing Research Report</h3>
          <p className="text-gray-600 mt-2">Please wait while we generate your comprehensive research report.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Research Report</h2>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadAllDataCSV}
            className="flex items-center bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Download CSV
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8" ref={reportRef}>
        <div className="prose prose-lg max-w-none">
          {report.info_section && (
            <div className="mb-8">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                components={components}
              >
                {processMarkdownText(report.info_section)}
              </ReactMarkdown>
            </div>
          )}

          {report.target_section && (
            <div>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                components={components}
              >
                {processMarkdownText(processTargetSection(report.target_section))}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={onBack}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
        >
          Back to PDB Filtering
        </button>
        <div className="text-center text-gray-500 text-sm">
          <p>This report was automatically generated based on analysis of the disease and identified targets.</p>
          <p className="mt-1">© {new Date().getFullYear()} AI Drug Discovery Pipeline</p>
        </div>
      </div>
    </div>
  );
};

export default ResearchReport; 