-- Seed 20 dummy staff records for employee management

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10001', 'Ahmed Khan', 'ahmed.khan', 'Branch Operations', 'Branch Manager', 'G8', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'ahmed.khan');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10002', 'Sara Ali', 'sara.ali', 'Operations', 'Operation Manager', 'G7', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'sara.ali');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10003', 'Bilal Noor', 'bilal.noor', 'Retail Banking', 'RM', 'G6', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'bilal.noor');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10004', 'Mariam Yusuf', 'mariam.yusuf', 'Teller Services', 'UT', 'G4', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'mariam.yusuf');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10005', 'Omar Rahman', 'omar.rahman', 'SME Banking', 'RM', 'G6', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'omar.rahman');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10006', 'Nadia Farooq', 'nadia.farooq', 'Branch Operations', 'Operation Manager', 'G7', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'nadia.farooq');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10007', 'Tariq Hassan', 'tariq.hassan', 'Customer Service', 'UT', 'G4', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'tariq.hassan');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10008', 'Huda Kareem', 'huda.kareem', 'Priority Banking', 'RM', 'G6', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'huda.kareem');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10009', 'Faisal Iqbal', 'faisal.iqbal', 'Trade Finance', 'Branch Manager', 'G8', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'faisal.iqbal');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10010', 'Reem Saeed', 'reem.saeed', 'Operations', 'UT', 'G4', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'reem.saeed');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10011', 'Yasir Latif', 'yasir.latif', 'Retail Banking', 'Operation Manager', 'G7', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'yasir.latif');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10012', 'Aisha Nadeem', 'aisha.nadeem', 'Branch Operations', 'UT', 'G4', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'aisha.nadeem');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10013', 'Khalid Musa', 'khalid.musa', 'Corporate Banking', 'RM', 'G6', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'khalid.musa');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10014', 'Lina Imran', 'lina.imran', 'Customer Service', 'UT', 'G4', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'lina.imran');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10015', 'Zain Ahmad', 'zain.ahmad', 'SME Banking', 'Branch Manager', 'G8', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'zain.ahmad');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10016', 'Noor Siddiqui', 'noor.siddiqui', 'Priority Banking', 'Operation Manager', 'G7', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'noor.siddiqui');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10017', 'Hamza Waseem', 'hamza.waseem', 'Teller Services', 'UT', 'G4', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'hamza.waseem');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10018', 'Rania Javed', 'rania.javed', 'Trade Finance', 'RM', 'G6', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'rania.javed');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10019', 'Imran Tariq', 'imran.tariq', 'Corporate Banking', 'Operation Manager', 'G7', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'imran.tariq');

INSERT INTO employees (employee_code, employee_name, employee_id, functional_department, functional_role, grade, is_active)
SELECT '10020', 'Sana Qureshi', 'sana.qureshi', 'Branch Operations', 'Branch Manager', 'G8', 1
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'sana.qureshi');
