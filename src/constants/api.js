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
}; 