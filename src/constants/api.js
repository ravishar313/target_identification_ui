// API configuration constants
export const BaseUrl = 'http://localhost:8006';

// API endpoints
export const endpoints = {
  processDiseaseUrl: `${BaseUrl}/process_disease`,
  createProjectUrl: `${BaseUrl}/create_project`,
  listProjectsUrl: `${BaseUrl}/list_projects`,
  getPotentialTargetsUrl: `${BaseUrl}/get_potential_targets`,
  pdbFilteringUrl: `${BaseUrl}/pdb_filtering`,
  generateReportUrl: `${BaseUrl}/generate_report`,
  
  // Lead Identification endpoints
  getLeadPDBsUrl: `${BaseUrl}/lead_identification/get_pdbs`,
  diseaseCharacteristicsUrl: `${BaseUrl}/lead_identification/disease_characteristics`,
  targetCharacteristicsUrl: `${BaseUrl}/lead_identification/target_characteristics`,
  pocketCharacteristicsUrl: `${BaseUrl}/lead_identification/pocket_characteristics`,
  
  // New Lead Design endpoints
  designLeadsUrl: `${BaseUrl}/lead_identification/design_leads`,
  leadStatusUrl: `${BaseUrl}/lead_identification/lead_status`,
  getMoleculePropertiesUrl: `${BaseUrl}/lead_identification/get_properties`,
  
  // PyMol Chat endpoints
  pymolChatStatusUrl: `${BaseUrl}/pymol_chat/status`,
  pymolChatQueryUrl: `${BaseUrl}/pymol_chat/query`,
  
  // Services endpoints
  servicesJobsUrl: `${BaseUrl}/services/jobs`,
  servicesJobStatusUrl: (jobId) => `${BaseUrl}/services/jobs/${jobId}`,
}; 