/*
 * Institutional Analytics & Executive Dashboard
 * Role View: Head of Department (HOD)
 *
 * Pages:
 *   my_department: Department KPIs vs institute benchmarks, attendance trend, attention items
 *   students_at_risk: Filtered follow-up list for low attendance (< minAttendance) and backlogs
 *   subjects: Department subject pass rates and average scores, weakest subjects first
 *   faculty: Department teaching staff list, designation mix, and experience
 *   placements: Department placement trajectory, current season status, and recruiters
 */
(function (root) {
  'use strict';

  var App = root.App;
  var esc = Charts.esc;

  var riskState = {
    q: '',
    sem: '',
    type: '',
    sort: 'risk_lvl',
    dir: -1,
    page: 0
  };

  var hodSubState = {
    q: '',
    sort: 'pass',
    dir: 1,
    page: 0
  };

  var hodFacState = {
    q: '',
    sort: 'name',
    dir: 1
  };

  App.VIEWS.my_department = {
    title: 'My department',
    sub: function () {
      var d = App.currentDept();
      return App.deptName(d) + ' (' + d + ') performance overview against institute benchmarks.';
    },
    html: function () {
      var d = App.currentDept();
      var deptM = App.metrics(d);
      var instM = App.metrics('ALL');

      var html = App.kpis([
        { label: 'Attendance', value: App.pct(deptM.att), note: 'Institute: ' + App.pct(instM.att), cls: App.status('att', deptM.att) },
        { label: 'Pass rate', value: App.pct(deptM.pass), note: 'Institute: ' + App.pct(instM.pass), cls: App.status('pass', deptM.pass) },
        { label: 'Average marks', value: App.n1(deptM.marks), note: 'Institute: ' + App.n1(instM.marks), cls: App.status('marks', deptM.marks) },
        { label: 'Students', value: App.n0(deptM.students), note: 'Institute: ' + App.n0(instM.students) },
        { label: 'Faculty', value: App.n0(deptM.faculty), note: 'Institute: ' + App.n0(instM.faculty) },
        { label: 'Students / teacher', value: App.n1(deptM.ratio), note: 'Institute: ' + App.n1(instM.ratio) },
        { label: 'Placement rate', value: App.pct(deptM.placePct), note: 'Institute: ' + App.pct(instM.placePct), cls: App.status('place', deptM.placePct) },
        { label: 'Admissions ' + (deptM.admYear || ''), value: App.n0(deptM.admLatest), note: 'Institute: ' + App.n0(instM.admLatest) }
      ]);

      html += '<div class="grid2">' +
        App.panel('hod-att-trend', 'Attendance trend by term', d + ' attendance compared to institute average',
          '<div class="legend"><span><i class="line"></i>' + esc(d) + '</span><span><i class="dash"></i>Institute</span><span><i class="dash" style="border-color:var(--bad)"></i>' + App.getMinAttendance() + '% minimum</span></div>') +
        App.panel('hod-pl-now', 'Current final-year placement status', 'Season in progress for ' + d + ' students') +
        '</div>';

      html += '<section class="panel"><div class="panel-h"><h2>Department attention items</h2><p>Issues flagged for ' + esc(d) + ' based on current term data</p></div><ul class="alerts" id="hod-alerts"></ul></section>';

      return html;
    },
    after: function () {
      var d = App.currentDept();
      App.drawAttendanceTrend(App.byId('hod-att-trend'), d);

      var fy = App.inDept(App.DATA.students, d).filter(function (s) { return s.placement_status; });
      var cats = ['Placed', 'Unplaced', 'Not eligible', 'Opted out'];
      if (fy.length) {
        Charts.vbar(App.byId('hod-pl-now'), {
          labels: cats,
          series: [{
            values: cats.map(function (c) { return fy.filter(function (s) { return s.placement_status === c; }).length; }),
            clsEach: ['good', 'warn', 'bad', 'muted']
          }]
        }, { fmt: App.n0, label: 'Current placement status' });
      } else {
        App.byId('hod-pl-now').innerHTML = App.empty('No final-year students in this department.');
      }

      var items = App.attentionItems(d);
      App.byId('hod-alerts').innerHTML = items.length ? items.map(function (a) { return '<li class="' + a.lvl + '">' + esc(a.text) + '</li>'; }).join('')
        : '<li class="ok">No critical warnings or attendance deficits flagged for ' + esc(d) + '.</li>';
    }
  };

  App.VIEWS.students_at_risk = {
    title: 'Students at risk',
    sub: function () {
      return 'Students in ' + App.currentDept() + ' requiring academic follow-up for attendance shortage or backlogs.';
    },
    html: function () {
      var d = App.currentDept();
      var minAtt = App.getMinAttendance();
      var st = App.inDept(App.DATA.students, d);

      // At-risk criteria: attendance below minAtt OR backlog
      var atRisk = st.filter(function (s) {
        var lowAtt = App.isNum(s.attendance_pct) && s.attendance_pct < minAtt;
        var backlog = s.result === 'Backlog';
        return lowAtt || backlog;
      });

      var bothCount = atRisk.filter(function (s) {
        return (App.isNum(s.attendance_pct) && s.attendance_pct < minAtt) && s.result === 'Backlog';
      }).length;
      var attOnlyCount = atRisk.filter(function (s) {
        return (App.isNum(s.attendance_pct) && s.attendance_pct < minAtt) && s.result !== 'Backlog';
      }).length;
      var backlogOnlyCount = atRisk.filter(function (s) {
        return !(App.isNum(s.attendance_pct) && s.attendance_pct < minAtt) && s.result === 'Backlog';
      }).length;

      var html = '<div class="risk-count-bar">' +
        '<div><b>' + App.n0(atRisk.length) + ' students need follow-up</b> in ' + esc(d) + '</div>' +
        '<div class="risk-badges">' +
        '<span class="chip bad">Critical (Both): ' + bothCount + '</span>' +
        '<span class="chip warn">Low Attendance: ' + attOnlyCount + '</span>' +
        '<span class="chip plain">Backlog: ' + backlogOnlyCount + '</span>' +
        '</div></div>';

      var sems = App.uniq(atRisk.map(function (s) { return s.semester; })).filter(App.isNum).sort(function (a, b) { return a - b; });

      html += '<section class="panel"><div class="panel-h"><h2>Follow-up list</h2><p>Click column heading to sort. Focus academic counselling on students with dual risk.</p></div>' +
        '<div class="tools">' +
        '<input type="search" id="risk-q" placeholder="Search name or roll number" aria-label="Search students" value="' + esc(riskState.q) + '">' +
        '<select id="risk-sem" aria-label="Filter semester"><option value="">All semesters</option>' + sems.map(function (s) { return '<option value="' + s + '"' + (String(riskState.sem) === String(s) ? ' selected' : '') + '>Semester ' + s + '</option>'; }).join('') + '</select>' +
        '<select id="risk-type" aria-label="Filter risk type"><option value="">All risk types</option>' +
        '<option value="both"' + (riskState.type === 'both' ? ' selected' : '') + '>Critical (Both Attendance & Backlog)</option>' +
        '<option value="att"' + (riskState.type === 'att' ? ' selected' : '') + '>Attendance shortage only (< ' + minAtt + '%)</option>' +
        '<option value="backlog"' + (riskState.type === 'backlog' ? ' selected' : '') + '>Backlog only</option>' +
        '</select></div>' +
        '<div class="tbl" id="risk-table"></div></section>';

      return html;
    },
    after: function () {
      var d = App.currentDept();
      var minAtt = App.getMinAttendance();

      function drawRiskTable() {
        var q = riskState.q.trim().toLowerCase();
        var rows = App.inDept(App.DATA.students, d).filter(function (s) {
          var lowAtt = App.isNum(s.attendance_pct) && s.attendance_pct < minAtt;
          var hasBacklog = s.result === 'Backlog';
          if (!lowAtt && !hasBacklog) return false;

          var isBoth = lowAtt && hasBacklog;
          if (riskState.type === 'both' && !isBoth) return false;
          if (riskState.type === 'att' && !(lowAtt && !hasBacklog)) return false;
          if (riskState.type === 'backlog' && !(!lowAtt && hasBacklog)) return false;

          if (riskState.sem !== '' && String(s.semester) !== String(riskState.sem)) return false;
          if (q && (String(s.name) + ' ' + String(s.student_id)).toLowerCase().indexOf(q) < 0) return false;
          return true;
        });

        rows.forEach(function (s) {
          var lowAtt = App.isNum(s.attendance_pct) && s.attendance_pct < minAtt;
          var hasBacklog = s.result === 'Backlog';
          s.risk_lvl = (lowAtt && hasBacklog) ? 3 : (lowAtt ? 2 : 1);
        });

        rows.sort(App.by(riskState.sort, riskState.dir));

        var per = 20, pages = Math.max(1, Math.ceil(rows.length / per));
        riskState.page = Math.min(riskState.page, pages - 1);
        var page = rows.slice(riskState.page * per, riskState.page * per + per);

        var t = '<table class="data"><thead><tr>' +
          App.sortHead('student_id', 'Roll no.', riskState) +
          App.sortHead('name', 'Name', riskState) +
          App.sortHead('semester', 'Sem', riskState, true) +
          App.sortHead('attendance_pct', 'Attendance', riskState, true) +
          App.sortHead('avg_marks', 'Avg marks', riskState, true) +
          App.sortHead('result', 'Result', riskState) +
          App.sortHead('risk_lvl', 'Risk status', riskState) +
          '</tr></thead><tbody>';

        page.forEach(function (s) {
          var lowAtt = App.isNum(s.attendance_pct) && s.attendance_pct < minAtt;
          var hasBacklog = s.result === 'Backlog';
          var riskBadge = '';
          if (lowAtt && hasBacklog) riskBadge = '<span class="chip bad">Attendance & Backlog</span>';
          else if (lowAtt) riskBadge = '<span class="chip warn">Low Attendance (< ' + minAtt + '%)</span>';
          else riskBadge = '<span class="chip plain">Backlog</span>';

          t += '<tr><td class="num">' + esc(s.student_id) + '</td><td>' + esc(s.name) + '</td><td class="r">' + esc(s.semester) + '</td>' +
            '<td class="r"><span class="chip ' + (lowAtt ? 'bad' : 'good') + '">' + App.pct(s.attendance_pct) + '</span></td>' +
            '<td class="r">' + (App.isNum(s.avg_marks) ? App.n1(s.avg_marks) : '–') + '</td>' +
            '<td><span class="chip ' + (hasBacklog ? 'bad' : 'good') + '">' + esc(s.result) + '</span></td>' +
            '<td>' + riskBadge + '</td></tr>';
        });

        if (!page.length) t += '<tr><td colspan="7" class="muted">No students match these risk filters.</td></tr>';

        var box = App.byId('risk-table');
        box.innerHTML = t + '</tbody></table>' + App.pager(riskState.page, pages, rows.length, 'students requiring attention');
        App.bindSort(box, riskState, drawRiskTable);
        App.bindPager(box, riskState, drawRiskTable);
      }

      drawRiskTable();

      App.byId('risk-q').addEventListener('input', function (e) { riskState.q = e.target.value; riskState.page = 0; drawRiskTable(); });
      App.byId('risk-sem').addEventListener('change', function (e) { riskState.sem = e.target.value; riskState.page = 0; drawRiskTable(); });
      App.byId('risk-type').addEventListener('change', function (e) { riskState.type = e.target.value; riskState.page = 0; drawRiskTable(); });
    }
  };

  App.VIEWS.subjects = {
    title: 'Subjects',
    sub: function () {
      return 'Subject-wise pass rates and average scores for ' + App.currentDept() + ', weakest subjects first.';
    },
    html: function () {
      var d = App.currentDept();
      var stats = App.subjectStats(d);
      var weak = stats.filter(function (s) { return s.pass < 75; }).length;
      var avgScore = App.mean(stats.map(function (s) { return s.avg; }));
      var avgPass = App.mean(stats.map(function (s) { return s.pass; }));

      var html = App.kpis([
        { label: 'Total subjects', value: App.n0(stats.length), note: 'Evaluated last semester' },
        { label: 'Average pass rate', value: App.pct(avgPass), cls: App.status('pass', avgPass) },
        { label: 'Department average score', value: App.n1(avgScore), note: 'Out of 100', cls: App.status('marks', avgScore) },
        { label: 'Subjects below 75% pass', value: App.n0(weak), note: 'Need curriculum review', cls: weak ? 'bad' : 'good' }
      ]);

      html += '<div class="panel"><div class="panel-h"><h2>Subject pass rate rankings</h2><p>Weakest pass rates listed first with pass threshold reference</p></div><div class="chart" id="hod-sub-chart"></div></div>';

      html += '<section class="panel"><div class="panel-h"><h2>Subject score details</h2></div>' +
        '<div class="tools"><input type="search" id="hod-sub-q" placeholder="Search subject or code" aria-label="Search subjects" value="' + esc(hodSubState.q) + '"></div>' +
        '<div class="tbl" id="hod-sub-table"></div></section>';

      return html;
    },
    after: function () {
      var d = App.currentDept();
      var stats = App.subjectStats(d);

      var sorted = stats.slice().sort(function (a, b) { return a.pass - b.pass; });
      var items = sorted.slice(0, 10).map(function (s) {
        return {
          label: s.subject,
          value: s.pass,
          cls: s.pass < 70 ? 'bad' : s.pass < 80 ? 'warn' : 'good',
          title: s.subject + ' (' + s.code + '): ' + App.pct(s.pass) + ' pass, avg ' + App.n1(s.avg)
        };
      });

      Charts.hbar(App.byId('hod-sub-chart'), items, { max: 100, threshold: App.getBands().pass[0], fmt: function (v) { return Math.round(v) + '%'; }, label: 'Subject pass rates' });

      function drawHodSubjects() {
        var q = hodSubState.q.trim().toLowerCase();
        var rows = stats.filter(function (s) { return !q || (s.subject + ' ' + s.code).toLowerCase().indexOf(q) >= 0; });
        rows.sort(App.by(hodSubState.sort, hodSubState.dir));

        var per = 15, pages = Math.max(1, Math.ceil(rows.length / per));
        hodSubState.page = Math.min(hodSubState.page, pages - 1);
        var page = rows.slice(hodSubState.page * per, hodSubState.page * per + per);

        var t = '<table class="data"><thead><tr>' +
          App.sortHead('subject', 'Subject', hodSubState) +
          App.sortHead('code', 'Code', hodSubState) +
          App.sortHead('semester', 'Sem', hodSubState, true) +
          App.sortHead('n', 'Students', hodSubState, true) +
          App.sortHead('avg', 'Avg marks', hodSubState, true) +
          App.sortHead('pass', 'Pass rate', hodSubState, true) +
          '</tr></thead><tbody>';

        page.forEach(function (s) {
          t += '<tr><td><b>' + esc(s.subject) + '</b></td><td class="muted">' + esc(s.code) + '</td><td class="r">' + esc(s.semester) + '</td><td class="r">' + App.n0(s.n) + '</td><td class="r">' + App.n1(s.avg) + '</td><td class="r"><span class="chip ' + App.status('pass', s.pass) + '">' + App.pct(s.pass) + '</span></td></tr>';
        });

        if (!page.length) t += '<tr><td colspan="6" class="muted">No subjects match.</td></tr>';

        var box = App.byId('hod-sub-table');
        box.innerHTML = t + '</tbody></table>' + App.pager(hodSubState.page, pages, rows.length, 'subjects');
        App.bindSort(box, hodSubState, drawHodSubjects);
        App.bindPager(box, hodSubState, drawHodSubjects);
      }

      drawHodSubjects();
      App.byId('hod-sub-q').addEventListener('input', function (e) { hodSubState.q = e.target.value; hodSubState.page = 0; drawHodSubjects(); });
    }
  };

  // Department-scoped Faculty view for HOD
  App.VIEWS.faculty = {
    title: 'Faculty',
    sub: function () { return 'Teaching staff for the ' + App.deptName(App.currentDept()) + ' (' + App.currentDept() + ') department.'; },
    html: function () {
      var d = App.currentDept();
      var fa = App.inDept(App.DATA.faculty, d);
      var m = App.metrics(d);
      var phd = fa.length ? fa.filter(function (f) { return /ph\.?\s*d/i.test(f.qualification || ''); }).length / fa.length * 100 : null;

      var html = App.kpis([
        { label: 'Department faculty', value: App.n0(fa.length) },
        { label: 'With Ph.D.', value: App.pct(phd), note: 'Doctoral degree holders' },
        { label: 'Average experience', value: App.n1(App.mean(fa.map(function (f) { return f.experience_years; }))), note: 'Years' },
        { label: 'Students per teacher', value: App.n1(m.ratio), note: 'Student to teacher ratio' }
      ]);

      html += '<div class="grid2">' +
        App.panel('hod-fa-des', 'Designation mix', d + ' teaching designations') +
        App.panel('hod-fa-exp', 'Teaching experience', 'Years of experience breakdown') +
        '</div>';

      html += '<section class="panel"><div class="panel-h"><h2>Faculty list</h2></div>' +
        '<div class="tools"><input type="search" id="hod-fa-q" placeholder="Search name or designation" aria-label="Search faculty" value="' + esc(hodFacState.q) + '"></div>' +
        '<div class="tbl" id="hod-fa-tbl"></div></section>';

      return html;
    },
    after: function () {
      var d = App.currentDept();
      var fa = App.inDept(App.DATA.faculty, d);
      var designations = ['Professor', 'Associate Professor', 'Assistant Professor'];
      var expBands = [['0–5 yrs', 0, 5], ['6–10', 6, 10], ['11–15', 11, 15], ['16–20', 16, 20], ['21+', 21, 99]];

      var des = designations.concat(App.uniq(fa.map(function (f) { return f.designation; })).filter(function (x) { return designations.indexOf(x) < 0; }));
      Charts.vbar(App.byId('hod-fa-des'), {
        labels: des.map(function (x) { return x.replace(' Professor', ' Prof.'); }),
        series: [{ values: des.map(function (x) { return fa.filter(function (f) { return f.designation === x; }).length; }) }]
      }, { fmt: App.n0, label: 'Designation mix' });

      Charts.vbar(App.byId('hod-fa-exp'), {
        labels: expBands.map(function (b) { return b[0]; }),
        series: [{ values: expBands.map(function (b) { return fa.filter(function (f) { return f.experience_years >= b[1] && f.experience_years <= b[2]; }).length; }) }]
      }, { fmt: App.n0, label: 'Teaching experience' });

      function drawHodFaculty() {
        var q = hodFacState.q.trim().toLowerCase();
        var rows = fa.filter(function (f) { return !q || (f.name + ' ' + f.designation + ' ' + f.faculty_id).toLowerCase().indexOf(q) >= 0; });
        rows.sort(App.by(hodFacState.sort, hodFacState.dir));

        var t = '<table class="data"><thead><tr>' +
          App.sortHead('faculty_id', 'ID', hodFacState) +
          App.sortHead('name', 'Name', hodFacState) +
          App.sortHead('designation', 'Designation', hodFacState) +
          App.sortHead('qualification', 'Qualification', hodFacState) +
          App.sortHead('experience_years', 'Experience', hodFacState, true) +
          '</tr></thead><tbody>';

        rows.forEach(function (f) {
          t += '<tr><td class="muted">' + esc(f.faculty_id) + '</td><td><b>' + esc(f.name) + '</b></td><td>' + esc(f.designation) + '</td><td>' + esc(f.qualification || '–') + '</td><td class="r">' + (App.isNum(f.experience_years) ? f.experience_years + ' yrs' : '–') + '</td></tr>';
        });

        if (!rows.length) t += '<tr><td colspan="5" class="muted">No faculty match.</td></tr>';

        var box = App.byId('hod-fa-tbl');
        box.innerHTML = t + '</tbody></table><div class="pager"><span>' + App.n0(rows.length) + ' faculty members</span></div>';
        App.bindSort(box, hodFacState, drawHodFaculty);
      }

      drawHodFaculty();
      App.byId('hod-fa-q').addEventListener('input', function (e) { hodFacState.q = e.target.value; drawHodFaculty(); });
    }
  };

  // Department-scoped Placements view for HOD
  App.VIEWS.placements = {
    title: 'Placements',
    sub: function () { return 'Placement outcomes and corporate recruiter records for ' + App.currentDept() + '.'; },
    html: function () {
      var d = App.currentDept();
      var pl = App.inDept(App.DATA.placements, d);
      var batches = App.uniq(pl.map(function (r) { return r.batch; })).filter(App.isNum).sort();
      var html = '';

      if (batches.length) {
        if (batches.indexOf(App.S.batch) < 0) App.S.batch = batches[batches.length - 1];
        var rows = pl.filter(function (r) { return r.batch === App.S.batch; });
        var el = App.sum(rows.map(function (r) { return r.eligible; })), pd = App.sum(rows.map(function (r) { return r.placed; }));
        var avg = pd ? App.sum(rows.map(function (r) { return (r.avg_package_lpa || 0) * r.placed; })) / pd : null;
        var high = Math.max.apply(null, rows.map(function (r) { return r.highest_package_lpa; }).filter(App.isNum).concat([0]));

        html += '<div class="tools"><label for="hod-pl-batch" class="muted" style="align-self:center">Batch</label><select id="hod-pl-batch">' +
          batches.slice().reverse().map(function (b) { return '<option' + (b === App.S.batch ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select></div>';

        html += App.kpis([
          { label: 'Eligible students', value: App.n0(el), note: 'Batch ' + App.S.batch },
          { label: 'Placed', value: App.n0(pd) },
          { label: 'Placement rate', value: App.pct(el ? pd / el * 100 : null), cls: App.status('place', el ? pd / el * 100 : null) },
          { label: 'Average package', value: App.lpa(avg) },
          { label: 'Highest package', value: App.lpa(high || null) }
        ]);

        html += '<div class="grid2">' +
          App.panel('hod-pl-trend', 'Placement rate by batch', d + ' placement rate over time') +
          App.panel('hod-pl-current', 'Current final-year batch', 'Status of ' + d + ' students in current season') +
          '</div>';
      } else {
        html += App.empty('No placement history loaded for this department.');
      }

      html += '<section class="panel"><div class="panel-h"><h2>Recruiters hiring from ' + esc(d) + '</h2><p>Offers extended to final-year students</p></div><div class="tbl" id="hod-pl-rec"></div></section>';
      return html;
    },
    after: function () {
      var d = App.currentDept();
      var sel = App.byId('hod-pl-batch');
      if (sel) {
        sel.addEventListener('change', function (e) { App.S.batch = +e.target.value; App.render(); });
        var pl = App.inDept(App.DATA.placements, d);
        var batches = App.uniq(pl.map(function (r) { return r.batch; })).filter(App.isNum).sort();
        function rate(rows) { var e = App.sum(rows.map(function (r) { return r.eligible; })); return e ? App.sum(rows.map(function (r) { return r.placed; })) / e * 100 : null; }

        Charts.line(App.byId('hod-pl-trend'), {
          labels: batches.map(String),
          series: [{ name: d, values: batches.map(function (b) { var v = rate(pl.filter(function (r) { return r.batch === b; })); return v == null ? null : Math.round(v * 10) / 10; }) }]
        }, { fmt: function (v) { return v + '%'; }, label: 'Placement rate by batch' });

        var fy = App.inDept(App.DATA.students, d).filter(function (s) { return s.placement_status; });
        var cats = ['Placed', 'Unplaced', 'Not eligible', 'Opted out'];
        if (fy.length) {
          Charts.vbar(App.byId('hod-pl-current'), {
            labels: cats,
            series: [{ values: cats.map(function (c) { return fy.filter(function (s) { return s.placement_status === c; }).length; }), clsEach: ['good', 'warn', 'bad', 'muted'] }]
          }, { fmt: App.n0, label: 'Current batch placement' });
        } else {
          App.byId('hod-pl-current').innerHTML = App.empty('No final-year students.');
        }
      }

      var placed = App.inDept(App.DATA.students, d).filter(function (s) { return s.placement_status === 'Placed' && s.company; });
      var g = {};
      placed.forEach(function (s) {
        var o = g[s.company] || (g[s.company] = { company: s.company, n: 0, pk: [] });
        o.n++;
        if (App.isNum(s.package_lpa)) o.pk.push(s.package_lpa);
      });
      var rec = Object.keys(g).map(function (k) {
        var o = g[k];
        o.avg = App.mean(o.pk);
        o.max = o.pk.length ? Math.max.apply(null, o.pk) : null;
        return o;
      }).sort(function (a, b) { return b.n - a.n || (b.avg || 0) - (a.avg || 0); });

      var t = '<table class="data"><thead><tr><th scope="col">Company</th><th class="r" scope="col">Offers</th><th class="r" scope="col">Average package</th><th class="r" scope="col">Highest</th></tr></thead><tbody>';
      rec.forEach(function (o) {
        t += '<tr><td><b>' + esc(o.company) + '</b></td><td class="r num">' + o.n + '</td><td class="r">' + App.lpa(o.avg) + '</td><td class="r">' + App.lpa(o.max) + '</td></tr>';
      });
      if (!rec.length) t += '<tr><td colspan="4" class="muted">No offers recorded for this department yet.</td></tr>';
      App.byId('hod-pl-rec').innerHTML = t + '</tbody></table>';
    }
  };

})(window);
