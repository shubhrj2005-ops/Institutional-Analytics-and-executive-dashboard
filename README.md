# Institutional Analytics & Executive Dashboard

B.Tech CSE major project, School of Computer Science and Engineering, IILM University, Greater Noida.
Team: Aman Kumar, Devesh Dwivedi, Uday Vishwakarma, Shubhraj. Guide: Dr. Pankaj Kapoor.

A web dashboard that brings a college's student, attendance, exam, faculty, admission and placement
data into one place, so management, department heads, and students can see their relevant information
without building reports by hand.

## Running it

Open `index.html` in Chrome, Edge or Firefox. That's it. There is nothing to install and no server to start.
The fonts load from Google Fonts when you're online; offline, the page falls back to system fonts and
everything else still works.

To put it online, upload the whole folder to GitHub Pages or Netlify.

## Signing in

| Username | Password | Role | What they see |
| --- | --- | --- | --- |
| `admin` | `admin123` | Administrator | Admin Console: data health quality checks, CSV uploads, demo users, settings, and upload log |
| `director` | `director123` | Director | Executive View: institute KPI cards, multi-metric department comparison rankings, trends, and summary report |
| `hod.cse` | `hod123` | Head of Department | CSE Department: department KPIs vs institute benchmarks, students at risk, subjects, faculty, and placements. Use `hod.ece`, `hod.me`, `hod.ce`, `hod.bba` or `hod.mba` for others |
| Roll number (e.g. `2410030001`) | `student123` | Student | Student Portal: profile card, attendance percentage with exam eligibility warning, subject results vs class averages, and placement status |

These accounts are checked in the browser for demo purposes. A real deployment would move the
authentication and role check to a server backend (see "What Phase II would add").

## Roles and what they see

### Admin Console
Admin runs the data and system operations rather than analysing academic trends. The home page is Data health, which surveys all six datasets and executes five automated quality checks (duplicate IDs, out-of-range attendance, out-of-range marks, missing required fields, and department mismatches) with problem counts and preview rows. Admin also uploads CSV files, views demonstration user credentials, updates institutional thresholds in Settings, and audits previous uploads in the Upload log.

### Executive View (Director)
Director reviews the institution as a whole and compares departmental performance. The home page provides executive KPIs, admissions and attendance trends, and high-level attention alerts. A dedicated Department comparison page features a multi-metric ranking table with best and worst performers highlighted, alongside dynamic horizontal bar charts for any selected metric. Director can browse institutional Academics, Admissions, Placements, and Faculty, or read the one-page Summary report prepared for council meetings. Individual student names are kept hidden.

### Department View (HOD)
HOD manages a single department and acts on individual students. All views are locked to their own department with no department dropdown. The home page compares department metrics directly against institute averages, alongside attendance history and local attention notices. The Students at risk page highlights students with attendance shortages below the minimum, students with exam backlogs, and students suffering both. HOD also monitors department subject pass rates, faculty members, and placement recruiters.

### Student Portal
Student provides learners with direct, isolated access to their own academic records. The home page shows their enrolment profile and academic standing. The Attendance page presents current term attendance against the required minimum, issuing a clear warning if they are at risk of exam debarment. The Results page displays subject scores against class averages with comparative bar charts, or notes that results are awaited for first-year students. Final-year students can inspect campus placement offers, while earlier years see when placement opens.

## Settings

Settings allows an administrator to modify academic thresholds without editing code. Changes are stored in browser localStorage (`iaed.settings.v1`) and immediately update live calculations and colour bands across all roles:
- Minimum attendance percentage (default 75%)
- Examination pass mark out of 100 (default 40)
- Danger and warning bands for attendance, pass rate, placement rate, and average marks

Changing the minimum attendance to 80%, for example, instantly recalculates student shortage counts in Admin, shifts department attendance chips to red or amber in Executive views, updates the HOD at-risk roster, and changes the student exam eligibility banner.

## Upload log

