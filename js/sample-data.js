/*
 * Sample data for the Institutional Analytics & Executive Dashboard.
 * Everything here is generated from a fixed seed, so the numbers are the same on every load.
 * None of it is real student data. Replace it from the Data page with your own CSV exports.
 */
(function (root) {
  'use strict';

  var FIRST_YEAR = 2020;
  var CURRENT_YEAR = 2026;
  var TERMS = ['Odd 2023', 'Even 2024', 'Odd 2024', 'Even 2025', 'Odd 2025', 'Even 2026', 'Odd 2026'];

  // admitted = students admitted each year from 2020 to 2026
  var DEPTS = [
    { code: 'CSE', name: 'Computer Science & Engineering', program: 'B.Tech', years: 4, admitted: [150, 168, 182, 190, 205, 214, 226], apps: 5.5, att: 82, marks: 68, place: 0.80, pkg: 6.4, spf: 20, female: 0.38, attTrend: 0.25 },
    { code: 'ECE', name: 'Electronics & Communication Engineering', program: 'B.Tech', years: 4, admitted: [90, 92, 88, 85, 90, 84, 80], apps: 3.4, att: 78, marks: 64, place: 0.66, pkg: 4.8, spf: 18, female: 0.30, attTrend: -0.3 },
    { code: 'ME', name: 'Mechanical Engineering', program: 'B.Tech', years: 4, admitted: [72, 66, 60, 55, 50, 46, 42], apps: 2.4, att: 73, marks: 61, place: 0.55, pkg: 4.1, spf: 16, female: 0.08, attTrend: -0.7 },
    { code: 'CE', name: 'Civil Engineering', program: 'B.Tech', years: 4, admitted: [60, 58, 55, 50, 48, 44, 45], apps: 2.2, att: 76, marks: 62, place: 0.50, pkg: 3.9, spf: 16, female: 0.20, attTrend: 0.1 },
    { code: 'BBA', name: 'Business Administration (UG)', program: 'BBA', years: 3, admitted: [110, 118, 126, 130, 138, 146, 160], apps: 3.8, att: 79, marks: 66, place: 0.62, pkg: 4.4, spf: 24, female: 0.45, attTrend: 0.3 },
    { code: 'MBA', name: 'Business Administration (PG)', program: 'MBA', years: 2, admitted: [95, 100, 104, 112, 118, 120, 128], apps: 4.6, att: 85, marks: 70, place: 0.84, pkg: 7.6, spf: 18, female: 0.40, attTrend: 0 }
  ];

  var FIRST_YEAR_ENGG = ['Programming in C', 'Engineering Mathematics I', 'Engineering Physics', 'Basic Electrical Engineering', 'Communication Skills'];
  // subjects per year of study; index 0 = first year
  var SUBJECTS = {
    CSE: [FIRST_YEAR_ENGG,
      ['Data Structures', 'Database Management Systems', 'Discrete Mathematics', 'Digital Logic Design', 'Object Oriented Programming'],
      ['Operating Systems', 'Design & Analysis of Algorithms', 'Computer Networks', 'Theory of Computation', 'Software Engineering']],
    ECE: [FIRST_YEAR_ENGG,
      ['Electronic Devices', 'Signals & Systems', 'Network Analysis', 'Digital Electronics', 'Engineering Mathematics III'],
      ['Analog Communication', 'Microprocessors', 'Control Systems', 'Electromagnetic Theory', 'Linear IC Applications']],
    ME: [FIRST_YEAR_ENGG,
      ['Engineering Mechanics', 'Thermodynamics', 'Strength of Materials', 'Manufacturing Processes', 'Engineering Mathematics III'],
      ['Fluid Mechanics', 'Kinematics of Machines', 'Heat Transfer', 'Machine Design', 'Metrology']],
    CE: [FIRST_YEAR_ENGG,
      ['Surveying', 'Fluid Mechanics', 'Strength of Materials', 'Building Materials', 'Engineering Geology'],
      ['Structural Analysis', 'Geotechnical Engineering', 'Concrete Technology', 'Transportation Engineering', 'Hydrology']],
    BBA: [['Principles of Management', 'Business Economics', 'Financial Accounting', 'Business Communication', 'Business Mathematics'],
      ['Marketing Management', 'Organisational Behaviour', 'Cost Accounting', 'Business Statistics', 'Business Law']],
    MBA: [['Managerial Economics', 'Accounting for Managers', 'Marketing Management', 'Organisational Behaviour', 'Quantitative Techniques']]
  };
  // subjects students usually find hard: lowers their marks
  var HARD = {
    'Engineering Mathematics I': -13, 'Theory of Computation': -10, 'Strength of Materials': -17,
    'Signals & Systems': -12, 'Thermodynamics': -11, 'Structural Analysis': -10, 'Business Statistics': -8,
    'Quantitative Techniques': -6, 'Engineering Mathematics III': -6
  };

  var MALE = ['Aarav', 'Abhishek', 'Aditya', 'Akash', 'Aman', 'Ankit', 'Arjun', 'Ayush', 'Deepak', 'Devansh', 'Gaurav', 'Harsh', 'Ishaan', 'Karan', 'Kartik', 'Kunal', 'Lakshay', 'Manish', 'Mohit', 'Nikhil', 'Nitin', 'Parth', 'Pranav', 'Raghav', 'Rahul', 'Rajat', 'Rohan', 'Sahil', 'Sandeep', 'Saurabh', 'Shivam', 'Siddharth', 'Sumit', 'Tanmay', 'Tushar', 'Utkarsh', 'Varun', 'Vikas', 'Vivek', 'Yash'];
  var FEMALE = ['Aditi', 'Ananya', 'Anjali', 'Bhavya', 'Diya', 'Ishita', 'Kavya', 'Khushi', 'Kritika', 'Mansi', 'Megha', 'Muskan', 'Neha', 'Nidhi', 'Palak', 'Pooja', 'Prachi', 'Priya', 'Radhika', 'Riya', 'Sakshi', 'Sanya', 'Shreya', 'Simran', 'Sneha', 'Srishti', 'Tanvi', 'Vaishnavi', 'Vanshika', 'Yashika'];
  var SURNAMES = ['Agarwal', 'Ansari', 'Bansal', 'Bhatt', 'Bisht', 'Chaudhary', 'Chauhan', 'Das', 'Dubey', 'Goel', 'Gupta', 'Jain', 'Joshi', 'Kapoor', 'Khan', 'Kumar', 'Malhotra', 'Mehta', 'Mishra', 'Nair', 'Negi', 'Pandey', 'Rana', 'Rawat', 'Reddy', 'Saxena', 'Sharma', 'Shukla', 'Singh', 'Srivastava', 'Thakur', 'Tiwari', 'Tyagi', 'Verma', 'Yadav'];

  var TECH = ['TCS', 'Infosys', 'Wipro', 'HCLTech', 'Accenture', 'Capgemini', 'Cognizant', 'Tech Mahindra', 'Nagarro', 'Zoho', 'Deloitte', 'Amazon'];
  var CORE = ['L&T', 'Tata Projects', 'Maruti Suzuki', 'Bosch', 'Havells', 'Samsung R&D', 'Honda Cars India', 'JK Cement', 'Ashok Leyland', 'Shapoorji Pallonji'];
  var MGMT = ['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'EY', 'KPMG', 'Deloitte', 'Asian Paints', 'ITC', 'Amazon', 'Berger Paints', 'Decathlon'];
  function companiesFor(code) {
    if (code === 'CSE') return TECH;
    if (code === 'ECE') return TECH.slice(0, 8).concat(['Samsung R&D', 'Havells', 'Bosch']);
    if (code === 'ME' || code === 'CE') return CORE.concat(['TCS', 'Infosys']);
    return MGMT;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function generate() {
    var r = mulberry32(2026);
    function rand(a, b) { return a + (b - a) * r(); }
    function gauss(m, s) { var u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function pick(arr) { return arr[Math.floor(r() * arr.length)]; }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function r1(x) { return Math.round(x * 10) / 10; }

    var offsets = {};
    function offset(subject) {
      if (!(subject in offsets)) offsets[subject] = subject in HARD ? HARD[subject] : r1(rand(-5, 5));
      return offsets[subject];
    }

    var students = [], results = [], faculty = [], admissions = [], placements = [], attendance = [];
    var seq = {};

    DEPTS.forEach(function (d) {
      for (var y = 1; y <= d.years; y++) {
        var adYear = CURRENT_YEAR - y + 1;
        var n = Math.round(d.admitted[adYear - FIRST_YEAR] * (1 - 0.025 * (y - 1)));
        for (var i = 0; i < n; i++) {
          var yy = adYear % 100;
          seq[yy] = (seq[yy] || 0) + 1;
          var id = String(yy) + '1003' + String(seq[yy]).padStart(4, '0');
          var female = r() < d.female;
          var ability = gauss(0, 1);
          var att = r1(clamp(d.att + ability * 3 + gauss(0, 6) - (y === d.years ? 2 : 0), 35, 99.5));
          var s = {
            student_id: id, name: pick(female ? FEMALE : MALE) + ' ' + pick(SURNAMES), department: d.code,
            program: d.program, year: y, semester: 2 * y - 1, gender: female ? 'F' : 'M', admission_year: adYear,
            attendance_pct: att, avg_marks: '', result: 'Awaited', placement_status: '', company: '', package_lpa: ''
          };
          if (y >= 2) {
            var subjects = SUBJECTS[d.code][y - 2], lastSem = 2 * (y - 1), total = 0, backlogs = 0;
            subjects.forEach(function (sub, k) {
              var mk = Math.round(clamp(d.marks + ability * 7 + (att - d.att) * 0.35 + offset(sub) + gauss(0, 8), 4, 99));
              total += mk; if (mk < 40) backlogs++;
              results.push({ student_id: id, department: d.code, semester: lastSem, subject_code: d.code + lastSem + '0' + (k + 1), subject: sub, marks: mk });
            });
            s.avg_marks = r1(total / subjects.length);
            s.result = backlogs ? 'Backlog' : 'Pass';
          }
          if (y === d.years) {
            if (s.result === 'Backlog') s.placement_status = 'Not eligible';
            else if (r() < 0.07) s.placement_status = 'Opted out';
            else if (r() < clamp(d.place * 0.78 + ability * 0.1, 0.05, 0.97)) {
              s.placement_status = 'Placed';
              s.company = pick(companiesFor(d.code));
              s.package_lpa = r1(Math.max(2.6, d.pkg * Math.exp(gauss(0, 0.3)) + ability * 0.5));
            } else s.placement_status = 'Unplaced';
          }
          students.push(s);
        }
      }

      var deptStudents = students.filter(function (s) { return s.department === d.code; });

      // faculty: roughly one per `spf` students, in a 1 : 2 : 6 professor / associate / assistant mix
      var nf = Math.round(deptStudents.length / d.spf);
      for (var f = 0; f < nf; f++) {
        var share = f / nf, designation, phd, exp;
        if (share < 0.11) { designation = 'Professor'; phd = true; exp = Math.round(rand(18, 31)); }
        else if (share < 0.33) { designation = 'Associate Professor'; phd = r() < 0.85; exp = Math.round(rand(10, 18)); }
        else { designation = 'Assistant Professor'; phd = r() < 0.35; exp = Math.round(rand(1, 11)); }
        var fem = r() < 0.42;
        faculty.push({
          faculty_id: 'FAC-' + d.code + '-' + String(f + 1).padStart(2, '0'),
          name: (phd ? 'Dr. ' : (fem ? 'Ms. ' : 'Mr. ')) + pick(fem ? FEMALE : MALE) + ' ' + pick(SURNAMES),
          department: d.code, designation: designation, qualification: phd ? 'Ph.D.' : (d.program === 'B.Tech' ? 'M.Tech' : 'MBA'),
          experience_years: exp
        });
      }

      d.admitted.forEach(function (n, i) {
        admissions.push({ year: FIRST_YEAR + i, department: d.code, applications: Math.round(n * d.apps * rand(0.9, 1.1)), admitted: n });
      });

      var adj = { 2021: -0.08, 2022: 0.03, 2023: -0.02, 2024: -0.03, 2025: 0, 2026: 0.01 };
      for (var batch = 2021; batch <= 2026; batch++) {
        var adY = batch - d.years;
        var intake = adY >= FIRST_YEAR ? d.admitted[adY - FIRST_YEAR] : Math.round(d.admitted[0] * (1 - 0.03 * (FIRST_YEAR - adY)));
        var eligible = Math.round(intake * rand(0.84, 0.9));
        var rate = clamp(d.place + adj[batch] + gauss(0, 0.02), 0.2, 0.97);
        var avg = r1(d.pkg * (1 + (batch - 2026) * 0.045) * rand(0.96, 1.04));
        placements.push({ batch: batch, department: d.code, eligible: eligible, placed: Math.round(eligible * rate), avg_package_lpa: avg, highest_package_lpa: r1(avg * rand(2.6, 4.0)) });
      }

      var now = deptStudents.reduce(function (a, s) { return a + s.attendance_pct; }, 0) / deptStudents.length;
      TERMS.forEach(function (t, i) {
        var v = i === TERMS.length - 1 ? now : now - d.attTrend * (TERMS.length - 1 - i) + gauss(0, 0.9);
        attendance.push({ term: t, department: d.code, attendance_pct: r1(v) });
      });
    });

    return { students: students, results: results, faculty: faculty, admissions: admissions, placements: placements, attendance_history: attendance };
  }

  var DEPT_NAMES = {};
  DEPTS.forEach(function (d) { DEPT_NAMES[d.code] = d.name; });

  var api = { generate: generate, DEPT_NAMES: DEPT_NAMES, DEPT_ORDER: DEPTS.map(function (d) { return d.code; }) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SampleData = api;
})(this);
