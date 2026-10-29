/*
 * Institutional Analytics & Executive Dashboard
 * Role View: Admin Console
 *
 * Pages:
 *   data_health: Dataset inventory and 5 data quality checks
 *   upload_data: CSV drag-and-drop and per-file upload controls
 *   users: Table of demonstration accounts and permission scopes
 *   settings: Configurable attendance, pass mark and status bands
 *   upload_log: Audit trail of data uploads stored in localStorage
 */
(function (root) {
  'use strict';

  var App = root.App;
  var esc = Charts.esc;

  function runQualityChecks() {
    var checks = [];

    // Check 1: Duplicate student_id or faculty_id
    var stSeen = {}, stDups = [];
    (App.DATA.students || []).forEach(function (s) {
      var id = String(s.student_id || '').trim();
      if (!id) return;
      if (stSeen[id]) stDups.push({ type: 'Student ID', id: id, name: s.name, dept: s.department, issue: 'Duplicate roll number ' + id });
      else stSeen[id] = true;
    });

    var facSeen = {}, facDups = [];
    (App.DATA.faculty || []).forEach(function (f) {
      var id = String(f.faculty_id || '').trim();
      if (!id) return;
      if (facSeen[id]) facDups.push({ type: 'Faculty ID', id: id, name: f.name, dept: f.department, issue: 'Duplicate faculty ID ' + id });
      else facSeen[id] = true;
    });

    var allDups = stDups.concat(facDups);
    checks.push({
      id: 'dup_ids',
      title: 'Duplicate student or faculty IDs',
      desc: 'Checks for repeated student roll numbers in students.csv or repeated faculty IDs in faculty.csv.',
      count: allDups.length,
      offenders: allDups.slice(0, 5),
      cols: ['Type', 'ID', 'Name', 'Department', 'Problem'],
      formatRow: function (r) {
        return '<td>' + esc(r.type) + '</td><td class="num flag">' + esc(r.id) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.dept) + '</td><td>' + esc(r.issue) + '</td>';
      }
    });

    // Check 2: Attendance % outside 0-100
    var attOut = [];
    (App.DATA.students || []).forEach(function (s) {
      if (App.isNum(s.attendance_pct) && (s.attendance_pct < 0 || s.attendance_pct > 100)) {
        attOut.push({ source: 'students.csv', id: s.student_id, name: s.name, dept: s.department, val: s.attendance_pct + '%' });
      }
    });
    (App.DATA.attendance_history || []).forEach(function (a) {
      if (App.isNum(a.attendance_pct) && (a.attendance_pct < 0 || a.attendance_pct > 100)) {
        attOut.push({ source: 'attendance_history.csv', id: a.term, name: 'Term Average', dept: a.department, val: a.attendance_pct + '%' });
      }
    });
    checks.push({
      id: 'att_range',
      title: 'Attendance percentage outside 0–100',
      desc: 'Identifies student attendance records or term averages that fall outside valid percentages (0% to 100%).',
      count: attOut.length,
      offenders: attOut.slice(0, 5),
      cols: ['Source', 'ID / Term', 'Name / Record', 'Department', 'Recorded Value'],
      formatRow: function (r) {
        return '<td>' + esc(r.source) + '</td><td class="num">' + esc(r.id) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.dept) + '</td><td><span class="flag">' + esc(r.val) + '</span></td>';
      }
    });

    // Check 3: Marks outside 0-100
    var marksOut = [];
    (App.DATA.results || []).forEach(function (r) {
      if (App.isNum(r.marks) && (r.marks < 0 || r.marks > 100)) {
        marksOut.push({ source: 'results.csv', id: r.student_id, item: r.subject || r.subject_code, dept: r.department, val: r.marks });
      }
    });
    (App.DATA.students || []).forEach(function (s) {
      if (App.isNum(s.avg_marks) && (s.avg_marks < 0 || s.avg_marks > 100)) {
        marksOut.push({ source: 'students.csv', id: s.student_id, item: 'Average marks', dept: s.department, val: s.avg_marks });
      }
    });
    checks.push({
      id: 'marks_range',
      title: 'Marks outside 0–100',
      desc: 'Checks exam subject results and student average marks for values less than 0 or greater than 100.',
      count: marksOut.length,
      offenders: marksOut.slice(0, 5),
      cols: ['Source', 'Student ID', 'Subject / Field', 'Department', 'Score'],
      formatRow: function (r) {
        return '<td>' + esc(r.source) + '</td><td class="num">' + esc(r.id) + '</td><td>' + esc(r.item) + '</td><td>' + esc(r.dept) + '</td><td><span class="flag">' + esc(r.val) + '</span></td>';
      }
    });

    // Check 4: Blank required fields
    var blanks = [];
    App.DS_KEYS.forEach(function (k) {
      var req = App.SPEC[k].required;
      (App.DATA[k] || []).forEach(function (row, idx) {
        var missingCols = req.filter(function (col) {
          return row[col] === '' || row[col] == null;
        });
        if (missingCols.length) {
          blanks.push({
            dataset: k + '.csv',
            rowNum: idx + 1,
            missing: missingCols.join(', '),
            summary: Object.keys(row).slice(0, 3).map(function (c) { return c + ': ' + row[c]; }).join(' | ')
          });
        }
      });
    });
    checks.push({
      id: 'blank_required',
      title: 'Blank required fields in loaded data',
      desc: 'Checks whether mandatory columns specified in the dataset schema are empty or null.',
      count: blanks.length,
      offenders: blanks.slice(0, 5),
      cols: ['Dataset', 'Row #', 'Missing Columns', 'Row Preview'],
      formatRow: function (r) {
        return '<td>' + esc(r.dataset) + '</td><td class="num">' + esc(r.rowNum) + '</td><td><span class="flag">' + esc(r.missing) + '</span></td><td class="muted">' + esc(r.summary) + '</td>';
      }
    });

    // Check 5: Departments in students but not in faculty
    var facDepts = {};
    (App.DATA.faculty || []).forEach(function (f) {
      if (f.department) facDepts[String(f.department).trim().toUpperCase()] = true;
    });
    var missingDeptStudents = [];
    (App.DATA.students || []).forEach(function (s) {
      var d = String(s.department || '').trim().toUpperCase();
      if (d && !facDepts[d]) {
        missingDeptStudents.push({ id: s.student_id, name: s.name, dept: d });
      }
    });
    checks.push({
      id: 'dept_mismatch',
      title: 'Departments in students without faculty',
      desc: 'Identifies departments assigned to students that have no corresponding teaching staff in faculty.csv.',
      count: missingDeptStudents.length,
      offenders: missingDeptStudents.slice(0, 5),
      cols: ['Student ID', 'Name', 'Unmatched Department', 'Status'],
      formatRow: function (r) {
        return '<td class="num">' + esc(r.id) + '</td><td>' + esc(r.name) + '</td><td><span class="flag">' + esc(r.dept) + '</span></td><td>No faculty members found for ' + esc(r.dept) + '</td>';
      }
    });

    return checks;
  }

  // ------------------------------------------------------------------ VIEWS
  App.VIEWS.data_health = {
    title: 'Data health',
    sub: function () { return 'System data inventory, sources and automated quality assurance checks.'; },
    html: function () {
      var checks = runQualityChecks();
      var totalIssues = checks.reduce(function (s, c) { return s + c.count; }, 0);
      var totalRows = App.DS_KEYS.reduce(function (s, k) { return s + (App.DATA[k] || []).length; }, 0);
      var anyUpload = App.DS_KEYS.some(function (k) { return App.SOURCE[k] && App.SOURCE[k].type === 'upload'; });

      var html = App.kpis([
        { label: 'Active datasets', value: App.n0(App.DS_KEYS.length), note: 'Students, results, faculty, etc.' },
        { label: 'Total records', value: App.n0(totalRows), note: 'Loaded in active memory' },
        { label: 'Quality checks', value: totalIssues === 0 ? 'Clean' : App.n0(totalIssues) + ' issues', note: totalIssues === 0 ? 'All 5 checks passed' : 'Requires review', cls: totalIssues === 0 ? 'good' : 'bad' },
        { label: 'Data origin', value: anyUpload ? 'Custom' : 'Sample', note: anyUpload ? 'Contains uploaded CSVs' : 'Built-in seeded demo data', cls: anyUpload ? 'warn' : 'plain' }
      ]);

      html += '<section class="panel"><div class="panel-h"><h2>Dataset inventory</h2><p>Record counts and source details for all loaded modules</p></div><div class="tbl"><table class="data"><thead><tr><th scope="col">Dataset</th><th class="r" scope="col">Rows</th><th scope="col">Source</th><th scope="col">Last loaded</th><th scope="col">Required columns</th></tr></thead><tbody>';

      App.DS_KEYS.forEach(function (k) {
        var sp = App.SPEC[k], src = App.SOURCE[k] || { type: 'sample' }, rows = (App.DATA[k] || []).length;
        var sourceLabel = src.type === 'upload' ? '<span class="badge real">Uploaded: ' + esc(src.file) + '</span>' : '<span class="badge">Sample data</span>';
        var timeLabel = src.type === 'upload' ? esc(src.at || 'Earlier') : 'Initial launch';
        html += '<tr><td><b>' + esc(sp.label) + '</b> <span class="muted">(' + esc(k) + '.csv)</span></td><td class="r num">' + App.n0(rows) + '</td><td>' + sourceLabel + '</td><td class="muted">' + timeLabel + '</td><td class="muted">' + esc(sp.required.join(', ')) + '</td></tr>';
      });
      html += '</tbody></table></div></section>';

      html += '<section class="panel"><div class="panel-h"><h2>Quality checks</h2><p>' + (totalIssues === 0 ? 'All 5 validation rules passed with zero issues detected.' : totalIssues + ' issue(s) detected across datasets. Inspect offending rows below.') + '</p></div>';

      checks.forEach(function (chk) {
        var isOk = chk.count === 0;
        html += '<div class="check-card ' + (isOk ? 'passed' : 'flagged') + '">';
        html += '<div class="check-head"><h3>' + esc(chk.title) + '</h3><span class="chip ' + (isOk ? 'good' : 'bad') + '">' + (isOk ? 'Passed (0 issues)' : chk.count + ' issue' + (chk.count > 1 ? 's' : '') + ' flagged') + '</span></div>';
        html += '<p class="check-desc">' + esc(chk.desc) + '</p>';

        if (!isOk) {
          html += '<div class="offenders-tbl"><table><thead><tr>';
          chk.cols.forEach(function (col) { html += '<th scope="col">' + esc(col) + '</th>'; });
          html += '</tr></thead><tbody>';
          chk.offenders.forEach(function (off) {
            html += '<tr>' + chk.formatRow(off) + '</tr>';
          });
          html += '</tbody></table>';
          if (chk.count > 5) html += '<p class="muted" style="margin-top:6px;font-size:0.82rem">Showing first 5 of ' + chk.count + ' offending rows.</p>';
          html += '</div>';
        }
        html += '</div>';
      });

      html += '</section>';
      return html;
    },
    after: function () {}
  };

  App.VIEWS.upload_data = {
    title: 'Upload data',
    sub: function () { return 'Upload CSV exports to replace sample data. Uploads persist in this browser.'; },
    html: function () {
      var html = '<div class="drop" id="drop"><b>Drop CSV files here</b><p>Name each file after its dataset, for example students.csv or placements.csv. Multiple files can be dropped simultaneously.</p></div>';
      App.DS_KEYS.forEach(function (k) {
        var sp = App.SPEC[k], src = App.SOURCE[k] || { type: 'sample' }, msg = App.S.msgs[k];
        html += '<section class="panel ds"><div><h3>' + esc(sp.label) + ' <span class="badge ' + (src.type === 'upload' ? 'real' : '') + '">' + (src.type === 'upload' ? 'Uploaded' : 'Sample') + '</span></h3>' +
          '<p class="muted" style="margin:4px 0 6px">' + esc(sp.hint) + ' ' + App.n0((App.DATA[k] || []).length) + ' rows loaded' + (src.type === 'upload' ? ' from ' + esc(src.file) + ', ' + esc(src.at) : '') + '.</p>' +
          '<p class="cols">Columns: ' + sp.cols.map(function (c) { return sp.required.indexOf(c) >= 0 ? '<b>' + c + '</b>' : c; }).join(', ') + ' (bold columns are required)</p></div>' +
          '<span class="file-btn btn ghost small">Upload ' + esc(k) + '.csv<input type="file" accept=".csv,text/csv" id="file-' + k + '" data-ds="' + k + '" aria-label="Upload ' + esc(sp.label) + ' CSV"></span>' +
          (msg ? '<p class="msg ' + msg.cls + '">' + esc(msg.text) + '</p>' : '') + '</section>';
      });
      html += '<section class="panel"><div class="panel-h"><h2>Restore default data</h2></div><p class="muted" style="margin-bottom:10px">Reverts all uploaded datasets back to the built-in seeded sample records.</p><button type="button" class="btn ghost small" id="reset-data">Restore sample data</button> <span id="reset-confirm"></span></section>';
      return html;
    },
    after: function () {
      document.querySelectorAll('input[type="file"][data-ds]').forEach(function (inp) {
        inp.addEventListener('change', function () { if (inp.files[0]) App.readFiles([inp.files[0]], inp.getAttribute('data-ds')); });
      });
      var drop = App.byId('drop');
      if (drop) {
        ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
        ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
        drop.addEventListener('drop', function (e) { App.readFiles(Array.prototype.slice.call(e.dataTransfer.files)); });
      }
      var resetBtn = App.byId('reset-data');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          var c = App.byId('reset-confirm');
          c.innerHTML = 'Sure? <button type="button" class="btn small" id="reset-yes">Yes, restore</button> <button type="button" class="btn ghost small" id="reset-no">Cancel</button>';
          App.byId('reset-yes').addEventListener('click', function () { App.loadSample(); App.saveUploads(); App.S.msgs = {}; App.render(); });
          App.byId('reset-no').addEventListener('click', function () { c.innerHTML = ''; });
        });
      }
    }
  };

  App.VIEWS.users = {
    title: 'Users & Accounts',
    sub: function () { return 'Demonstration user accounts, roles and permission scopes.'; },
    html: function () {
      var sampleStudent = (App.DATA.students && App.DATA.students.length) ? App.DATA.students[0] : { student_id: '2410030001', name: 'Demo Student', department: 'CSE' };
      var html = '<section class="panel"><div class="panel-h"><h2>System accounts</h2><p>Pre-configured user accounts available for demonstration and evaluation</p></div><div class="tbl"><table class="data"><thead><tr><th scope="col">Username</th><th scope="col">Password</th><th scope="col">Role</th><th scope="col">Department scope</th><th scope="col">Access privileges</th></tr></thead><tbody>';

      var users = [
        { u: 'admin', p: 'admin123', role: 'Administrator', dept: 'All departments', priv: 'Data health QA, CSV uploads, system settings, upload audit log' },
        { u: 'director', p: 'director123', role: 'Director', dept: 'All departments', priv: 'Executive overview, department comparison ranking, aggregate analytics, meeting report' },
        { u: 'hod.cse', p: 'hod123', role: 'Head of Department', dept: 'CSE (Computer Science)', priv: 'Department KPIs vs institute average, students at risk list, subjects, faculty, placements' },
        { u: 'hod.ece', p: 'hod123', role: 'Head of Department', dept: 'ECE (Electronics)', priv: 'Department-scoped management and student intervention' },
        { u: 'hod.me', p: 'hod123', role: 'Head of Department', dept: 'ME (Mechanical)', priv: 'Department-scoped management and student intervention' },
        { u: 'hod.ce', p: 'hod123', role: 'Head of Department', dept: 'CE (Civil)', priv: 'Department-scoped management and student intervention' },
        { u: 'hod.bba', p: 'hod123', role: 'Head of Department', dept: 'BBA (Management UG)', priv: 'Department-scoped management and student intervention' },
        { u: 'hod.mba', p: 'hod123', role: 'Head of Department', dept: 'MBA (Management PG)', priv: 'Department-scoped management and student intervention' },
        { u: sampleStudent.student_id, p: 'student123', role: 'Student', dept: sampleStudent.department, priv: 'Personal profile, attendance eligibility status, examination results, placement status' }
      ];

      users.forEach(function (u) {
        html += '<tr><td><code>' + esc(u.u) + '</code></td><td><code>' + esc(u.p) + '</code></td><td><b>' + esc(u.role) + '</b></td><td>' + esc(u.dept) + '</td><td class="muted">' + esc(u.priv) + '</td></tr>';
      });

      html += '</tbody></table></div></section>';

      html += '<section class="panel"><div class="panel-h"><h2>Student authentication model</h2></div>' +
        '<p style="margin-bottom:8px">Students log in using their enrolled <b>Roll Number</b> (the <code>student_id</code> column in <code>students.csv</code>) and password <code>student123</code>.</p>' +
        '<p class="muted">Student sessions are strictly isolated: each student can only view their own personal profile, attendance percentage, subject results, and placement record. Aggregate benchmarks (such as class subject averages and department attendance) are provided for comparison without exposing other students\' names or marks.</p></section>';

      return html;
    },
    after: function () {}
  };

  App.VIEWS.settings = {
    title: 'Settings',
    sub: function () { return 'Academic thresholds and warning band configuration. Saved to browser storage.'; },
    html: function () {
      var s = App.getSettings();
      var b = s.bands;

      var html = '<form class="settings-form" id="settings-form" novalidate>';
      html += '<div class="settings-section"><h3>Academic requirements</h3>' +
        '<div class="settings-row"><label for="set-min-att">Minimum attendance (%)<span class="hint">Students below this threshold are marked at risk and may be barred from semester examinations.</span></label><input type="number" id="set-min-att" min="0" max="100" step="1" value="' + s.minAttendance + '" required></div>' +
        '<div class="settings-row"><label for="set-pass-mark">Examination pass mark<span class="hint">Minimum score out of 100 required to clear an individual subject paper.</span></label><input type="number" id="set-pass-mark" min="0" max="100" step="1" value="' + s.passMark + '" required></div>' +
        '</div>';

      html += '<div class="settings-section"><h3>Status warning bands</h3>' +
        '<p class="muted" style="font-size:0.85rem">Define danger (red) and warning (amber) boundaries. Values at or above warning are classified as good (green).</p>' +
        '<div class="settings-row"><label for="set-att-danger">Attendance danger threshold (%)<span class="hint">Attendance below this value is highlighted in red.</span></label><input type="number" id="set-att-danger" min="0" max="100" step="1" value="' + b.att[0] + '" required></div>' +
        '<div class="settings-row"><label for="set-att-warn">Attendance warning threshold (%)<span class="hint">Attendance below this value is highlighted in amber.</span></label><input type="number" id="set-att-warn" min="0" max="100" step="1" value="' + b.att[1] + '" required></div>' +
        '<div class="settings-row"><label for="set-pass-danger">Pass rate danger threshold (%)<span class="hint">Pass rates below this value trigger critical alert status.</span></label><input type="number" id="set-pass-danger" min="0" max="100" step="1" value="' + b.pass[0] + '" required></div>' +
        '<div class="settings-row"><label for="set-pass-warn">Pass rate warning threshold (%)<span class="hint">Pass rates below this value are marked warning.</span></label><input type="number" id="set-pass-warn" min="0" max="100" step="1" value="' + b.pass[1] + '" required></div>' +
        '<div class="settings-row"><label for="set-place-danger">Placement danger threshold (%)<span class="hint">Placement rates below this value are marked critical.</span></label><input type="number" id="set-place-danger" min="0" max="100" step="1" value="' + b.place[0] + '" required></div>' +
        '<div class="settings-row"><label for="set-place-warn">Placement warning threshold (%)<span class="hint">Placement rates below this value are marked warning.</span></label><input type="number" id="set-place-warn" min="0" max="100" step="1" value="' + b.place[1] + '" required></div>' +
        '</div>';

      html += '<div class="settings-actions">' +
        '<button type="submit" class="btn">Save settings</button>' +
        '<button type="button" class="btn ghost" id="set-reset">Reset to defaults</button>' +
        '<span id="set-msg" style="margin-left:12px;font-size:0.9rem"></span>' +
        '</div></form>';

      return html;
    },
    after: function () {
      var form = App.byId('settings-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var minAtt = parseFloat(App.byId('set-min-att').value);
          var passMk = parseFloat(App.byId('set-pass-mark').value);
          var attDanger = parseFloat(App.byId('set-att-danger').value);
          var attWarn = parseFloat(App.byId('set-att-warn').value);
          var passDanger = parseFloat(App.byId('set-pass-danger').value);
          var passWarn = parseFloat(App.byId('set-pass-warn').value);
          var placeDanger = parseFloat(App.byId('set-place-danger').value);
          var placeWarn = parseFloat(App.byId('set-place-warn').value);

          var updated = {
            minAttendance: App.isNum(minAtt) ? minAtt : 75,
            passMark: App.isNum(passMk) ? passMk : 40,
            bands: {
              att: [App.isNum(attDanger) ? attDanger : minAtt, App.isNum(attWarn) ? attWarn : 80],
              pass: [App.isNum(passDanger) ? passDanger : 75, App.isNum(passWarn) ? passWarn : 85],
              place: [App.isNum(placeDanger) ? placeDanger : 55, App.isNum(placeWarn) ? placeWarn : 70],
              marks: [55, 62]
            }
          };

          App.saveSettings(updated);
          var msg = App.byId('set-msg');
          if (msg) {
            msg.innerHTML = '<span style="color:var(--good);font-weight:600">Settings saved successfully. All modules updated.</span>';
            setTimeout(function () { if (msg) msg.innerHTML = ''; }, 3500);
          }
        });

        var resetBtn = App.byId('set-reset');
        if (resetBtn) {
          resetBtn.addEventListener('click', function () {
            App.saveSettings(null);
            App.render();
          });
        }
      }
    }
  };

  App.VIEWS.upload_log = {
    title: 'Upload log',
    sub: function () { return 'History of CSV uploads performed in this browser.'; },
    html: function () {
      var log = App.getUploadLog();
      var html = '<section class="panel"><div class="panel-h"><h2>Upload audit log</h2>' +
        (log.length ? '<button type="button" class="btn ghost small" id="clear-log">Clear log</button>' : '') + '</div>';

      if (!log.length) {
        html += '<p class="muted">No data uploads have been recorded in this browser session yet.</p>';
      } else {
        html += '<div class="tbl"><table class="data"><thead><tr><th scope="col">Time</th><th scope="col">File name</th><th scope="col">Dataset</th><th class="r" scope="col">Rows loaded</th><th class="r" scope="col">Rows skipped</th></tr></thead><tbody>';
        log.forEach(function (entry) {
          html += '<tr><td>' + esc(entry.time) + '</td><td><b>' + esc(entry.file) + '</b></td><td><code>' + esc(entry.dataset) + '.csv</code></td><td class="r num">' + App.n0(entry.loaded) + '</td><td class="r num' + (entry.skipped ? ' flag' : '') + '">' + App.n0(entry.skipped) + '</td></tr>';
        });
        html += '</tbody></table></div>';
      }

      html += '</section>';
      return html;
    },
    after: function () {
      var clearBtn = App.byId('clear-log');
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          App.clearUploadLog();
          App.render();
        });
      }
    }
  };

})(window);
