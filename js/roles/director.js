/*
 * Institutional Analytics & Executive Dashboard
 * Role View: Executive View (Director)
 *
 * Pages:
 *   executive_summary: High-level KPI tiles, trends, department table, attention items
 *   dept_comparison: Multi-metric ranking table with best/worst highlights and dynamic bar chart
 *   academics: Examination performance, distribution and semester pass rates
 *   admissions: Application and admission trends across departments
 *   placements: Career outcomes, salary packages and corporate recruiters
 *   faculty: Teaching staff metrics, student-to-faculty ratios and experience
 *   summary_report: One-page executive text briefing for board meetings
 */
(function (root) {
  'use strict';

  var App = root.App;
  var esc = Charts.esc;

  var compState = {
    sort: 'att',
    dir: -1,
    metric: 'att'
  };

  App.VIEWS.executive_summary = {
    title: 'Executive summary',
    sub: function () { return 'Institutional performance, enrolment trends and operational indicators for ' + App.scopeLabel() + '.'; },
    html: function () {
      var m = App.metrics(App.currentDept());
      var ch = App.changeNote(m.admChange, m.admYear - 1);
      var html = App.kpis([
        { label: 'Total students', value: App.n0(m.students), note: m.female != null ? App.pct(m.female) + ' women' : '' },
        { label: 'Total faculty', value: App.n0(m.faculty), note: m.ratio ? '1 teacher per ' + App.n1(m.ratio) + ' students' : '' },
        { label: 'Attendance', value: App.pct(m.att), note: 'Current term average', cls: App.status('att', m.att) },
        { label: 'Pass rate', value: App.pct(m.pass), note: 'Cleared all subjects', cls: App.status('pass', m.pass) },
        { label: 'Average marks', value: App.n1(m.marks), note: 'Out of 100', cls: App.status('marks', m.marks) },
        { label: 'Placement rate', value: App.pct(m.placePct), note: m.batch ? 'Batch ' + m.batch : '', cls: App.status('place', m.placePct) },
        { label: 'Admissions ' + (m.admYear || ''), value: App.n0(m.admLatest), note: ch.note, noteCls: ch.cls }
      ]);

      html += '<div class="grid2">' +
        App.panel('ov-adm', 'Admissions by year', 'Students admitted, ' + App.scopeLabel()) +
        App.panel('ov-att', 'Attendance by term', App.currentDept() === 'ALL' ? 'Institute average' : App.currentDept() + ' against the institute average',
          '<div class="legend"><span><i class="line"></i>' + (App.currentDept() === 'ALL' ? 'Institute' : esc(App.currentDept())) + '</span>' + (App.currentDept() === 'ALL' ? '' : '<span><i class="dash"></i>Institute</span>') + '<span><i class="dash" style="border-color:var(--bad)"></i>' + App.getMinAttendance() + '% minimum</span></div>') +
        '</div>';

      html += '<div class="grid2"><section class="panel wide"><div class="panel-h"><h2>Department performance overview</h2><p>Click any row to filter the executive view by department</p></div><div class="tbl" id="ov-depts"></div></section></div>';

      html += '<section class="panel"><div class="panel-h"><h2>Needs attention</h2><p>Calculated automatically from active institutional thresholds</p></div><ul class="alerts" id="ov-alerts"></ul></section>';
      return html;
    },
    after: function () {
      var dept = App.currentDept();
      var ad = App.inDept(App.DATA.admissions, dept);
      var years = App.uniq(ad.map(function (r) { return r.year; })).sort();
      var vals = years.map(function (y) { return App.sum(ad.filter(function (r) { return r.year === y; }).map(function (r) { return r.admitted; })); });
      if (years.length) Charts.vbar(App.byId('ov-adm'), { labels: years.map(String), series: [{ values: vals, clsEach: vals.map(function (v, i) { return i === vals.length - 1 ? '' : 'muted'; }) }] }, { label: 'Admissions by year' });
      else App.byId('ov-adm').innerHTML = App.empty('No admissions data loaded.');

      App.drawAttendanceTrend(App.byId('ov-att'), dept);

      var rows = App.visibleDepts().map(function (d) {
        var m = App.metrics(d);
        var ad2 = App.inDept(App.DATA.admissions, d), ys = App.uniq(ad2.map(function (r) { return r.year; })).sort();
        m.trend = ys.map(function (y) { return App.sum(ad2.filter(function (r) { return r.year === y; }).map(function (r) { return r.admitted; })); });
        m.code = d;
        return m;
      });

      var t = '<table class="data"><thead><tr><th scope="col">Department</th><th class="r" scope="col">Students</th><th class="r" scope="col">Faculty</th><th class="r" scope="col">Students per teacher</th><th class="r" scope="col">Attendance</th><th class="r" scope="col">Pass rate</th><th class="r" scope="col">Avg marks</th><th class="r" scope="col">Placement</th><th scope="col">Admissions trend</th></tr></thead><tbody>';
      rows.forEach(function (m) {
        var sel = App.currentDept() === m.code;
        t += '<tr class="click' + (sel ? ' sel' : '') + '" data-dept="' + esc(m.code) + '" tabindex="0">' +
          '<td><b>' + esc(m.code) + '</b> <span class="muted">' + esc(App.deptName(m.code) !== m.code ? App.deptName(m.code) : '') + '</span></td>' +
          '<td class="r">' + App.n0(m.students) + '</td><td class="r">' + App.n0(m.faculty) + '</td><td class="r">' + App.n1(m.ratio) + '</td>' +
          '<td class="r"><span class="chip ' + App.status('att', m.att) + '">' + App.pct(m.att) + '</span></td>' +
          '<td class="r"><span class="chip ' + App.status('pass', m.pass) + '">' + App.pct(m.pass) + '</span></td>' +
          '<td class="r">' + App.n1(m.marks) + '</td>' +
          '<td class="r"><span class="chip ' + App.status('place', m.placePct) + '">' + App.pct(m.placePct) + '</span></td>' +
          '<td>' + Charts.spark(m.trend) + '</td></tr>';
      });
      App.byId('ov-depts').innerHTML = t + '</tbody></table>';
      App.byId('ov-depts').querySelectorAll('tr[data-dept]').forEach(function (tr) {
        function go() { App.pickDept(tr.getAttribute('data-dept')); }
        tr.addEventListener('click', go);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      });

      var items = App.attentionItems(dept);
      App.byId('ov-alerts').innerHTML = items.length ? items.map(function (a) { return '<li class="' + a.lvl + '">' + esc(a.text) + '</li>'; }).join('')
        : '<li class="ok">Nothing is below the warning levels right now.</li>';
    }
  };

  App.VIEWS.dept_comparison = {
    title: 'Department comparison',
    sub: function () { return 'Ranked comparison of academic departments across core performance indicators.'; },
    html: function () {
      var html = '<div class="panel"><div class="panel-h"><h2>Performance comparison chart</h2><div class="tools" style="margin-bottom:0">' +
        '<label for="cmp-metric" class="muted" style="align-self:center">Select metric</label><select id="cmp-metric">' +
        '<option value="att"' + (compState.metric === 'att' ? ' selected' : '') + '>Attendance percentage</option>' +
        '<option value="pass"' + (compState.metric === 'pass' ? ' selected' : '') + '>Pass rate</option>' +
        '<option value="marks"' + (compState.metric === 'marks' ? ' selected' : '') + '>Average marks</option>' +
        '<option value="place"' + (compState.metric === 'place' ? ' selected' : '') + '>Placement rate</option>' +
        '<option value="ratio"' + (compState.metric === 'ratio' ? ' selected' : '') + '>Students per teacher</option>' +
        '<option value="admChange"' + (compState.metric === 'admChange' ? ' selected' : '') + '>Admissions change (%)</option>' +
        '</select></div></div><div class="chart" id="cmp-chart"></div></div>';

      html += '<section class="panel"><div class="panel-h"><h2>Department ranking table</h2><p>Click any column heading to sort. Green highlights best performer; red highlights lowest.</p></div>' +
        '<div class="tbl" id="cmp-tbl"></div></section>';

      return html;
    },
    after: function () {
      var depts = App.allDepts();
      var data = depts.map(function (d) {
        var m = App.metrics(d);
        return {
          dept: d,
          name: App.deptName(d),
          att: m.att,
          pass: m.pass,
          marks: m.marks,
          place: m.placePct,
          ratio: m.ratio,
          admChange: m.admChange
        };
      });

      // Find best and worst for each metric
      function getExtremes(key, lowerIsBetter) {
        var vals = data.map(function (d) { return d[key]; }).filter(App.isNum);
        if (!vals.length) return { best: null, worst: null };
        var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
        return lowerIsBetter ? { best: min, worst: max } : { best: max, worst: min };
      }

      var extremes = {
        att: getExtremes('att', false),
        pass: getExtremes('pass', false),
        marks: getExtremes('marks', false),
        place: getExtremes('place', false),
        ratio: getExtremes('ratio', true), // lower ratio is better
        admChange: getExtremes('admChange', false)
      };

      function renderCompChart() {
        var met = compState.metric;
        var sorted = data.slice().sort(function (a, b) {
          var va = a[met], vb = b[met];
          if (!App.isNum(va)) return 1;
          if (!App.isNum(vb)) return -1;
          return met === 'ratio' ? (va - vb) : (vb - va);
        });

        var items = sorted.map(function (d) {
          var v = d[met];
          var title = d.dept + ' (' + d.name + '): ' + (App.isNum(v) ? (met === 'ratio' || met === 'marks' ? App.n1(v) : App.pct(v)) : '–');
          var cls = '';
          if (extremes[met] && App.isNum(v)) {
            if (v === extremes[met].best) cls = 'good';
            else if (v === extremes[met].worst) cls = 'bad';
          }
          return { label: d.dept, value: App.isNum(v) ? v : 0, cls: cls, title: title };
        });

        var maxVal = (met === 'att' || met === 'pass' || met === 'place') ? 100 : null;
        var fmt = function (v) {
          if (met === 'ratio' || met === 'marks') return App.n1(v);
          if (met === 'admChange') return (v >= 0 ? '+' : '') + App.n1(v) + '%';
          return Math.round(v) + '%';
        };

        Charts.hbar(App.byId('cmp-chart'), items, { max: maxVal, fmt: fmt, label: 'Department comparison' });
      }

      function drawTable() {
        var sortK = compState.sort, sortDir = compState.dir;
        var sorted = data.slice().sort(function (a, b) {
          var va = a[sortK], vb = b[sortK];
          if (va === vb) return 0;
          if (!App.isNum(va) && va == null) return 1;
          if (!App.isNum(vb) && vb == null) return -1;
          return (va > vb ? 1 : -1) * sortDir;
        });

        function hi(val, key) {
          if (!App.isNum(val) || !extremes[key]) return val != null ? (key === 'ratio' || key === 'marks' ? App.n1(val) : App.pct(val)) : '–';
          var formatted = key === 'ratio' || key === 'marks' ? App.n1(val) : (key === 'admChange' ? (val >= 0 ? '+' : '') + App.n1(val) + '%' : App.pct(val));
          if (val === extremes[key].best) return '<span class="hi-best" title="Best across institute">' + formatted + '</span>';
          if (val === extremes[key].worst) return '<span class="hi-worst" title="Lowest across institute">' + formatted + '</span>';
          return formatted;
        }

        var t = '<table class="data"><thead><tr><th scope="col">Rank</th>' +
          App.sortHead('dept', 'Department', compState) +
          App.sortHead('att', 'Attendance', compState, true) +
          App.sortHead('pass', 'Pass rate', compState, true) +
          App.sortHead('marks', 'Avg marks', compState, true) +
          App.sortHead('place', 'Placement rate', compState, true) +
          App.sortHead('ratio', 'Students / teacher', compState, true) +
          App.sortHead('admChange', 'Admissions change', compState, true) +
          '</tr></thead><tbody>';

        sorted.forEach(function (d, i) {
          var rank = i + 1;
          t += '<tr><td><span class="rank-badge' + (rank === 1 ? ' top' : '') + '">' + rank + '</span></td>' +
            '<td><b>' + esc(d.dept) + '</b> <span class="muted">' + esc(d.name) + '</span></td>' +
            '<td class="r">' + hi(d.att, 'att') + '</td>' +
            '<td class="r">' + hi(d.pass, 'pass') + '</td>' +
            '<td class="r">' + hi(d.marks, 'marks') + '</td>' +
            '<td class="r">' + hi(d.place, 'place') + '</td>' +
            '<td class="r">' + hi(d.ratio, 'ratio') + '</td>' +
            '<td class="r">' + hi(d.admChange, 'admChange') + '</td>' +
            '</tr>';
        });

        t += '</tbody></table>';
        var container = App.byId('cmp-tbl');
        container.innerHTML = t;
        App.bindSort(container, compState, drawTable);
      }

      renderCompChart();
      drawTable();

      var sel = App.byId('cmp-metric');
      if (sel) {
        sel.addEventListener('change', function (e) {
          compState.metric = e.target.value;
          renderCompChart();
        });
      }
    }
  };

  // Re-use core analytics pages for Director with full department dropdown scope
  App.VIEWS.academics = App.VIEWS.academics;
  App.VIEWS.admissions = App.VIEWS.admissions;
  App.VIEWS.placements = App.VIEWS.placements;
  App.VIEWS.faculty = App.VIEWS.faculty;

  App.VIEWS.summary_report = {
    title: 'Summary report',
    sub: function () { return 'One-page executive briefing prepared for academic council and review meetings.'; },
    html: function () {
      var inst = App.metrics('ALL');
      var depts = App.allDepts();
      var deptMetrics = depts.map(function (d) {
        var m = App.metrics(d);
        m.code = d;
        m.name = App.deptName(d);
        return m;
      });

      // Top 3 and Bottom 3 by pass rate and attendance
      var byPass = deptMetrics.slice().filter(function (d) { return App.isNum(d.pass); }).sort(function (a, b) { return b.pass - a.pass; });
      var top3 = byPass.slice(0, 3);
      var bottom3 = byPass.slice(-3).reverse();

      var alerts = App.attentionItems('ALL');

      var dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

      var html = '<div class="report-actions"><button type="button" class="btn small" onclick="window.print()">Print briefing report</button></div>';
      html += '<article class="report">';
      html += '<h2>Institutional Executive Summary</h2>';
      html += '<div class="report-meta">IILM University, Greater Noida · Academic Review Briefing · Generated ' + esc(dateStr) + '</div>';

      html += '<h3>1. Institute Key Performance Indicators</h3>';
      html += '<p>The institute currently enrolls <b>' + App.n0(inst.students) + ' students</b> across ' + depts.length + ' academic departments, supported by <b>' + App.n0(inst.faculty) + ' teaching faculty</b> (overall student-to-teacher ratio of <b>' + App.n1(inst.ratio) + ' : 1</b>). ' +
        'Average student attendance for the ongoing academic term stands at <b>' + App.pct(inst.att) + '</b>. ' +
        'In the most recent semester examination cycle, the institute registered an overall pass rate of <b>' + App.pct(inst.pass) + '</b> with an average score of <b>' + App.n1(inst.marks) + ' marks</b>. ' +
        'Campus placements for the passing-out batch (' + inst.batch + ') achieved a placement rate of <b>' + App.pct(inst.placePct) + '</b> with an average salary package of <b>' + App.lpa(inst.avgPkg) + '</b>. ' +
        'New admissions for ' + inst.admYear + ' totaled <b>' + App.n0(inst.admLatest) + ' students</b> (' + (inst.admChange >= 0 ? '+' : '') + App.n1(inst.admChange) + '% year-on-year).</p>';

      html += '<h3>2. Department Performance Highlights</h3>';
      html += '<p><b>Top performing departments (by examination pass rate):</b></p><ul>';
      top3.forEach(function (d, i) {
        html += '<li><b>' + (i + 1) + '. ' + esc(d.name) + ' (' + esc(d.code) + ')</b>: Pass rate ' + App.pct(d.pass) + ', Attendance ' + App.pct(d.att) + ', Placement ' + App.pct(d.placePct) + '.</li>';
      });
      html += '</ul>';

      html += '<p><b>Departments requiring operational attention:</b></p><ul>';
      bottom3.forEach(function (d, i) {
        html += '<li><b>' + (i + 1) + '. ' + esc(d.name) + ' (' + esc(d.code) + ')</b>: Pass rate ' + App.pct(d.pass) + ', Attendance ' + App.pct(d.att) + ', Student-faculty ratio ' + App.n1(d.ratio) + ' : 1.</li>';
      });
      html += '</ul>';

      html += '<h3>3. Key Action Items</h3>';
      if (!alerts.length) {
        html += '<p>All key institutional indicators are currently within approved operating parameters.</p>';
      } else {
        html += '<ul>';
        alerts.slice(0, 6).forEach(function (a) {
          html += '<li>' + esc(a.text) + '</li>';
        });
        html += '</ul>';
      }

      html += '<div style="margin-top:28px;padding-top:12px;border-top:1px solid var(--grid);font-size:0.85rem;color:var(--ink-2)">' +
        'Report prepared for executive review. Confidential institutional data.</div>';
      html += '</article>';

      return html;
    },
    after: function () {}
  };

})(window);
