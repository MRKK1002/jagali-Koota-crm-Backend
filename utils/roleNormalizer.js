/**
 * Role Normalizer Utility
 * Automatically normalizes and standardizes employee roles
 * Handles partial matches, typos, and case-insensitivity
 */

// Standard role definitions
const STANDARD_ROLES = {
  PROJECT_MANAGER: "Project Manager",
  SITE_SUPERVISOR: "Site Supervisor",
  PROCUREMENT_OFFICER: "Procurement Officer",
  HR_MANAGER: "HR Manager",
  ADMIN: "Admin",
  ACCOUNTANT: "Accountant",
  ENGINEER: "Engineer",
  WORKER: "Worker",
};

// Role matching patterns (case-insensitive)
const ROLE_PATTERNS = {
  [STANDARD_ROLES.PROJECT_MANAGER]: [
    /project\s*manager/i,
    /project\s*manger/i,  // typo
    /pm\b/i,              // abbreviation
    /manger\s*role/i,     // typo
    /^project$/i,         // just "project"
  ],
  [STANDARD_ROLES.SITE_SUPERVISOR]: [
    /site\s*supervisor/i,
    /site\s*suppsisor/i,  // typo
    /site\s*suppisor/i,   // typo
    /supervisor/i,
    /suppsisor/i,         // typo
    /suppisor/i,          // typo
  ],
  [STANDARD_ROLES.PROCUREMENT_OFFICER]: [
    /procurement\s*officer/i,
    /procurement/i,
    /purchase\s*officer/i,
    /purchase\s*manager/i,
  ],
  [STANDARD_ROLES.HR_MANAGER]: [
    /hr\s*manager/i,
    /human\s*resource/i,
    /\bhr\b/i,            // just "HR"
    /personnel\s*manager/i,
  ],
  [STANDARD_ROLES.ADMIN]: [
    /^admin$/i,
    /administrator/i,
    /system\s*admin/i,
  ],
  [STANDARD_ROLES.ACCOUNTANT]: [
    /accountant/i,
    /accounts/i,
    /finance\s*manager/i,
  ],
  [STANDARD_ROLES.ENGINEER]: [
    /engineer/i,
    /civil\s*engineer/i,
    /site\s*engineer/i,
  ],
  [STANDARD_ROLES.WORKER]: [
    /worker/i,
    /labour/i,
    /labor/i,
    /helper/i,
  ],
};

/**
 * Normalize a role string to standard format
 * @param {string} roleInput - The input role (can be from position, designation, or role field)
 * @returns {string} - Standardized role name
 */
function normalizeRole(roleInput) {
  if (!roleInput || typeof roleInput !== 'string') {
    return null;
  }

  const trimmedInput = roleInput.trim();
  
  // Check if it already matches a standard role exactly
  const standardRoleValues = Object.values(STANDARD_ROLES);
  if (standardRoleValues.includes(trimmedInput)) {
    return trimmedInput;
  }

  // Try to match against patterns
  for (const [standardRole, patterns] of Object.entries(ROLE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(trimmedInput)) {
        return standardRole;
      }
    }
  }

  // If no match found, return the original (capitalized)
  return trimmedInput
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalize employee role fields
 * Updates position, designation, and role to standardized values
 * @param {Object} employeeData - Employee data object
 * @returns {Object} - Employee data with normalized roles
 */
function normalizeEmployeeRoles(employeeData) {
  // Check all possible role fields
  const roleInput = 
    employeeData.position || 
    employeeData.designation || 
    employeeData.role;

  if (!roleInput) {
    return employeeData;
  }

  // Normalize the role
  const normalizedRole = normalizeRole(roleInput);

  // Set all role fields to the normalized value for consistency
  return {
    ...employeeData,
    position: normalizedRole,
    designation: normalizedRole,
    role: normalizedRole,
  };
}

/**
 * Check if an employee matches a specific role
 * @param {Object} employee - Employee object
 * @param {string} targetRole - Target role to match (e.g., "Project Manager")
 * @returns {boolean} - True if employee matches the role
 */
function employeeHasRole(employee, targetRole) {
  const normalizedTarget = normalizeRole(targetRole);
  
  const empPosition = normalizeRole(employee.position);
  const empDesignation = normalizeRole(employee.designation);
  const empRole = normalizeRole(employee.role);

  return (
    empPosition === normalizedTarget ||
    empDesignation === normalizedTarget ||
    empRole === normalizedTarget
  );
}

/**
 * Get all employees with a specific role
 * @param {Array} employees - Array of employee objects
 * @param {string} targetRole - Target role to filter
 * @returns {Array} - Filtered employees
 */
function filterEmployeesByRole(employees, targetRole) {
  return employees.filter(emp => employeeHasRole(emp, targetRole));
}

module.exports = {
  STANDARD_ROLES,
  normalizeRole,
  normalizeEmployeeRoles,
  employeeHasRole,
  filterEmployeesByRole,
};