The upload log maintains a record of every CSV file uploaded into the application in localStorage (`iaed.upload_log.v1`), retaining the last 50 entries. Each entry logs the timestamp, file name, target dataset, number of loaded rows, and number of skipped rows with missing mandatory fields. Administrators can inspect this log or clear it at any time.

## KPIs and how they are worked out

| KPI | Calculation |
| --- | --- |
| Total students | Rows in `students.csv` |
| Total faculty | Rows in `faculty.csv` |
| Students per teacher | Students ÷ faculty |
| Attendance % | Average of `attendance_pct` across students |
| Pass % | Students with `result = Pass` ÷ students with a result (Pass or Backlog) |
| Average marks | Average of `avg_marks` for students with a result |
| Placement % | Placed ÷ eligible, for the latest batch in `placements.csv` |
| Admission count | Sum of `admitted` for the latest year in `admissions.csv` |

Colour rules read from active Settings: values below the danger threshold display in red; values between danger and warning display in amber; values meeting or exceeding warning display in green.

## Using your own data

Sign in as `admin`, open **Upload data**, and upload CSV files. You can drag several files in at once.
Each file is matched by its name (for example `students.csv`). Column names are not case-sensitive, and
spaces are treated as underscores.

The `data/` folder has a sample of every file. Use those as templates.

| File | Required columns | Optional columns |
| --- | --- | --- |
| `students.csv` | student_id, department, semester, attendance_pct | name, program, year, gender, admission_year, avg_marks, result (Pass / Backlog), placement_status (Placed / Unplaced / Not eligible / Opted out), company, package_lpa |
| `results.csv` | student_id, department, subject, marks | semester, subject_code |
| `faculty.csv` | faculty_id, department, designation | name, qualification, experience_years |
| `admissions.csv` | year, department, admitted | applications |
| `placements.csv` | batch, department, eligible, placed | avg_package_lpa, highest_package_lpa |
| `attendance_history.csv` | term, department, attendance_pct | |

If a file is missing a required column, nothing changes and the page displays which column is missing.
Rows with a blank required value are skipped and logged. Uploaded files are remembered in that browser
(in localStorage) until you click **Restore sample data**.

## About the sample data

All of the built-in data is generated in `js/sample-data.js` from a fixed seed, so it is the same every time.
It covers six departments (CSE, ECE, ME, CE, BBA, MBA), about 2,200 students, 7,500 exam results, 113 faculty,
admissions from 2020 to 2026, and placement batches from 2021 to 2026.
Sample patterns include declining Mechanical admissions, ME attendance below 75%, and Strength of Materials
having a challenging pass rate.

## Files

```
index.html              Page shell with early theme restoration
css/style.css           All styling, light/dark modes, and role themes
js/sample-data.js       Sample data generator
js/csv.js               CSV reader and writer
js/charts.js            SVG charts (bar, line, scatter, sparkline), no library
js/app.js               Core application state, settings, auth and shell
js/roles/admin.js       Admin Console views (data health, upload, users, settings, log)
js/roles/director.js    Executive views (summary, department comparison, briefing report)
js/roles/hod.js         HOD views (department KPIs, students at risk, subjects, faculty)
js/roles/student.js     Student Portal views (profile, attendance alert, results, placement)
data/*.csv              Sample data as CSV, also usable as upload templates
```

## Architecture

Data sources (CSV exports) → Data processing (`csv.js`: parsing, cleaning, type conversion) →
Data store (in-memory, plus localStorage for uploads, settings, and logs) → Analytics (`metrics()` and
`subjectStats()`) → Role controllers (`js/roles/*.js`) → Dashboard (role-scoped pages and SVG charts).

## What Phase II would add

- A Python (Flask or FastAPI) backend with a PostgreSQL or MySQL database in place of browser storage
- Server-side login with salted password hashing and JWT role tokens
- Scheduled automated imports from the college ERP / SIS
- Early warning predictive alerts for backlogs and attendance deficits
- Automated notifications to parents and academic advisors
- Report export to PDF and Excel
