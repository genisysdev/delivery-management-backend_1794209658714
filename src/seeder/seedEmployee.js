import dotenv from 'dotenv';
import axios from "axios";
import EmployeeModel from '../models/employee.model.js';
import { nonBillableEmails } from '../constants/non-billable-employee.js';
import getAccessToken from '../helper/accessToken.js';
import _ from 'lodash';
import { psOnsiteEmails } from '../constants/ps-onsite-employee.js';
import { itEmails } from '../constants/it-employee.js';
import { contractAndUSEmails } from '../constants/contract-us-employee.js';
import { exceptionMails } from '../constants/exception-emails.js';
import { employeeType } from '../constants/employment-type.js';

const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: `.env.${env}` });

const MS_GRAPH_ENDPOINTS = {
  BASE: process.env.MICROSOFT_GRAPH_API,
  USERS: {
    PATH: '/users',
    QUERY: {
      EXPAND_MANAGER: "$expand=manager($select=id)"
    }
  }
};

const fetchADEmployees = async () => {
  try {
    const token = await getAccessToken();
    const departments = ['sd', 'gisi-rims', 'PS-Onsite', 'GISI-IT'];
    const allEmployees = [];

    for (const department of departments) {
      let endpoint = `${MS_GRAPH_ENDPOINTS.BASE}${MS_GRAPH_ENDPOINTS.USERS.PATH}?$filter=department eq '${department}'&${MS_GRAPH_ENDPOINTS.USERS.QUERY.EXPAND_MANAGER}`;

      while (endpoint) {
        const response = await axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        let departmentEmployees = response.data.value;

        if (department === 'PS-Onsite') {
          departmentEmployees = departmentEmployees.filter(emp =>
            emp.mail && psOnsiteEmails.includes(emp.mail.toLowerCase())
          );
        } else if (department === 'GISI-IT') {
          departmentEmployees = departmentEmployees.filter(emp =>
            emp.mail && itEmails.includes(emp.mail.toLowerCase())
          );
        } else if (department === 'sd') {
          departmentEmployees = departmentEmployees.map(emp => ({
            ...emp,
            businessPhones:
              emp.mail &&
                contractAndUSEmails.includes(emp.mail.toLowerCase()) &&
                (!emp.businessPhones || emp.businessPhones.length === 0) &&
                emp.jobTitle
                ? [emp.jobTitle]
                : emp.businessPhones
          }));
        }

        allEmployees.push(...departmentEmployees);

        // Move to next page if available
        endpoint = response.data['@odata.nextLink'] || null;
      }
    }

    return allEmployees;
  } catch (error) {
    console.error('Error fetching AD employees by department:', error);
    return [];
  }
};

const fetchWegenEmployees = async () => {
  try {
    console.log(process.env.WEGEN_EMPLOYEE_DATA);
    const response = await axios.post(
      `${process.env.WEGEN_EMPLOYEE_DATA}`,
      {},
      {
        auth: {
          username: process.env.WEGEN_USERNAME,
          password: process.env.WEGEN_PASSWORD
        },
        headers: {
          'Content-Type': process.env.URL_CONTENT_TYPE,
          'AppID': process.env.WEGEN_APP_ID
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching Wegen employees:', error.response?.status, error.message);
    return [];
  }
};

export const loadEmployees = async () => {
  try {
    const [adEmployees, wegenEmployees] = await Promise.all([
      fetchADEmployees(),
      fetchWegenEmployees()
    ]);

    const employees = [];

    for (const adEmployee of adEmployees) {
      if (adEmployee.businessPhones && adEmployee.businessPhones.length > 0) {
        const genisysId = adEmployee.businessPhones[0];
        const wegenEmployee = wegenEmployees.find(emp => emp.employeeID === genisysId);

        if (wegenEmployee) {
          employees.push({
            id: adEmployee.id,
            genisysId,
            displayName: adEmployee.displayName,
            emailId: adEmployee.mail.toLowerCase(),
            managerId: adEmployee.manager?.id,
            officeLocation: wegenEmployee.location,
            joiningDate: new Date(wegenEmployee.doj.split('-').reverse().join('-')),
            billable: !nonBillableEmails.includes(adEmployee.mail.toLowerCase()),
            isDeleted: exceptionMails.includes(adEmployee.mail.toLowerCase()),
            employmentType: employeeType.Permanent,
            employmentPercentage: 100
          });
        }
      }
    }

    if (employees.length > 0) {
      const ids = employees.map(emp => emp.id);
      const existingEmployees = await EmployeeModel.find({ id: { $in: ids } }).lean();
      const existingMap = new Map(existingEmployees.map(emp => [emp.id, emp]));

      const bulkOps = employees
        .filter(emp => {
          const existing = existingMap.get(emp.id);
          if (existing) {
            emp.billable = existing.billable ?? emp.billable;
            emp.isDeleted = existing.isDeleted ?? emp.isDeleted;
            emp.employmentType = existing.employmentType ?? emp.employmentType;
            emp.employmentPercentage = existing.employmentPercentage ?? emp.employmentPercentage;

            const existingSubset = {
              id: existing.id,
              genisysId: existing.genisysId,
              displayName: existing.displayName,
              emailId: existing.emailId,
              managerId: existing.managerId,
              officeLocation: existing.officeLocation,
              joiningDate: existing.joiningDate,
              billable: existing.billable,
              isDeleted: existing.isDeleted
            };

            return !_.isEqual(emp, existingSubset);
          }
          return true;
        })
        .map(emp => ({
          updateOne: {
            filter: { id: emp.id },
            update: { $set: emp },
            upsert: true
          }
        }));

      if (bulkOps.length > 0) {
        const result = await EmployeeModel.bulkWrite(bulkOps);
        return result;
      }
    }

    return null;
  } catch (error) {
    console.error('Error loading employees:', error);
    throw error;
  }
};