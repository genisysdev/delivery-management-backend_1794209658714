export function sortEmployeesByName(employees) {
    return employees.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }